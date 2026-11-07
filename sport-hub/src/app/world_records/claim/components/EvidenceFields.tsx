'use client';

/**
 * The claim form's evidence list (FR-11): links and uploaded files, each with
 * a description. Files go from the browser straight to the claim's Google
 * Drive folder, named after their description; links are written there as
 * shortcut files when the claim is saved.
 */

import { useRef, useState } from 'react';
import { FieldArray, useFormikContext } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikTextField } from '@ui/Form';
import { EVIDENCE_FILE_ACCEPT, evidenceFileProblem, formatFileSize, MAX_EVIDENCE_FILE_LABEL, MAX_EVIDENCE_ITEMS } from '@lib/records-rules';
import { startEvidenceUpload } from '../../actions';
import { emptyEvidenceLink, type ClaimEvidenceValue, type ClaimFormValues } from '../types';

export type EnsureClaimSaved = (values: ClaimFormValues) => Promise<{ kind: 'record' | 'first'; entryId: string } | null>;

type Props = {
  /** Saves a new claim as a draft first, since files go into a folder named after the claim's ID. */
  ensureSaved: EnsureClaimSaved;
  uploadsEnabled: boolean;
};

/** Sends the file to the upload address; returns the stored file's id. */
const sendFile = (uploadUrl: string, file: File, mimeType: string, onProgress: (share: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) resolve((JSON.parse(xhr.responseText) as { id: string }).id);
        else reject(new Error(`The upload failed (${xhr.status}). Please try again.`));
      } catch {
        reject(new Error('The upload finished, but its answer could not be read. Please try again.'));
      }
    };
    xhr.onerror = () => reject(new Error('The upload failed. Check your connection and try again.'));
    xhr.send(file);
  });

function FileUpload({ ensureSaved, onUploaded, onClose }: { ensureSaved: EnsureClaimSaved; onUploaded: (item: ClaimEvidenceValue) => void; onClose: () => void }) {
  const { values } = useFormikContext<ClaimFormValues>();
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async () => {
    setError(null);
    if (!description.trim()) { setError('Describe the file first. The file is named after its description.'); return; }
    if (!file) { setError('Choose a file'); return; }
    const problem = evidenceFileProblem(file.name, file.size);
    if (problem) { setError(problem); return; }

    setProgress(0);
    try {
      const saved = await ensureSaved(values);
      if (!saved) { setProgress(null); setError('Save the claim as a draft first (see the messages at the top).'); return; }
      const mimeType = file.type || 'application/octet-stream';
      const started = await startEvidenceUpload(saved.kind, saved.entryId, { name: file.name, size: file.size, mimeType, description });
      if (!started.success) { setProgress(null); setError(started.errors.join(' ')); return; }
      const driveFileId = await sendFile(started.uploadUrl, file, mimeType, setProgress);
      onUploaded({ type: 'file', url: '', description: description.trim(), driveFileId, fileName: started.fileName, originalFileName: file.name, mimeType, size: file.size });
    } catch (e) {
      setProgress(null);
      setError(e instanceof Error ? e.message : 'The upload failed');
    }
  };

  const uploading = progress !== null;
  return (
    <div className="stack gap-2 border border-gray-200 rounded p-3">
      <div className="stack gap-2">
        <label htmlFor="evidence-upload-description" className="text-sm font-medium text-gray-600">Description*</label>
        <input
          id="evidence-upload-description"
          className="border border-gray-300 rounded px-3 py-2 text-sm"
          placeholder="e.g. Full video of the attempt, Laser measurement anchor A, GPS track"
          value={description}
          disabled={uploading}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <input ref={input} type="file" accept={EVIDENCE_FILE_ACCEPT} disabled={uploading} onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      <small className="text-xs text-gray-600">Photos, videos, GPX/KML/FIT/TCX tracks, PDF, CSV, TXT or spreadsheets, up to {MAX_EVIDENCE_FILE_LABEL}. The file is named after its description.</small>
      {uploading && (
        <div className="stack gap-1">
          <div className="h-2 bg-gray-200 rounded"><div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /></div>
          <small className="text-xs">Uploading… {Math.round((progress ?? 0) * 100)}%. Keep this page open.</small>
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button type="button" variant="primary" size="small" disabled={uploading} onClick={upload}>Upload</Button>
        <Button type="button" variant="secondary" size="small" disabled={uploading} onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function EvidenceFields({ ensureSaved, uploadsEnabled }: Props) {
  const { values } = useFormikContext<ClaimFormValues>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const full = values.evidence.length >= MAX_EVIDENCE_ITEMS;

  return (
    <FieldArray name="evidence">
      {({ push, remove }) => (
        <div className="stack gap-3">
          {values.evidence.map((item, i) => (
            <div key={item.driveFileId ?? `row-${i}`} className="stack gap-2 border-l-2 border-gray-200 pl-3">
              <div className="flex gap-2 items-end flex-wrap">
                <FormikTextField className="flex-1 min-w-[12rem]" id={`evidence.${i}.description`} name={`evidence.${i}.description`} label="Description" placeholder="e.g. Full video of the attempt" required />
                {item.type === 'link' ? (
                  <FormikTextField className="flex-1 min-w-[12rem]" id={`evidence.${i}.url`} name={`evidence.${i}.url`} label="Link" placeholder="https://" required />
                ) : (
                  <div className="flex-1 min-w-[12rem] stack gap-1 pb-2">
                    <span className="text-sm font-medium text-gray-600">File</span>
                    <span className="text-sm break-all">{item.originalFileName ?? item.fileName} <span className="text-gray-500">({formatFileSize(item.size)}, uploaded)</span></span>
                  </div>
                )}
                <button type="button" className="text-xs text-red-600 underline pb-2" onClick={() => remove(i)}>Remove</button>
              </div>
            </div>
          ))}
          {values.evidence.some(e => e.type === 'file') && (
            <small className="text-xs text-gray-600">Removed files are deleted from the evidence folder when you save the claim.</small>
          )}

          {uploadOpen && (
            <FileUpload
              ensureSaved={ensureSaved}
              onClose={() => setUploadOpen(false)}
              onUploaded={item => {
                // Replace the empty link row a new claim starts with
                const emptyRow = values.evidence.findIndex(e => e.type === 'link' && !e.url.trim() && !e.description.trim());
                if (emptyRow >= 0) remove(emptyRow);
                push(item);
                setUploadOpen(false);
              }}
            />
          )}
          {!full && !uploadOpen && (
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="secondary" size="small" onClick={() => push(emptyEvidenceLink())}>Add a link</Button>
              {uploadsEnabled && <Button type="button" variant="secondary" size="small" onClick={() => setUploadOpen(true)}>Upload a file</Button>}
            </div>
          )}
        </div>
      )}
    </FieldArray>
  );
}
