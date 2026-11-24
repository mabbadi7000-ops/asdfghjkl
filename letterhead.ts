/**
 * Official Marshal Logistic letterhead (the approved paper).
 * Single source of truth for every printed document: header, footer and watermark are the artwork
 * extracted from the approved PDF (public/brand) and repeat on every printed page.
 */
import { loadCompanySettings } from '../services/settingsService';
import { BRAND, BRAND_ASSETS, toAbsoluteUrl } from './brandAssets';

export const LETTERHEAD_CONTACT = {
  addressLine1: 'Saiyda, Al Duraihemiyah Dist',
  addressLine2: 'Riyadh, Kingdom of Saudi Arabia',
  phone: '+966 50 883 5612',
  website: 'Marshall.com.sa',
} as const;

export const LETTERHEAD_CONTACT_LINE = `${LETTERHEAD_CONTACT.addressLine1}, ${LETTERHEAD_CONTACT.addressLine2}  •  ${LETTERHEAD_CONTACT.phone}  •  ${LETTERHEAD_CONTACT.website}`;

export type LetterheadOrientation = 'portrait' | 'landscape';

/** Measurements (mm) of the approved A4 paper; the body flows between headSpaceMm and footSpaceMm on every page. */
export const LETTERHEAD_LAYOUT = {
  headerMm: 63,
  footerMm: 17.6,
  headSpaceMm: 66,
  footSpaceMm: 20,
  watermark: { widthMm: 120.2, heightMm: 104.5, portraitLeftMm: 39.8, portraitTopMm: 97.2 },
} as const;

/** Pixel geometry of the portrait artwork, used to recompose it at other widths (Excel). */
export const LETTERHEAD_ART = {
  header: { width: 2480, height: 744, stretchX: 885 },
  footer: { width: 2480, height: 208, items: [[75, 935], [1111, 1688], [1938, 2405]], pad: 14 },
} as const;

/** Watermark, header and footer layers of the official paper (absolute URLs so print windows can load them). */
export function getLetterheadLayersHtml(orientation: LetterheadOrientation = 'portrait'): string {
  const { watermark, [orientation]: paper } = BRAND_ASSETS.letterhead;
  return `
  <img class="lh-layer lh-watermark" src="${toAbsoluteUrl(watermark)}" alt="" aria-hidden="true">
  <img class="lh-layer lh-header" src="${toAbsoluteUrl(paper.header)}" alt="" aria-hidden="true">
  <img class="lh-layer lh-footer" src="${toAbsoluteUrl(paper.footer)}" alt="" aria-hidden="true">`;
}

/** Scoped CSS of the paper itself (sheet, header, footer, watermark); safe to inject inside the app. */
export function getLetterheadLayersCss(orientation: LetterheadOrientation = 'portrait'): string {
  const landscape = orientation === 'landscape';
  const pageW = landscape ? 297 : 210;
  const pageH = landscape ? 210 : 297;
  const { watermark: wm, headerMm, footerMm, headSpaceMm, footSpaceMm } = LETTERHEAD_LAYOUT;
  const wmLeft = landscape ? (pageW - wm.widthMm) / 2 : wm.portraitLeftMm;
  const wmTop = landscape ? (pageH - wm.heightMm) / 2 : wm.portraitTopMm;
  return `
.lh-sheet { --lh-navy:${BRAND.navy}; --lh-gold:${BRAND.gold}; --lh-gold-dark:${BRAND.goldDark}; --lh-head:${headSpaceMm}mm; --lh-foot:${footSpaceMm}mm; --lh-w:${pageW}mm; --lh-h:${pageH}mm; position:relative; width:var(--lh-w); min-height:var(--lh-h); margin:0 auto 24px; background:#fff; box-shadow:0 8px 30px rgba(15,23,42,.18); overflow:hidden; font-family:'Cairo','Segoe UI',Tahoma,sans-serif; }
.lh-sheet, .lh-sheet * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.lh-layer { position:absolute; display:block; max-width:none; pointer-events:none; user-select:none; }
.lh-header { top:0; left:0; width:100%; height:${headerMm}mm; z-index:2; }
.lh-footer { bottom:0; left:0; width:100%; height:${footerMm}mm; z-index:2; }
.lh-watermark { top:${wmTop}mm; left:${wmLeft}mm; width:${wm.widthMm}mm; height:${wm.heightMm}mm; z-index:0; }
`;
}

