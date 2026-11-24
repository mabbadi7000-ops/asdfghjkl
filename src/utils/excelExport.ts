/**
 * Enterprise Excel export (.xlsx) on the approved Marshal Logistic letterhead: the header artwork
 * (navy band, gold ribbon, logo) and contact footer artwork are embedded as real images, followed by the
 * stamp image set in system settings. The sheet is RTL and prints on A4 landscape.
 */
import ExcelJS from 'exceljs';
import { BRAND, BRAND_ARGB, BRAND_ASSETS, LoadedImage, loadHtmlImage, loadImageAsset, toAbsoluteUrl } from './brandAssets';
import {
  EnterpriseExportOptions,
  escapeHtml,
  extractCellValue,
  getExportCompanyInfo,
  getExportRoleLabel,
} from './exportUtils';
import { LETTERHEAD_ART, LETTERHEAD_CONTACT, LETTERHEAD_CONTACT_LINE } from './letterhead';

const COLUMN_PX_PER_CHAR = 7;
const EMU_PER_PX = 9525;
const HEADER_DISPLAY_PX = 150;
const FOOTER_DISPLAY_PX = 56;
const GOLD_TINT_ARGB = 'FFFBF4E3';

export interface ExcelBrandAssets {
  header?: LoadedImage;
  footer?: LoadedImage;
  stamp?: LoadedImage;
}

const ptToPx = (pt: number) => (pt * 96) / 72;
const pxToPt = (px: number) => (px * 72) / 96;
const base64Of = (image: LoadedImage) => image.dataUrl.split(',')[1] ?? '';

function getSheetLayout(columnCount: number) {
  const totalCols = Math.max(columnCount, 6);
  const widths = Array.from({ length: totalCols }, (_, index) => (index === 0 ? 26 : index < columnCount ? 24 : 18));
  const colPx = widths.map((width) => Math.round(width * COLUMN_PX_PER_CHAR));
  return { totalCols, widths, colPx, sheetPx: colPx.reduce((sum, px) => sum + px, 0) };
}

function createCanvas(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
}

/** Recomposes the approved header at the sheet width: logo block, band stretched along its clean column, gold ribbon. */
async function composeHeaderArt(widthPx: number, targetHeightPx: number): Promise<LoadedImage | null> {
  const art = await loadHtmlImage(toAbsoluteUrl(BRAND_ASSETS.letterhead.portrait.header));
  if (!art) return null;
  const { width: artW, height: artH, stretchX } = LETTERHEAD_ART.header;
  const scaleX = art.naturalWidth / artW;
  const outScale = Math.min(2, 3000 / widthPx);
  const outW = Math.round(widthPx * outScale);
  const k = Math.min((targetHeightPx * outScale) / artH, outW / artW);
  const outH = Math.round(artH * k);
  const leftW = Math.round(stretchX * k);
  const rightW = Math.round((artW - stretchX) * k);
  const surface = createCanvas(outW, outH);
  if (!surface) return null;
  const { canvas, context } = surface;
  const cut = stretchX * scaleX;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outW, outH);
  context.imageSmoothingQuality = 'high';
  context.drawImage(art, 0, 0, cut, art.naturalHeight, 0, 0, leftW, outH);
  context.imageSmoothingEnabled = false;
  context.drawImage(art, cut, 0, 1, art.naturalHeight, leftW - 1, 0, outW - leftW - rightW + 2, outH);
  context.imageSmoothingEnabled = true;
  context.drawImage(art, cut, 0, art.naturalWidth - cut, art.naturalHeight, outW - rightW, 0, rightW, outH);
  return { dataUrl: canvas.toDataURL('image/png'), width: outW, height: outH };
}

