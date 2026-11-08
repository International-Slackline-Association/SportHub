/**
 * World record / world first certificates (requirements FR-26), in the ISA
 * certificate design: teal/red frame, script athlete name, signatures, seal,
 * ISA Sport logo and a "Scan to verify" QR code. Generated on demand from the
 * current entry, so a corrected name or value is always reflected.
 *
 * Fonts and images live in ./certificate-assets (bundled with the
 * certificate route via outputFileTracingIncludes in next.config.ts).
 * Signature images are optional: signature-president.png and
 * signature-sport-commission.png are drawn above the signature lines when
 * present, otherwise the lines stay blank.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import type { DisplayAthlete, WorldFirst, WorldRecord } from './records-service';

const TEAL = rgb(0, 0.62, 0.6);
const RED = rgb(0.91, 0.32, 0.23);
const INK = rgb(0.13, 0.13, 0.15);
const BODY = rgb(0.25, 0.25, 0.28);
const MUTED = rgb(0.42, 0.42, 0.46);
const WHITE = rgb(1, 1, 1);
const GOLD = rgb(0.86, 0.66, 0.2);
const GOLD_DARK = rgb(0.74, 0.53, 0.12);
const QR_FRAME = rgb(0.27, 0.27, 0.29);

export const CERTIFICATE_SIGNATORIES = [
  { name: 'THOMAS BUCKINGHAM', role: 'President', org: 'International Slackline Association', image: 'signature-president.png' },
  { name: 'ISIDRO MATEO RODRIGUEZ', role: 'President Sports Commission', org: 'International Slackline Association', image: 'signature-sport-commission.png' },
] as const;

const WEBSITE = 'www.slacklineinternational.org';
const ASSETS_DIR = path.join(process.cwd(), 'src', 'lib', 'certificate-assets');

const asset = (file: string) => readFile(path.join(ASSETS_DIR, file));
const optionalAsset = (file: string) => asset(file).catch(() => null);

interface Fonts {
  regular: PDFFont;
  semibold: PDFFont;
  extrabold: PDFFont;
  script: PDFFont;
}

/** Drops characters a font has no glyph for (fontkit would draw empty boxes). */
const coveredBy = (font: PDFFont, text: string) => {
  const chars = new Set(font.getCharacterSet());
  return [...text].every(c => c === ' ' || chars.has(c.codePointAt(0)!));
};

function fitSize(font: PDFFont, text: string, size: number, maxWidth: number) {
  let fontSize = size;
  while (font.widthOfTextAtSize(text, fontSize) > maxWidth && fontSize > 6) fontSize -= 0.5;
  return fontSize;
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: RGB, opts: { cx?: number; maxWidth?: number } = {}) {
  const cx = opts.cx ?? page.getWidth() / 2;
  const fontSize = fitSize(font, text, size, opts.maxWidth ?? page.getWidth() - 140);
  const width = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, { x: cx - width / 2, y, size: fontSize, font, color });
  return width;
}