export function getLetterheadCss(orientation: LetterheadOrientation = 'portrait'): string {
  const pageW = orientation === 'landscape' ? '297mm' : '210mm';
  return `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
html, body { margin:0; padding:0; }
body { font-family:'Cairo','Segoe UI',Tahoma,sans-serif; color:#0f172a; background:#e2e8f0; direction:rtl; font-size:11px; line-height:1.6; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
@page { size:A4 ${orientation}; margin:0; }

.lh-toolbar { width:${pageW}; max-width:100%; margin:12px auto; display:flex; gap:8px; justify-content:flex-start; }
.lh-btn { padding:8px 18px; background:${BRAND.navy}; color:${BRAND.gold}; font-family:inherit; font-weight:800; font-size:12px; cursor:pointer; border:1px solid ${BRAND.gold}; border-radius:8px; }
.lh-btn.secondary { background:#e2e8f0; color:#334155; border-color:#cbd5e1; }
${getLetterheadLayersCss(orientation)}

.lh-flow { position:relative; z-index:1; width:100%; border-collapse:collapse; }
.lh-flow > thead > tr > td, .lh-flow > tfoot > tr > td, .lh-flow > tbody > tr > td { padding:0; border:0; background:none; }
.lh-head-space { height:var(--lh-head); }
.lh-foot-space { height:var(--lh-foot); }
.lh-body { vertical-align:top; text-align:right; }
.lh-flow > tbody > tr > td.lh-body { padding:2mm 14mm 0; }

.lh-titlebar { display:flex; justify-content:space-between; align-items:center; gap:12px; border-right:4px solid var(--lh-gold); background:#f8fafc; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; border-left:1px solid #e2e8f0; border-radius:8px; padding:9px 14px; margin-bottom:14px; }
.lh-titlebar h1 { margin:0; font-size:15px; font-weight:900; color:var(--lh-navy); }
.lh-titlebar p { margin:2px 0 0; font-size:10px; color:#64748b; }
.lh-ref { text-align:left; direction:ltr; }
.lh-ref-badge { display:inline-block; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 9px; border-radius:6px; font-family:monospace; font-weight:800; font-size:12px; }
.lh-ref p { direction:rtl; }

.lh-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:11px 12px; margin-bottom:14px; }
.lh-grid .l { display:block; font-size:9px; color:#64748b; }
.lh-grid .v { font-size:11px; font-weight:700; color:#0f172a; }
.lh-split { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.lh-card { border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
.lh-card-head { padding:7px 12px; font-weight:800; font-size:11px; }
.lh-card-head.earn { background:#ecfdf5; color:#065f46; border-bottom:1px solid #a7f3d0; }
.lh-card-head.ded { background:#fff1f2; color:#9f1239; border-bottom:1px solid #fecdd3; }

.lh-table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:14px; }
.lh-table th { background:var(--lh-navy); color:#f8fafc; padding:7px 8px; font-weight:700; text-align:right; border:1px solid var(--lh-navy); }
.lh-table td { padding:6px 8px; border:1px solid #e2e8f0; color:#1e293b; }
.lh-table tbody tr:nth-child(even) { background:#f8fafc; }
.lh-table tr.total td { background:#e2e8f0; font-weight:800; }
.lh-card .lh-table { margin:0; font-size:11px; }
.lh-card .lh-table td { border:0; border-bottom:1px solid #f1f5f9; padding:7px 12px; }
.lh-table .num, .num { font-family:monospace; font-weight:700; }
.lh-table td.num { text-align:left; }

.lh-net { display:flex; justify-content:space-between; align-items:center; background:var(--lh-navy); color:#fff; padding:13px 18px; border-radius:10px; border-bottom:3px solid var(--lh-gold); margin-bottom:14px; }
.lh-net .t { font-size:13px; font-weight:800; }
.lh-net .s { font-size:10px; color:#cbd5e1; }
.lh-net .amt { font-size:22px; font-weight:900; font-family:monospace; color:${BRAND.goldLight}; }
.lh-note { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:9px 12px; margin-bottom:14px; font-size:10px; color:#475569; }
.lh-section { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:11px 14px; margin-bottom:11px; }
.lh-section-title { font-size:11px; font-weight:800; color:#0f172a; border-bottom:1px solid #f1f5f9; padding-bottom:6px; margin-bottom:8px; }
.lh-section-body { color:#334155; font-size:10.5px; white-space:pre-line; }

.lh-signs { display:grid; gap:12px; border-top:1px dashed #cbd5e1; padding-top:16px; margin-top:18px; text-align:center; align-items:end; }
.lh-signs.c3 { grid-template-columns:repeat(3,1fr); }
.lh-signs.c4 { grid-template-columns:repeat(4,1fr); }
.lh-sign-title { font-size:10px; font-weight:700; color:#334155; }
.lh-sign-name { font-size:9px; color:#64748b; }
.lh-sign-line { height:44px; border-bottom:1px solid #94a3b8; margin:0 14px 6px; }
.lh-seal-cap { font-size:8.5px; color:${BRAND.goldDark}; font-weight:700; margin-top:3px; }
.lh-avoid, .lh-body tr, .lh-card, .lh-section { break-inside:avoid; page-break-inside:avoid; }
.lh-body thead { display:table-header-group; }

@media print {
  body { background:#fff; }
  .lh-toolbar, .no-print { display:none !important; }
  .lh-sheet { width:auto; min-height:0; margin:0; box-shadow:none; overflow:visible; }
  .lh-layer { position:fixed; }
}
`;
}