/** Recomposes the approved footer at the sheet width: the three contact items spread evenly. */
async function composeFooterArt(widthPx: number, targetHeightPx: number): Promise<LoadedImage | null> {
  const art = await loadHtmlImage(toAbsoluteUrl(BRAND_ASSETS.letterhead.portrait.footer));
  if (!art) return null;
  const { width: artW, height: artH, items, pad } = LETTERHEAD_ART.footer;
  const scaleX = art.naturalWidth / artW;
  const outScale = Math.min(2, 3000 / widthPx);
  const outW = Math.round(widthPx * outScale);
  const margin = items[0][0] - pad;
  const itemsArtW = items.reduce((sum, [from, to]) => sum + (to - from + 1 + 2 * pad), 0);
  const k = Math.min((targetHeightPx * outScale) / artH, outW / (itemsArtW + 2 * margin));
  const outH = Math.round(artH * k);
  const surface = createCanvas(outW, outH);
  if (!surface) return null;
  const { canvas, context } = surface;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outW, outH);
  context.imageSmoothingQuality = 'high';
  const gap = (outW - 2 * margin * k - itemsArtW * k) / (items.length - 1);
  let x = margin * k;
  for (const [from, to] of items) {
    const itemW = to - from + 1 + 2 * pad;
    context.drawImage(art, (from - pad) * scaleX, 0, itemW * scaleX, art.naturalHeight, x, 0, itemW * k, outH);
    x += itemW * k + gap;
  }
  return { dataUrl: canvas.toDataURL('image/png'), width: outW, height: outH };
}

function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('');
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => {
      try {
        const surface = createCanvas(width, height);
        surface?.context.drawImage(image, 0, 0, width, height);
        resolve(surface ? surface.canvas.toDataURL('image/png') : '');
      } catch {
        resolve('');
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    image.src = url;
  });
}

/** Generated seal around the official emblem, used only when no stamp image was uploaded in settings. */
function buildSealSvg(labels: { labelAr: string; labelEn: string; crNumber: string }, emblemDataUrl: string): string {
  const emblem = emblemDataUrl
    ? `<image href="${emblemDataUrl}" x="90" y="56" width="60" height="74" preserveAspectRatio="xMidYMid meet" />`
    : '';
  return `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <circle cx="120" cy="120" r="114" fill="#FFFFFF" stroke="${BRAND.gold}" stroke-width="5" />
    <circle cx="120" cy="120" r="105" fill="#FFFDF5" stroke="${BRAND.goldDark}" stroke-width="2.5" stroke-dasharray="6 4" />
    <circle cx="120" cy="120" r="95" fill="#FFFFFF" stroke="${BRAND.gold}" stroke-width="1.5" />
    ${emblem}
    <text x="120" y="44" text-anchor="middle" font-family="Arial, Tahoma" font-size="12" font-weight="900" fill="${BRAND.goldDark}" letter-spacing="1">★ معتمد رسمياً ★</text>
    <text x="120" y="156" text-anchor="middle" font-family="Arial, Tahoma" font-size="16" font-weight="900" fill="${BRAND.navy}">${escapeHtml(labels.labelAr)}</text>
    <text x="120" y="174" text-anchor="middle" font-family="Arial, Tahoma" font-size="11" font-weight="800" fill="${BRAND.gold}" letter-spacing="0.5">${escapeHtml(labels.labelEn)}</text>
    <text x="120" y="194" text-anchor="middle" font-family="monospace, Courier" font-size="10" font-weight="700" fill="#64748B">CR: ${escapeHtml(labels.crNumber)}</text>
  </svg>`;
}

async function loadStampImage(company: ReturnType<typeof getExportCompanyInfo>): Promise<LoadedImage | null> {
  const uploaded = company.stampImage ? await loadImageAsset(company.stampImage, { maxWidth: 400, maxHeight: 400 }) : null;
  if (uploaded) return uploaded;

  const emblem = await loadImageAsset(BRAND_ASSETS.emblem, { maxWidth: 200, maxHeight: 200 });
  const svg = buildSealSvg(
    { labelAr: company.stampTextAr, labelEn: company.stampTextEn, crNumber: company.crNumber },
    emblem?.dataUrl ?? ''
  );
  const dataUrl = await svgToPngDataUrl(svg, 240, 240);
  return dataUrl ? { dataUrl, width: 240, height: 240 } : null;
}

