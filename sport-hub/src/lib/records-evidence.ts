/**
 * Evidence storage for claims (FR-11): every claim gets a folder named after
 * its entryId inside the ISA evidence folder on Google Drive
 * (RECORDS_EVIDENCE_FOLDER_ID). The folder holds
 *   - the claimant's uploads, sent by the browser straight to Drive through a
 *     resumable upload session, so large videos never pass through SportHub,
 *   - one .url shortcut file per evidence link,
 *   - "_Evidence overview.txt", listing every item with its description.
 * Files SportHub manages are tagged with appProperties.sporthub; other files
 * that ISA staff put into the folder are left alone.
 *
 * Without Drive settings, local development (DYNAMODB_LOCAL=true or not
 * production) keeps the files in the temp directory and serves them through
 * /api/records-evidence/local. Production without Drive settings takes links
 * only.
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { auth } from '@googleapis/sheets';
import { formatFileSize } from './records-rules';
import { normalizeUrl } from '@utils/urls';
import type { RecordEvidence, WorldRecordOrFirstTableItem } from './relational-types';

/** An evidence item as the claim form sends it. */
export interface EvidenceItemInput {
  type: 'link' | 'file';
  url: string;
  description: string;
  driveFileId?: string;
  fileName?: string;
  originalFileName?: string;
}

type ManagedKind = 'upload' | 'link' | 'overview';

interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  description?: string;
  kind?: ManagedKind;
  url: string;                   // Where a reviewer opens it
}

interface TextFile {
  name: string;
  description?: string;
  mimeType: string;
  kind: ManagedKind;
  content: string;
}

interface EvidenceBackend {
  findOrCreateFolder(entryId: string): Promise<string>;
  listFiles(folderId: string): Promise<StoredFile[]>;
  createUploadSession(folderId: string, file: { name: string; mimeType: string; size: number; description: string }, origin: string): Promise<string>;
  writeTextFile(folderId: string, file: TextFile, existingId?: string): Promise<string>;
  updateMetadata(fileId: string, metadata: { name?: string; description?: string }): Promise<void>;
  trash(fileId: string): Promise<void>;
  folderUrl(folderId: string): string;
}

// ============================================================================
// GOOGLE DRIVE
// ============================================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FILE_FIELDS = 'id,name,mimeType,size,description,appProperties,webViewLink';

const parentFolderId = () => process.env.RECORDS_EVIDENCE_FOLDER_ID ?? '';

let _driveAuth: InstanceType<typeof auth.GoogleAuth> | null = null;
const driveAuth = () => {
  if (!_driveAuth) {
    _driveAuth = new auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
      // Optional: upload as an ISA Workspace user (domain-wide delegation) when the folder is not on a Shared Drive
      clientOptions: process.env.GOOGLE_DRIVE_IMPERSONATE_USER ? { subject: process.env.GOOGLE_DRIVE_IMPERSONATE_USER } : undefined,
    });
  }
  return _driveAuth;
};

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await driveAuth().getAccessToken();
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Drive request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response;
}

const withDrives = (params: Record<string, string>) =>
  new URLSearchParams({ supportsAllDrives: 'true', ...params }).toString();

type DriveFile = { id: string; name: string; mimeType: string; size?: string; description?: string; appProperties?: Record<string, string>; webViewLink?: string };

const fromDrive = (f: DriveFile): StoredFile => ({
  id: f.id,
  name: f.name,
  mimeType: f.mimeType,
  size: f.size ? Number(f.size) : undefined,
  description: f.description,
  kind: f.appProperties?.sporthub as ManagedKind | undefined,
  url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
});

const multipartBody = (metadata: object, file: TextFile) => {
  const boundary = `sporthub${Math.random().toString(36).slice(2)}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${file.mimeType}`,
    '',
    file.content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return { body, contentType: `multipart/related; boundary=${boundary}` };
};