/** Points of a star-shaped (rosette) polygon as an SVG path centred on 0,0. */
function rosettePath(points: number, outer: number, inner: number) {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points;
    parts.push(`${i === 0 ? 'M' : 'L'} ${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** The gold seal with the ISA red/teal check mark. */
function drawSeal(page: PDFPage, cx: number, cy: number, r: number) {
  // pdf-lib's drawSvgPath uses a y-down coordinate system from (x, y)
  page.drawSvgPath(rosettePath(28, r, r * 0.9), { x: cx, y: cy, color: GOLD_DARK });
  page.drawSvgPath(rosettePath(28, r * 0.96, r * 0.86), { x: cx, y: cy, color: GOLD });
  page.drawCircle({ x: cx, y: cy, size: r * 0.74, color: GOLD_DARK });
  page.drawCircle({ x: cx, y: cy, size: r * 0.69, color: WHITE });
  const ir = r * 0.62;
  // Red upper half, teal lower half, split by a white check mark
  page.drawSvgPath(`M ${-ir} 0 A ${ir} ${ir} 0 0 1 ${ir} 0 Z`, { x: cx, y: cy, color: RED });
  page.drawSvgPath(`M ${-ir} 0 A ${ir} ${ir} 0 0 0 ${ir} 0 Z`, { x: cx, y: cy, color: TEAL });
  page.drawSvgPath(
    `M ${-ir * 0.62} ${-ir * 0.12} L ${-ir * 0.08} ${ir * 0.42} L ${ir * 0.72} ${-ir * 0.5}`,
    { x: cx, y: cy, borderColor: WHITE, borderWidth: ir * 0.22, borderLineCap: 1 },
  );
}

/** A vector QR code in a dark frame with "SCAN TO VERIFY" underneath. */
function drawQr(page: PDFPage, url: string, x: number, y: number, size: number, font: PDFFont) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const pad = 5;
  const label = 16;
  page.drawRectangle({ x, y, width: size, height: size + label, color: QR_FRAME });
  const inner = size - pad * 2;
  const bx = x + pad;
  const by = y + label;
  page.drawRectangle({ x: bx, y: by, width: inner, height: inner, color: WHITE });
  const quiet = 2; // modules of white margin inside the box
  const cell = inner / (count + quiet * 2);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      page.drawRectangle({
        x: bx + (col + quiet) * cell,
        y: by + inner - (row + quiet + 1) * cell,
        width: cell + 0.02,
        height: cell + 0.02,
        color: INK,
      });
    }
  }
  centered(page, 'SCAN TO VERIFY', y + 5.5, font, 6.5, WHITE, { cx: x + size / 2 });
}

function drawFrame(page: PDFPage) {
  const { width: W, height: H } = page.getSize();
  // Teal above a diagonal, red below it (down from the left edge to the right edge)
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: TEAL });
  const leftY = H * 0.53;
  const rightY = H * 0.26;
  page.drawSvgPath(`M 0 ${H - leftY} L ${W} ${H - rightY} L ${W} ${H} L 0 ${H} Z`, { x: 0, y: H, color: RED });
  // White card with a dark hairline border
  page.drawRectangle({ x: 22, y: 30, width: W - 44, height: H - 51, color: WHITE, borderColor: INK, borderWidth: 1.4 });
}

export async function buildCertificatePdf(
  kind: 'record' | 'first',
  entry: WorldRecord | WorldFirst,
  athlete: DisplayAthlete,
  verifyUrl: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const label = kind === 'first' ? 'World First' : 'World Record';
  pdf.setTitle(`${label} certificate - ${athlete.name}`);
  pdf.setAuthor('International Slackline Association');

  const [regular, semibold, extrabold, script] = await Promise.all(
    ['Metropolis-Regular.ttf', 'Metropolis-SemiBold.ttf', 'Metropolis-ExtraBold.ttf', 'BerkshireSwash-Regular.ttf']
      .map(async file => pdf.embedFont(await asset(file), { subset: true })),
  );
  const fonts: Fonts = { regular, semibold, extrabold, script };
  const [logo, emblem, ...signatures] = await Promise.all([
    asset('isa-logo-color.png').then(b => pdf.embedPng(b)),
    asset('isa-emblem.png').then(b => pdf.embedPng(b)),
    ...CERTIFICATE_SIGNATORIES.map(s => optionalAsset(s.image).then(b => (b ? pdf.embedPng(b) : null))),
  ]);

  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width: W, height: H } = page.getSize();
  const top = (y: number) => H - y; // measure from the top edge like the design

  drawFrame(page);
  // Faint ISA emblem behind the lower half of the card
  const wmWidth = W - 110;
  page.drawImage(emblem, { x: 52, y: 36, width: wmWidth, height: (wmWidth * emblem.height) / emblem.width, opacity: 0.07 });

  // Title with dashes either side
  const title = `SLACKLINE ${label.toUpperCase()} CERTIFICATE`;
  const titleWidth = centered(page, title, top(88), fonts.extrabold, 29, INK, { maxWidth: W - 200 });
  const dashY = top(88) + 9;
  page.drawLine({ start: { x: W / 2 - titleWidth / 2 - 34, y: dashY }, end: { x: W / 2 - titleWidth / 2 - 10, y: dashY }, thickness: 2, color: INK });
  page.drawLine({ start: { x: W / 2 + titleWidth / 2 + 10, y: dashY }, end: { x: W / 2 + titleWidth / 2 + 34, y: dashY }, thickness: 2, color: INK });

  centered(page, 'The ISA Sport Commission issues this certificate to', top(116), fonts.regular, 11, BODY);

  const nameFont = coveredBy(fonts.script, athlete.name) ? fonts.script : fonts.semibold;
  centered(page, athlete.name, top(176), nameFont, 40, INK, { maxWidth: W - 220 });
  const others = entry.athletes.filter(a => a !== athlete).map(a => a.name);
  if (others.length > 0) centered(page, `together with ${others.join(', ')}`, top(198), fonts.regular, 10, MUTED);

  const heading = entry.title || `slackline ${label.toLowerCase()}`;
  centered(page, `for the ${heading}:`, top(228), fonts.regular, 11, BODY);

  const rows: [string, string][] = [];
  if (kind === 'record') {
    const record = entry as WorldRecord;
    centered(page, record.categoryName, top(266), fonts.semibold, 17, INK, { maxWidth: W - 200 });
    rows.push(['with specs:', record.value]);
    if (record.location) rows.push(['at:', record.location]);
  } else {
    const first = entry as WorldFirst;
    centered(page, first.trickName, top(266), fonts.semibold, 17, INK, { maxWidth: W - 200 });
    rows.push(['in:', first.categoryName]);
    if (first.lineDetails) rows.push(['with specs:', first.lineDetails]);
  }
  if (entry.date) rows.push(['Achieved on the', entry.date.replace(/\//g, '.')]);

  // Label right-aligned and value left-aligned around a shared axis
  const axis = W / 2 - 4;
  const rowGap = rows.length > 2 ? 27 : 33;
  rows.forEach(([key, value], i) => {
    const y = top(310 + i * rowGap);
    page.drawText(key, { x: axis - fonts.regular.widthOfTextAtSize(key, 10.5), y, size: 10.5, font: fonts.regular, color: BODY });
    const size = fitSize(fonts.semibold, value, 16, W / 2 - 110);
    page.drawText(value, { x: axis + 9, y, size, font: fonts.semibold, color: INK });
  });

  centered(page, 'Congratulations on your achievement, and all the very best in your future endeavours.', top(398), fonts.regular, 11, BODY);

  // Signatures either side of the seal
  const lineY = top(482);
  CERTIFICATE_SIGNATORIES.forEach((s, i) => {
    const cx = i === 0 ? 263 : 578;
    const half = 90;
    const signature = signatures[i] as PDFImage | null;
    if (signature) {
      const h = 46;
      const w = Math.min((h * signature.width) / signature.height, half * 2);
      page.drawImage(signature, { x: cx - w / 2, y: lineY + 3, width: w, height: (w * signature.height) / signature.width });
    }
    page.drawLine({ start: { x: cx - half, y: lineY }, end: { x: cx + half, y: lineY }, thickness: 1, color: INK });
    centered(page, s.name, lineY - 15, fonts.extrabold, 8.5, INK, { cx });
    centered(page, s.role, lineY - 26, fonts.regular, 6.5, BODY, { cx });
    centered(page, s.org, lineY - 35, fonts.regular, 6.5, BODY, { cx });
  });
  drawSeal(page, 421, top(474), 44);

  drawQr(page, verifyUrl, 702, top(538), 78, fonts.semibold);

  // ISA Sport logo bottom left
  const logoWidth = 122;
  const logoHeight = (logoWidth * logo.height) / logo.width;
  const logoY = top(538);
  page.drawImage(logo, { x: 46, y: logoY, width: logoWidth, height: logoHeight });
  const emblemLeft = 46 + logoWidth * (318 / 623);
  page.drawRectangle({ x: emblemLeft + 4, y: logoY - 12, width: logoWidth - (emblemLeft - 46) - 4, height: 10, color: QR_FRAME });
  centered(page, 'SPORT', logoY - 9.5, fonts.extrabold, 7, WHITE, { cx: emblemLeft + 2 + (logoWidth - (emblemLeft - 46)) / 2 });

  centered(page, WEBSITE, top(557), fonts.regular, 8.5, BODY);
  page.drawText(`Certificate ${entry.entryId}`, { x: W - 30 - fonts.regular.widthOfTextAtSize(`Certificate ${entry.entryId}`, 6), y: 34, size: 6, font: fonts.regular, color: MUTED });

  return pdf.save();
}
