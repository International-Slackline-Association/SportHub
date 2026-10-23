/**
 * World record / world first certificates (requirements FR-26). Placeholder
 * layout until the ISA certificate design is available. Generated on demand
 * from the current entry, so a corrected name or value is always reflected.
 */

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { LIST_LABELS } from './records-logic';
import type { DisplayAthlete, WorldFirst, WorldRecord } from './records-service';
import { getCountryByCode } from '@utils/countries';

const TEAL = rgb(0, 0.62, 0.6);
const DARK = rgb(0.2, 0.2, 0.25);
const GREY = rgb(0.45, 0.45, 0.5);

/** The standard PDF fonts only cover Latin-1; strip what they can't draw (placeholder fonts). */
const latin1 = (text: string) =>
  text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = DARK) {
  const safe = latin1(text);
  let fontSize = size;
  const maxWidth = page.getWidth() - 160;
  while (font.widthOfTextAtSize(safe, fontSize) > maxWidth && fontSize > 8) fontSize -= 1;
  const width = font.widthOfTextAtSize(safe, fontSize);
  page.drawText(safe, { x: (page.getWidth() - width) / 2, y, size: fontSize, font, color });
}

export async function buildCertificatePdf(
  kind: 'record' | 'first',
  entry: WorldRecord | WorldFirst,
  athlete: DisplayAthlete,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${kind === 'first' ? 'World First' : 'World Record'} certificate - ${latin1(athlete.name)}`);
  pdf.setAuthor('International Slackline Association');
  const page = pdf.addPage([842, 595]); // A4 landscape
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: TEAL, borderWidth: 4 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: TEAL, borderWidth: 1 });

  const title = entry.title || `${LIST_LABELS[entry.list]} ${kind === 'first' ? 'World First' : 'World Record'}`;
  centered(page, 'INTERNATIONAL SLACKLINE ASSOCIATION', height - 90, bold, 14, TEAL);
  centered(page, 'CERTIFICATE', height - 135, bold, 34);
  centered(page, title, height - 175, regular, 20, TEAL);
  centered(page, 'This certifies that', height - 225, regular, 13, GREY);
  centered(page, athlete.name, height - 270, bold, 32);
  const country = athlete.country ? getCountryByCode(athlete.country)?.name ?? athlete.country.toUpperCase() : '';
  if (country) centered(page, country, height - 295, regular, 13, GREY);

  const others = entry.athletes.filter(a => a !== athlete).map(a => a.name);
  let y = height - 340;
  if (kind === 'record') {
    const record = entry as WorldRecord;
    centered(page, 'set the record', y, regular, 13, GREY);
    centered(page, record.categoryName, y - 32, bold, 20);
    centered(page, record.value, y - 62, bold, 24, TEAL);
    y -= 92;
    if (record.location) { centered(page, record.location, y, regular, 12, GREY); y -= 18; }
  } else {
    const first = entry as WorldFirst;
    centered(page, `landed the first ${first.categoryName.toLowerCase()} trick`, y, regular, 13, GREY);
    centered(page, first.trickName, y - 34, bold, 24, TEAL);
    y -= 66;
  }
  if (others.length > 0) { centered(page, `together with ${others.join(', ')}`, y, regular, 12, GREY); y -= 18; }
  if (entry.date) centered(page, `on ${entry.date}`, y, regular, 12, GREY);

  page.drawText(latin1(`Certificate ${entry.entryId}`), { x: 50, y: 50, size: 9, font: regular, color: GREY });
  const issued = `Issued ${new Date().toISOString().slice(0, 10)} · slacklineinternational.org`;
  page.drawText(latin1(issued), { x: width - 50 - regular.widthOfTextAtSize(latin1(issued), 9), y: 50, size: 9, font: regular, color: GREY });

  return pdf.save();
}