const driveBackend: EvidenceBackend = {
  async findOrCreateFolder(entryId) {
    const q = `name = '${entryId}' and '${parentFolderId()}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
    const found = await driveFetch(`${DRIVE_API}?${withDrives({ q, fields: 'files(id)', includeItemsFromAllDrives: 'true' })}`);
    const { files } = await found.json() as { files: { id: string }[] };
    if (files[0]) return files[0].id;
    const created = await driveFetch(`${DRIVE_API}?${withDrives({ fields: 'id' })}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: entryId, mimeType: FOLDER_MIME, parents: [parentFolderId()], appProperties: { sporthub: 'claim' } }),
    });
    return (await created.json() as { id: string }).id;
  },

  async listFiles(folderId) {
    const q = `'${folderId}' in parents and trashed = false`;
    const response = await driveFetch(`${DRIVE_API}?${withDrives({ q, fields: `files(${FILE_FIELDS})`, pageSize: '1000', includeItemsFromAllDrives: 'true' })}`);
    const { files } = await response.json() as { files: DriveFile[] };
    return files.filter(f => f.mimeType !== FOLDER_MIME).map(fromDrive);
  },

  async createUploadSession(folderId, file, origin) {
    const response = await driveFetch(`${DRIVE_UPLOAD_API}?${withDrives({ uploadType: 'resumable', fields: 'id' })}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.mimeType,
        'X-Upload-Content-Length': String(file.size),
        // Lets the browser send the file to this session (CORS)
        Origin: origin,
      },
      body: JSON.stringify({ name: file.name, description: file.description, parents: [folderId], appProperties: { sporthub: 'upload' } }),
    });
    const location = response.headers.get('location');
    if (!location) throw new Error('Google Drive did not return an upload address');
    return location;
  },

  async writeTextFile(folderId, file, existingId) {
    const metadata = { name: file.name, description: file.description, mimeType: file.mimeType, appProperties: { sporthub: file.kind } };
    const { body, contentType } = multipartBody(existingId ? metadata : { ...metadata, parents: [folderId] }, file);
    const url = existingId ? `${DRIVE_UPLOAD_API}/${existingId}` : DRIVE_UPLOAD_API;
    const response = await driveFetch(`${url}?${withDrives({ uploadType: 'multipart', fields: 'id' })}`, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return (await response.json() as { id: string }).id;
  },

  async updateMetadata(fileId, metadata) {
    await driveFetch(`${DRIVE_API}/${fileId}?${withDrives({ fields: 'id' })}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
  },

  async trash(fileId) {
    await driveFetch(`${DRIVE_API}/${fileId}?${withDrives({ fields: 'id' })}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
  },

  folderUrl: folderId => `https://drive.google.com/drive/folders/${folderId}`,
};

// ============================================================================
// LOCAL STAND-IN (development)
// ============================================================================

const LOCAL_ROOT = path.join(os.tmpdir(), 'sporthub-evidence');
const LOCAL_PREFIX = 'local-';
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

interface LocalMeta {
  name: string;
  mimeType: string;
  size?: number;
  description?: string;
  kind: ManagedKind;
  uploaded: boolean;
}

/** Local file ids are "{folderId}~{n}", so a file id alone finds its folder. */
const localPaths = (fileId: string) => {
  const [folderId, id] = fileId.split('~');
  if (!SAFE_ID.test(folderId ?? '') || !SAFE_ID.test(id ?? '')) throw new Error('Invalid evidence file');
  const dir = path.join(LOCAL_ROOT, folderId);
  return { dir, meta: path.join(dir, `${id}.json`), data: path.join(dir, `${id}.bin`) };
};

const readLocalMeta = async (fileId: string): Promise<LocalMeta | null> => {
  try {
    return JSON.parse(await fs.readFile(localPaths(fileId).meta, 'utf8')) as LocalMeta;
  } catch {
    return null;
  }
};

const writeLocalMeta = async (fileId: string, meta: LocalMeta) => {
  const paths = localPaths(fileId);
  await fs.mkdir(paths.dir, { recursive: true });
  await fs.writeFile(paths.meta, JSON.stringify(meta));
};

const newLocalFileId = (folderId: string) => `${folderId}~${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const localFileUrl = (fileId: string) => `/api/records-evidence/local?file=${encodeURIComponent(fileId)}`;

const localBackend: EvidenceBackend = {
  async findOrCreateFolder(entryId) {
    const folderId = `${LOCAL_PREFIX}${entryId}`;
    if (!SAFE_ID.test(folderId)) throw new Error('Invalid entry id');
    await fs.mkdir(path.join(LOCAL_ROOT, folderId), { recursive: true });
    return folderId;
  },

  async listFiles(folderId) {
    if (!SAFE_ID.test(folderId)) return [];
    const names = await fs.readdir(path.join(LOCAL_ROOT, folderId)).catch(() => [] as string[]);
    const files: StoredFile[] = [];
    for (const name of names.filter(n => n.endsWith('.json'))) {
      const fileId = `${folderId}~${name.slice(0, -5)}`;
      const meta = await readLocalMeta(fileId);
      if (!meta?.uploaded) continue;
      files.push({ id: fileId, name: meta.name, mimeType: meta.mimeType, size: meta.size, description: meta.description, kind: meta.kind, url: localFileUrl(fileId) });
    }
    return files;
  },

  async createUploadSession(folderId, file) {
    const fileId = newLocalFileId(folderId);
    await writeLocalMeta(fileId, { ...file, kind: 'upload', uploaded: false });
    return localFileUrl(fileId);
  },

  async writeTextFile(folderId, file, existingId) {
    const fileId = existingId ?? newLocalFileId(folderId);
    await writeLocalMeta(fileId, { name: file.name, mimeType: file.mimeType, description: file.description, kind: file.kind, size: Buffer.byteLength(file.content), uploaded: true });
    await fs.writeFile(localPaths(fileId).data, file.content);
    return fileId;
  },

  async updateMetadata(fileId, metadata) {
    const meta = await readLocalMeta(fileId);
    if (meta) await writeLocalMeta(fileId, { ...meta, ...metadata });
  },

  async trash(fileId) {
    const paths = localPaths(fileId);
    await Promise.all([fs.rm(paths.meta, { force: true }), fs.rm(paths.data, { force: true })]);
  },

  folderUrl: folderId => `/api/records-evidence/local?folder=${encodeURIComponent(folderId)}`,
};

/** Local stand-in: stores an upload sent to the address createUploadSession returned. */
export async function receiveLocalUpload(fileId: string, data: ArrayBuffer): Promise<{ id: string } | null> {
  const meta = await readLocalMeta(fileId);
  if (!meta || meta.uploaded || meta.kind !== 'upload' || data.byteLength !== meta.size) return null;
  await fs.writeFile(localPaths(fileId).data, Buffer.from(data));
  await writeLocalMeta(fileId, { ...meta, uploaded: true });
  return { id: fileId };
}

/** Local stand-in: a stored file for download. */
export async function readLocalFile(fileId: string): Promise<{ meta: LocalMeta; data: Buffer } | null> {
  const meta = await readLocalMeta(fileId);
  if (!meta?.uploaded) return null;
  return { meta, data: await fs.readFile(localPaths(fileId).data) };
}

/** Local stand-in: the files in a folder, for the folder link. */
export async function listLocalFolder(folderId: string) {
  return localBackend.listFiles(folderId);
}

// ============================================================================
// BACKEND CHOICE
// ============================================================================

const driveConfigured = () =>
  !!(parentFolderId() && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

export const localEvidenceEnabled = () =>
  !driveConfigured() && (process.env.DYNAMODB_LOCAL === 'true' || process.env.NODE_ENV !== 'production');

const backend = (): EvidenceBackend | null => (driveConfigured() ? driveBackend : localEvidenceEnabled() ? localBackend : null);

/** Whether claimants can upload files (links work either way). */
export const evidenceUploadsEnabled = () => backend() !== null;

export const evidenceFolderUrl = (folderId?: string) => {
  const store = backend();
  return folderId && store ? store.folderUrl(folderId) : undefined;
};

// ============================================================================
// OPERATIONS
// ============================================================================

/** Folder for a claim's evidence, created on first use. */
export async function ensureEvidenceFolder(entry: Pick<WorldRecordOrFirstTableItem, 'entryId' | 'evidenceFolderId'>): Promise<string> {
  const store = backend();
  if (!store) throw new Error('File uploads are not set up');
  return entry.evidenceFolderId ?? store.findOrCreateFolder(entry.entryId);
}

/** Upload address for one file; the browser sends the file there with a PUT. */
export async function createEvidenceUpload(folderId: string, file: { name: string; mimeType: string; size: number; description: string }, origin: string) {
  const store = backend();
  if (!store) throw new Error('File uploads are not set up');
  return store.createUploadSession(folderId, file, origin);
}

/** Moves a deleted draft's evidence folder to the trash. */
export async function trashEvidenceFolder(folderId?: string): Promise<void> {
  const store = backend();
  if (!store || !folderId) return;
  if (store === localBackend) {
    if (SAFE_ID.test(folderId)) await fs.rm(path.join(LOCAL_ROOT, folderId), { recursive: true, force: true });
    return;
  }
  await store.trash(folderId);
}

const OVERVIEW_NAME = '_Evidence overview.txt';

/** A description as a file name, without characters Drive or Windows reject. */
const safeName = (description: string, fallback: string) =>
  description.replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || fallback;

const extensionOf = (name: string) => (name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '');

/** Uploads are named after their description, keeping the file's extension ("Anchor photo.jpg"). */
export const evidenceFileName = (description: string, originalName: string) =>
  `${safeName(description, originalName.replace(/\.[^.]*$/, '') || 'File')}${extensionOf(originalName)}`;

/** Drive "description" of an upload: the claimant's description and the original file name. */
export const uploadDescription = (description: string, originalFileName: string) =>
  `${description.trim()}\n\nOriginal file: ${originalFileName}`;

/** A link's shortcut file is named after its description. */
const shortcutName = (description: string) => `${safeName(description, 'Link')}.url`;

const shortcutContent = (url: string) => `[InternetShortcut]\r\nURL=${url}\r\n`;

function overviewText(entry: WorldRecordOrFirstTableItem, evidence: RecordEvidence[]): string {
  const site = process.env.SITE_URL ?? '';
  const what = entry.kind === 'first' ? `World first claim: ${entry.trickName} (${entry.categoryName})` : `World record claim: ${entry.categoryName}`;
  const lines = [
    what,
    `Claim ID: ${entry.entryId}`,
    `Athletes: ${entry.athletes.map(a => a.name).join(', ')}`,
    `Claimant: ${entry.claimantName ?? ''}`,
    ...(site ? [`In SportHub: ${site}/admin/records-review/${entry.kind}/${entry.entryId}`] : []),
    `Updated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    '',
    'Evidence:',
    ...evidence.flatMap((e, i) => [
      `${i + 1}. ${e.type === 'link' ? 'Link' : 'File'}: ${e.description ?? ''}`,
      `   ${e.type === 'link' ? e.url : `${e.fileName} (${formatFileSize(e.size)})`}`,
    ]),
    '',
    'SportHub keeps this file and the .url link files up to date. Other files put into this folder are left alone.',
  ];
  return lines.join('\r\n');
}