export interface LetterheadDocumentOptions {
  title: string;
  bodyHtml: string;
  orientation?: LetterheadOrientation;
  extraCss?: string;
  toolbarHtml?: string;
  autoPrint?: boolean;
}

/** Wraps content in the official letterhead paper (header, footer and watermark repeat on every page). */
export function buildLetterheadDocument(options: LetterheadDocumentOptions): string {
  const { title, bodyHtml, orientation = 'portrait', extraCss = '', toolbarHtml = '', autoPrint = false } = options;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${getLetterheadCss(orientation)}${extraCss}</style>
</head>
<body>
  ${toolbarHtml ? `<div class="lh-toolbar no-print">${toolbarHtml}</div>` : ''}
  <div class="lh-sheet">
    ${getLetterheadLayersHtml(orientation)}
    <table class="lh-flow">
      <thead><tr><td><div class="lh-head-space"></div></td></tr></thead>
      <tfoot><tr><td><div class="lh-foot-space"></div></td></tr></tfoot>
      <tbody><tr><td class="lh-body">${bodyHtml}</td></tr></tbody>
    </table>
  </div>
  ${autoPrint ? `<script>window.addEventListener('load',function(){var images=Array.from(document.images).map(function(image){return image.decode?image.decode().catch(function(){}):Promise.resolve();});var fonts=document.fonts?Promise.race([document.fonts.ready,new Promise(function(resolve){setTimeout(resolve,2000);})]):Promise.resolve();Promise.all(images).then(function(){return fonts;}).then(function(){window.print();});});</script>` : ''}
</body>
</html>`;
}

/** Document title strip shown under the letterhead (title, subtitle, reference and legal numbers). */
export function getDocTitleBarHtml(options: { title: string; subtitle?: string; ref?: string; meta?: string }): string {
  const settings = loadCompanySettings();
  const cr = settings.crNumber || '7054828277';
  const vat = settings.taxNumber || '310298471200003';
  return `<div class="lh-titlebar">
    <div>
      <h1>${options.title}</h1>
      <p>${options.subtitle || ''}</p>
      <p>س.ت: ${cr} • الرقم الضريبي: ${vat}</p>
    </div>
    <div class="lh-ref">
      ${options.ref ? `<span class="lh-ref-badge">${options.ref}</span>` : ''}
      ${options.meta ? `<p>${options.meta}</p>` : ''}
    </div>
  </div>`;
}