async function loadExcelBrandAssets(options: EnterpriseExportOptions): Promise<ExcelBrandAssets> {
  const { sheetPx } = getSheetLayout(options.columns.length);
  const [header, footer, stamp] = await Promise.all([
    composeHeaderArt(sheetPx, HEADER_DISPLAY_PX),
    composeFooterArt(sheetPx, FOOTER_DISPLAY_PX),
    loadStampImage(getExportCompanyInfo()),
  ]);
  return { header: header ?? undefined, footer: footer ?? undefined, stamp: stamp ?? undefined };
}

const solid = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const edge = (argb: string, style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Border> => ({ style, color: { argb } });
const box = (argb: string): Partial<ExcelJS.Borders> => ({ top: edge(argb), bottom: edge(argb), left: edge(argb), right: edge(argb) });

/** Builds the workbook without touching the DOM; images are supplied by the caller. */
export function buildEnterpriseWorkbook(
  options: EnterpriseExportOptions,
  assets: ExcelBrandAssets = {},
  now = new Date()
): ExcelJS.Workbook {
  const { title, subtitle, columns, data, user, filtersSummary, totalSummary } = options;
  const company = getExportCompanyInfo();
  const dateFormatted = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const userName = user?.fullName || 'مسؤول النظام';
  const userRole = getExportRoleLabel(user?.role);
  const refCode = `EXCEL-${now.getTime().toString().slice(-6)}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.nameEn;
  workbook.lastModifiedBy = userName;
  workbook.company = company.nameEn;
  workbook.title = title;
  workbook.created = now;
  workbook.modified = now;

  const sheetName = (title || 'التقرير').slice(0, 30).replace(/[:\\\/?*\[\]]/g, '');
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, showGridLines: false }],
    properties: { tabColor: { argb: BRAND_ARGB.gold } },
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.5, header: 0.2, footer: 0.25 },
    },
  });

  const { totalCols, widths, colPx, sheetPx } = getSheetLayout(columns.length);
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
  const lastCol = ws.getColumn(totalCols).letter;

  const rowPx: number[] = [];
  let row = 0;
  const nextRow = (heightPt: number) => {
    row += 1;
    ws.getRow(row).height = heightPt;
    rowPx[row - 1] = ptToPx(heightPt);
    return row;
  };
  const mergeRow = (r: number, from: number, to: number) => {
    if (to > from) ws.mergeCells(r, from, r, to);
  };
  const styleRange = (r: number, from: number, to: number, apply: (cell: ExcelJS.Cell) => void) => {
    for (let c = from; c <= to; c++) apply(ws.getCell(r, c));
  };
  const addImage = (image: LoadedImage, range: object) => {
    const imageId = workbook.addImage({ base64: base64Of(image), extension: 'png' });
    ws.addImage(imageId, range as ExcelJS.ImageRange & { editAs?: string });
  };
  const addStrip = (image: LoadedImage, r: number) =>
    addImage(image, { tl: { col: 0, row: r - 1 }, br: { col: totalCols, row: r }, editAs: 'oneCell' });

  // Header: the approved paper artwork across the sheet (text banner when the artwork is unavailable)
  if (assets.header) {
    const r = nextRow(pxToPt((sheetPx * assets.header.height) / assets.header.width));
    addStrip(assets.header, r);
  } else {
    const band = nextRow(46);
    mergeRow(band, 1, totalCols);
    const cell = ws.getCell(band, 1);
    cell.value = `${company.nameAr}  •  ${company.nameEn}`;
    cell.font = { name: 'Arial', size: 14, bold: true, color: { argb: BRAND_ARGB.goldLight } };
    cell.fill = solid(BRAND_ARGB.navy);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    const line = nextRow(4);
    mergeRow(line, 1, totalCols);
    ws.getCell(line, 1).fill = solid(BRAND_ARGB.goldBand);
  }
  nextRow(6);

  // Report title banner
  const titleRow = nextRow(34);
  mergeRow(titleRow, 1, totalCols);
  styleRange(titleRow, 1, totalCols, (cell) => {
    cell.fill = solid('FFF8FAFC');
    cell.border = { top: edge('FFE2E8F0'), left: edge('FFE2E8F0'), right: edge('FFE2E8F0'), bottom: edge(BRAND_ARGB.gold, 'medium') };
  });
  const titleCell = ws.getCell(titleRow, 1);
  titleCell.value = `${title}${subtitle ? ` - ${subtitle}` : ''}`;
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: BRAND_ARGB.navy } };
  nextRow(6);

  // Metadata: [label | value (B:C)] [label (D) | value (E:last)]
  const addMetaRow = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) => {
    const r = nextRow(22);
    mergeRow(r, 2, 3);
    mergeRow(r, 5, totalCols);
    const label = (cell: ExcelJS.Cell, text: string) => {
      cell.value = text;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      cell.fill = solid('FFF1F5F9');
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = box('FFCBD5E1');
    };
    const value = (cell: ExcelJS.Cell, text: string) => {
      cell.value = text;
      cell.font = { name: 'Arial', size: 9, color: { argb: BRAND_ARGB.navy } };
      cell.fill = solid('FFFFFFFF');
      cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      cell.border = box('FFCBD5E1');
    };
    label(ws.getCell(r, 1), leftLabel);
    value(ws.getCell(r, 2), leftValue);
    styleRange(r, 3, 3, (cell) => (cell.border = box('FFCBD5E1')));
    label(ws.getCell(r, 4), rightLabel);
    value(ws.getCell(r, 5), rightValue);
    styleRange(r, 6, totalCols, (cell) => (cell.border = box('FFCBD5E1')));
  };
  addMetaRow('الجهة المُصدِرة', `${company.nameAr} • ${company.nameEn}`, 'كود المرجع', refCode);
  addMetaRow('السجل التجاري', company.crNumber, 'الرقم الضريبي', company.vatNumber);
  addMetaRow('تاريخ ووقت التصدير', `${dateFormatted} - ${timeFormatted}`, 'المستخدم المصدر', `${userName} (${userRole})`);
  addMetaRow('إجمالي السجلات', `${data.length} سجل`, 'معايير التصفية', filtersSummary || 'كافة السجلات المتاحة دون استثناء');
  nextRow(10);

  // Column headers
  const headerRow = nextRow(26);
  columns.forEach((col, index) => {
    const cell = ws.getCell(headerRow, index + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF8FAFC' } };
    cell.fill = solid(BRAND_ARGB.navy);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: edge(BRAND_ARGB.navyMid, 'medium'),
      bottom: edge(BRAND_ARGB.gold, 'medium'),
      left: edge(BRAND_ARGB.navyMid),
      right: edge(BRAND_ARGB.navyMid),
    };
  });

  // Data rows
  data.forEach((item, rowIndex) => {
    const r = nextRow(20);
    const background = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    columns.forEach((col, colIndex) => {
      const text = extractCellValue(item, col);
      const cell = ws.getCell(r, colIndex + 1);
      const numeric = Number(text);
      const isNumeric = !isNaN(numeric) && text.trim() !== '';
      cell.value = isNumeric ? numeric : text;
      cell.alignment = { vertical: 'middle', horizontal: isNumeric ? 'center' : 'right' };
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
      cell.fill = solid(background);
      cell.border = box('FFE2E8F0');
    });
  });

  // Totals
  if (totalSummary && Object.keys(totalSummary).length > 0) {
    const r = nextRow(24);
    mergeRow(r, 1, totalCols);
    styleRange(r, 1, totalCols, (cell) => {
      cell.fill = solid(GOLD_TINT_ARGB);
      cell.border = { top: edge(BRAND_ARGB.gold, 'medium'), bottom: edge(BRAND_ARGB.gold, 'medium') };
    });
    const summaryText = Object.entries(totalSummary)
      .map(([key, value]) => `${key}: ${value}`)
      .join('  |  ');
    const cell = ws.getCell(r, 1);
    cell.value = `الإجمالي والملخص:  ${summaryText}`;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND_ARGB.goldDark } };
  }
  nextRow(10);

  // Signatures and stamp: [prepared by | stamp | executive approval]
  const block1End = Math.max(1, Math.floor(totalCols / 3));
  const block2Start = block1End + 1;
  const block2End = Math.max(block2Start, Math.floor((totalCols * 2) / 3));
  const block3Start = block2End + 1;
  const titleRowSign = nextRow(22);
  const stampRow = nextRow(84);
  const lineRow = nextRow(22);

  const signBlock = (from: number, to: number, heading: string, middle: string, line: string) => {
    for (const r of [titleRowSign, stampRow, lineRow]) mergeRow(r, from, to);
    const head = ws.getCell(titleRowSign, from);
    head.value = heading;
    head.alignment = { vertical: 'middle', horizontal: 'center' };
    head.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    const mid = ws.getCell(stampRow, from);
    mid.value = middle;
    mid.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    mid.font = { name: 'Arial', size: 9, bold: true, color: { argb: BRAND_ARGB.navy } };
    const bottom = ws.getCell(lineRow, from);
    bottom.value = line;
    bottom.alignment = { vertical: 'middle', horizontal: 'center' };
    bottom.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };
  };
  signBlock(1, block1End, 'المُعِد / المستخرج', `${userName}\n(${userRole})`, 'التوقيع: _______________________');
  signBlock(block3Start, totalCols, 'اعتماد الإدارة العليا', 'المدير العام التنفيذي\nسعود فيصل القحطاني', 'الاعتماد: _______________________');
  signBlock(block2Start, block2End, '★ الختم الرسمي المعتمد ★', '', 'OFFICIAL CERTIFIED STAMP');
  ws.getCell(titleRowSign, block2Start).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: BRAND_ARGB.goldDark } };
  ws.getCell(lineRow, block2Start).font = { name: 'Arial', size: 7.5, bold: true, color: { argb: BRAND_ARGB.gold } };
  styleRange(stampRow, block2Start, block2End, (cell) => {
    cell.fill = solid(GOLD_TINT_ARGB);
    cell.border = {
      top: edge(BRAND_ARGB.gold, 'medium'),
      bottom: edge(BRAND_ARGB.gold, 'medium'),
      left: edge(BRAND_ARGB.gold, 'medium'),
      right: edge(BRAND_ARGB.gold, 'medium'),
    };
  });

  if (assets.stamp) {
    const boxW = colPx.slice(block2Start - 1, block2End).reduce((sum, px) => sum + px, 0);
    const boxH = rowPx[stampRow - 1];
    const fit = Math.min((boxW - 16) / assets.stamp.width, (boxH - 12) / assets.stamp.height, 2);
    const stampW = Math.round(assets.stamp.width * fit);
    const stampH = Math.round(assets.stamp.height * fit);
    // Native offsets are measured from the block start, so the centered position is identical in RTL and LTR views.
    let offX = (boxW - stampW) / 2;
    let col = block2Start - 1;
    while (col < block2End - 1 && offX >= colPx[col]) {
      offX -= colPx[col];
      col += 1;
    }
    addImage(assets.stamp, {
      tl: {
        nativeCol: col,
        nativeColOff: Math.round(offX * EMU_PER_PX),
        nativeRow: stampRow - 1,
        nativeRowOff: Math.round(((boxH - stampH) / 2) * EMU_PER_PX),
      },
      ext: { width: stampW, height: stampH },
      editAs: 'oneCell',
    });
  } else {
    ws.getCell(stampRow, block2Start).value = `${company.stampTextAr} • ${company.stampTextEn}\nس.ت الموحد: ${company.crNumber}`;
  }
  nextRow(8);

  // Footer: the approved contact strip (plain contact line when the artwork is unavailable)
  if (assets.footer) {
    const r = nextRow(pxToPt((sheetPx * assets.footer.height) / assets.footer.width));
    addStrip(assets.footer, r);
  } else {
    const r = nextRow(26);
    mergeRow(r, 1, totalCols);
    styleRange(r, 1, totalCols, (cell) => (cell.border = { top: edge(BRAND_ARGB.gold, 'medium') }));
    const cell = ws.getCell(r, 1);
    cell.value = LETTERHEAD_CONTACT_LINE;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: BRAND_ARGB.navy } };
  }
  const noteRow = nextRow(20);
  mergeRow(noteRow, 1, totalCols);
  const noteCell = ws.getCell(noteRow, 1);
  noteCell.value = `تم استخراج هذا الملف آلياً عبر ${company.systemName} • وثيقة إدارية رسمية معتمدة`;
  noteCell.alignment = { vertical: 'middle', horizontal: 'center' };
  noteCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF64748B' } };

  // Print setup: column headers repeat on every page, contact details and page numbers in the page footer
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  ws.headerFooter.oddFooter = `&L&"Arial,Regular"&8${LETTERHEAD_CONTACT.website}  •  ${LETTERHEAD_CONTACT.phone}&R&"Arial,Regular"&8&P / &N`;

  return workbook;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates the executive Excel workbook (.xlsx) with the approved letterhead artwork and the settings stamp.
 */
export async function exportToEnterpriseExcel(options: EnterpriseExportOptions): Promise<void> {
  const now = new Date();
  try {
    const assets = await loadExcelBrandAssets(options);
    const workbook = buildEnterpriseWorkbook(options, assets, now);
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${options.filename || 'export'}_${now.toISOString().slice(0, 10)}.xlsx`
    );
  } catch (error) {
    console.error('[exportToEnterpriseExcel] ExcelJS export error, falling back:', error);
    fallbackHtmlExcelExport(options, now);
  }
}