/**
 * Brings a claim's evidence folder in line with the form: checks that every
 * uploaded file is in the folder and updates its description, writes one
 * shortcut file per link, trashes uploads and shortcuts the claimant removed
 * and rewrites the overview. Returns the evidence to store on the entry.
 * Entries without a store (no Drive in production, imported entries) keep
 * their links as they are.
 */
export async function syncEvidence(
  entry: WorldRecordOrFirstTableItem,
  items: EvidenceItemInput[],
): Promise<{ evidence: RecordEvidence[]; evidenceFolderId?: string; errors: string[] }> {
  const errors: string[] = [];
  const links = (list: EvidenceItemInput[]) => list.filter(i => i.type === 'link').map(i => ({
    type: 'link' as const,
    url: normalizeUrl(i.url),
    description: i.description.trim() || undefined,
  }));

  const store = backend();
  if (!store || entry.source !== 'claim') {
    if (items.some(i => i.type === 'file')) errors.push('File uploads are not available for this entry');
    return { evidence: links(items), evidenceFolderId: entry.evidenceFolderId, errors };
  }
  if (items.length === 0 && !entry.evidenceFolderId) return { evidence: [], errors };

  const folderId = await ensureEvidenceFolder(entry);
  const files = await store.listFiles(folderId);
  const byId = new Map(files.map(f => [f.id, f]));
  const previousLinks = new Map(entry.evidence.filter(e => e.type === 'link' && e.driveFileId).map(e => [e.driveFileId!, e]));

  // Names follow the descriptions; equal descriptions get " (2)", " (3)"
  const usedNames = new Set(files.filter(f => !f.kind).map(f => f.name.toLowerCase()));
  const uniqueName = (name: string) => {
    const extension = extensionOf(name);
    const stem = extension ? name.slice(0, -extension.length) : name;
    let candidate = name;
    for (let n = 2; usedNames.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${extension}`;
    usedNames.add(candidate.toLowerCase());
    return candidate;
  };

  const evidence: RecordEvidence[] = [];
  for (const item of items) {
    const description = item.description.trim();
    if (item.type === 'file') {
      const file = item.driveFileId ? byId.get(item.driveFileId) : undefined;
      if (!file || file.kind !== 'upload') {
        errors.push(`"${item.fileName ?? 'File'}" is no longer in the evidence folder. Remove it and upload it again.`);
        continue;
      }
      const originalFileName = item.originalFileName || file.name;
      const name = uniqueName(evidenceFileName(description, originalFileName));
      const driveDescription = uploadDescription(description, originalFileName);
      if ((file.description ?? '') !== driveDescription || file.name !== name) await store.updateMetadata(file.id, { name, description: driveDescription });
      evidence.push({ type: 'file', url: file.url, description: description || undefined, driveFileId: file.id, fileName: name, originalFileName, mimeType: file.mimeType, size: file.size });
      continue;
    }

    const url = normalizeUrl(item.url);
    const name = uniqueName(shortcutName(description));
    const shortcut = item.driveFileId ? byId.get(item.driveFileId) : undefined;
    const content = { name, description: `${description}\n\n${url}`, mimeType: 'application/internet-shortcut', kind: 'link' as const, content: shortcutContent(url) };
    let fileId: string;
    if (shortcut?.kind === 'link') {
      fileId = shortcut.id;
      if (previousLinks.get(shortcut.id)?.url !== url) await store.writeTextFile(folderId, content, fileId);
      else if (shortcut.name !== name || shortcut.description !== content.description) await store.updateMetadata(fileId, { name, description: content.description });
    } else {
      fileId = await store.writeTextFile(folderId, content);
    }
    evidence.push({ type: 'link', url, description: description || undefined, driveFileId: fileId, fileName: name });
  }

  // Uploads and shortcuts no longer on the claim; files ISA staff added stay
  const kept = new Set(evidence.map(e => e.driveFileId));
  for (const file of files) {
    if ((file.kind === 'upload' || file.kind === 'link') && !kept.has(file.id)) await store.trash(file.id);
  }

  const overview = files.find(f => f.kind === 'overview');
  await store.writeTextFile(folderId, {
    name: OVERVIEW_NAME,
    description: 'List of all evidence on this claim',
    mimeType: 'text/plain',
    kind: 'overview',
    content: overviewText({ ...entry, evidence }, evidence),
  }, overview?.id);

  return { evidence, evidenceFolderId: folderId, errors };
}
