/**
 * World record / world first certificates (requirements FR-26). Uses the
 * official ISA certificate templates (world-record-en.pdf, world-first-en.pdf
 * from the isa-tools repository: frame, logo, seal, signatures and static
 * wording) and draws the athlete name, category or trick, specs, date and a
 * "Scan to verify" QR code at the same positions the isa-tools generators use.
 * Generated on demand from the current entry, so a corrected name or value is
 * always reflected.
 *
 * Templates and fonts live in ./certificate-assets (bundled with the
 * certificate route via outputFileTracingIncludes in next.config.ts). To change
 * the design or a signer, rebuild the templates in isa-tools
 * (server/src/core/certificates/generators/pdfGenerators/templates/source) and
 * copy the PDFs here.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DisplayAthlete, WorldFirst, WorldRecord } from './records-service';

const BLACK = rgb(35 / 255, 31 / 255, 32 / 255);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.4, 0.4, 0.42);

const ASSETS_DIR = path.join(process.cwd(), 'src', 'lib', 'certificate-assets');
const asset = (file: string) => readFile(path.join(ASSETS_DIR, file));

/** Value column of the "with specs:" / "Achieved on the" rows (template labels end at x ≈ 414). */
const VALUE_X = 422;
const VALUE_MAX_WIDTH = 690 - VALUE_X; // stop before the QR box
const CENTER_MAX_WIDTH = 640;

/** The isa-tools generators give y as the distance from the top to the middle of the text. */
const fromTop = (page: PDFPage, y: number, size: number) => page.getHeight() - (y + size / 2);

function fitSize(font: PDFFont, text: string, size: number, maxWidth: number) {
  let fontSize = size;
  while (font.widthOfTextAtSize(text, fontSize) > maxWidth && fontSize > 7) fontSize -= 0.5;
  return fontSize;
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = BLACK) {
  const fontSize = fitSize(font, text, size, CENTER_MAX_WIDTH);
  const width = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y: fromTop(page, y, fontSize), size: fontSize, font, color });
}

function drawValue(page: PDFPage, text: string, y: number, font: PDFFont) {
  const fontSize = fitSize(font, text, 16, VALUE_MAX_WIDTH);
  page.drawText(text, { x: VALUE_X, y: fromTop(page, y, fontSize), size: fontSize, font, color: BLACK });
}

/** Whether every character has a glyph in the font (fontkit would draw empty boxes otherwise). */
const coveredBy = (font: PDFFont, text: string) => {
  const chars = new Set(font.getCharacterSet());
  return [...text].every(c => c === ' ' || chars.has(c.codePointAt(0)!));
};

/** Vector QR code in the template's "Scan to verify" box (60 pt square at x 696, 438 from the top). */
function drawQr(page: PDFPage, url: string) {
  const size = 60;
  const x = 696;
  const y = page.getHeight() - 438 - size;
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const margin = 1;
  const cell = size / (count + margin * 2);
  page.drawRectangle({ x, y, width: size, height: size, color: WHITE });
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      page.drawRectangle({
        x: x + (col + margin) * cell,
        y: y + size - (row + margin + 1) * cell,
        width: cell + 0.02,
        height: cell + 0.02,
        color: BLACK,
      });
    }
  }
}

export async function buildCertificatePdf(
  kind: 'record' | 'first',
  entry: WorldRecord | WorldFirst,
  athlete: DisplayAthlete,
  verifyUrl: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(await asset(kind === 'first' ? 'world-first-en.pdf' : 'world-record-en.pdf'));
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${kind === 'first' ? 'World First' : 'World Record'} certificate - ${athlete.name}`);
  pdf.setAuthor('International Slackline Association');

  const [bold, semibold, script] = await Promise.all(
    ['Montserrat-Bold.ttf', 'Montserrat-SemiBold.ttf', 'BerkshireSwash-Regular.ttf']
      .map(async file => pdf.embedFont(await asset(file), { subset: true })),
  );
  const page = pdf.getPages()[0];

  const nameFont = coveredBy(script, athlete.name) ? script : semibold;
  drawCentered(page, athlete.name, 172, nameFont, 36);
  const others = entry.athletes.filter(a => a !== athlete).map(a => a.name);
  if (others.length > 0) drawCentered(page, `together with ${others.join(', ')}`, 205, semibold, 10, MUTED);

  if (kind === 'record') {
    const record = entry as WorldRecord;
    drawCentered(page, record.categoryName, 269, bold, 16);
    drawValue(page, record.value, 312, semibold);
  } else {
    const first = entry as WorldFirst;
    drawCentered(page, first.trickName, 269, bold, 16);
    drawValue(page, [first.categoryName, first.lineDetails].filter(Boolean).join(', '), 312, semibold);
  }
  if (entry.date) drawValue(page, entry.date.replace(/\//g, '.'), 343, semibold);

  drawQr(page, verifyUrl);

  return pdf.save();
}