/**
 * Fallback Excel export (HTML .xls) in case binary workbook fails
 */
function fallbackHtmlExcelExport(options: EnterpriseExportOptions, now: Date) {
  const { filename, title, subtitle, columns, data } = options;
  const company = getExportCompanyInfo();
  const totalCols = Math.max(columns.length, 6);

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40"
          dir="rtl">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
        .hdr-brand { background-color: ${BRAND.navy}; color: ${BRAND.goldLight}; font-size: 14pt; font-weight: bold; text-align: center; padding: 12px; }
        .gold-divider { background-color: ${BRAND.goldBand}; height: 4px; }
        .report-title { background-color: #f8fafc; color: ${BRAND.navy}; font-size: 13pt; font-weight: bold; text-align: center; }
        .col-header { background-color: ${BRAND.navy}; color: #f8fafc; font-weight: bold; font-size: 10pt; text-align: center; }
        .row-even { background-color: #ffffff; font-size: 9pt; }
        .row-odd { background-color: #f8fafc; font-size: 9pt; }
        .contact { color: ${BRAND.navy}; font-size: 9pt; font-weight: bold; text-align: center; border-top: 2px solid ${BRAND.gold}; }
      </style>
    </head>
    <body>
      <table border="1" cellpadding="4" cellspacing="0" width="100%">
        <tr><td colspan="${totalCols}" class="hdr-brand">${escapeHtml(company.nameAr)} • ${escapeHtml(company.nameEn)}</td></tr>
        <tr><td colspan="${totalCols}" class="gold-divider"></td></tr>
        <tr><td colspan="${totalCols}" class="report-title">${escapeHtml(title)} ${subtitle ? `- ${escapeHtml(subtitle)}` : ''}</td></tr>
        <tr>
          ${columns.map((c) => `<th class="col-header">${escapeHtml(c.header)}</th>`).join('')}
        </tr>
        ${data
          .map(
            (item, rowIdx) => `
          <tr class="${rowIdx % 2 === 0 ? 'row-even' : 'row-odd'}">
            ${columns.map((c) => `<td>${escapeHtml(extractCellValue(item, c))}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
        <tr><td colspan="${totalCols}" class="contact">${LETTERHEAD_CONTACT_LINE}</td></tr>
      </table>
    </body>
    </html>
  `;

  triggerDownload(
    new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    `${filename || 'export'}_${now.toISOString().slice(0, 10)}.xls`
  );
}
