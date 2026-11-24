/**
 * Export suite for MARSHAL LOGISTIC (مارشال لوجستيكس): shared export types and company info, CSV,
 * official PDF (print) documents on the approved letterhead, and the official stamp.
 * Excel workbooks are built in excelExport.ts.
 */
import { loadCompanySettings } from '../services/settingsService';
import { BRAND, BRAND_ASSETS, getCompanyStamp, toAbsoluteUrl } from './brandAssets';
import { buildLetterheadDocument, getDocTitleBarHtml } from './letterhead';

export interface ExportColumn {
  header: string;
  accessor?: string;
  getValue?: (item: any) => string | number;
}

export interface EnterpriseExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
  user?: {
    fullName: string;
    role: string;
    jobTitle?: string;
  } | null;
  filtersSummary?: string;
  totalSummary?: Record<string, string | number>;
  orientation?: 'portrait' | 'landscape';
}

export function getExportCompanyInfo(): {
  nameAr: string;
  nameEn: string;
  crNumber: string;
  vatNumber: string;
  address: string;
  phone: string;
  systemName: string;
  stampImage: string;
  stampTextAr: string;
  stampTextEn: string;
} {
  const settings = loadCompanySettings();
  return {
    nameAr: settings.companyNameAr || 'شركة مارشال لوجيستيكس',
    nameEn: settings.companyNameEn || 'MARSHAL LOGISTIC LLC',
    crNumber: settings.crNumber || '7054828277',
    vatNumber: settings.taxNumber || '310298471200003',
    address: settings.headquarters || 'المملكة العربية السعودية - الرياض - طريق الملك فهد',
    phone: settings.phone || '+966 11 456 7890',
    systemName: settings.systemName || 'منظومة مارشال لوجستيكس السحابية | MARSHAL LOGISTIC ERP',
    stampImage: getCompanyStamp(settings),
    stampTextAr: settings.stampTextAr || 'مارشال لوجستيكس',
    stampTextEn: settings.stampTextEn || 'MARSHAL LOGISTIC KSA',
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getExportRoleLabel(role?: string): string {
  if (!role) return 'إدارة العمليات';
  if (role === 'general_manager') return 'المدير العام التنفيذي';
  if (role === 'operations_manager') return 'مدير العمليات والتشغيل';
  return 'مشرف تشغيل';
}

/**
 * Extracts a clean string or number representation from an item using column definitions
 */
export function extractCellValue(item: any, col: ExportColumn): string {
  if (col.getValue) {
    const val = col.getValue(item);
    return val !== null && val !== undefined ? String(val) : '';
  }
  if (col.accessor && item[col.accessor] !== undefined && item[col.accessor] !== null) {
    const val = item[col.accessor];
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  }
  return '';
}

/**
 * Official stamp markup: the stamp image uploaded in system settings; when none was uploaded,
 * a generated seal built around the official emblem. Pass stampImage '' to force the generated seal.
 */
export function getMarshalOfficialSealMarkup(options?: {
  size?: number;
  labelAr?: string;
  labelEn?: string;
  crNumber?: string;
  stampImage?: string;
}): string {
  const company = getExportCompanyInfo();
  const size = options?.size || 95;
  const stampImage = options?.stampImage ?? company.stampImage;

  if (stampImage) {
    return `<img class="official-stamp-image" src="${escapeHtml(toAbsoluteUrl(stampImage))}" alt="الختم الرسمي" style="display: inline-block; height: ${size}px; width: auto; max-width: ${Math.round(size * 1.6)}px; object-fit: contain; transform: rotate(-6deg);" />`;
  }

  const labelAr = escapeHtml(options?.labelAr || company.stampTextAr || 'مارشال لوجستيكس');
  const labelEn = escapeHtml(options?.labelEn || company.stampTextEn || 'MARSHAL LOGISTIC');
  const cr = escapeHtml(options?.crNumber || company.crNumber || '7054828277');

  return `
    <div class="official-seal-badge" style="width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid ${BRAND.gold}; padding: 2px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; transform: rotate(-7deg); text-align: center; box-sizing: border-box; position: relative;">
      <div style="width: 100%; height: 100%; border-radius: 50%; border: 1.5px dashed ${BRAND.goldDark}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px; box-sizing: border-box; background: radial-gradient(circle, #fffbeb 0%, #ffffff 80%);">
        <div style="font-size: 6.5px; font-weight: 900; color: ${BRAND.goldDark}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1;">★ معتمد رسمياً ★</div>
        <img src="${toAbsoluteUrl(BRAND_ASSETS.emblem)}" alt="" style="height: ${Math.round(size * 0.36)}px; width: auto; margin: 2px 0;" />
        <div style="font-size: 7.5px; font-weight: 900; color: ${BRAND.navy}; line-height: 1.1; margin-top: 1px;">${labelAr}</div>
        <div style="font-size: 5.5px; font-weight: 800; color: ${BRAND.gold}; letter-spacing: 0.3px; line-height: 1;">${labelEn}</div>
        <div style="font-size: 5px; font-weight: 700; color: #64748b; font-family: monospace; line-height: 1; margin-top: 1px;">س.ت: ${cr}</div>
      </div>
    </div>
  `;
}

/**
 * Standard CSV Export with UTF-8 Byte Order Mark (BOM)
 */
export function exportToCSV(options: EnterpriseExportOptions) {
  const { filename, columns, data } = options;

  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const val = extractCellValue(item, col);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Official Enterprise PDF Printable Document
 * Formatted with corporate letterhead, dynamic uploaded logo or official vector crest,
 * reference number, barcode/verification stamp, and signature blocks.
 */
export function exportToOfficialPDF(options: EnterpriseExportOptions) {
  const {
    title,
    subtitle,
    columns,
    data,
    user,
    orientation = 'landscape',
  } = options;

  const company = getExportCompanyInfo();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const refCode = `MRSHL-EXP-${Math.floor(100000 + Math.random() * 900000)}`;

  const userName = user?.fullName || 'مسؤول النظام';
  const userRole = user?.role
    ? user.role === 'general_manager'
      ? 'المدير العام التنفيذي'
      : user.role === 'operations_manager'
      ? 'مدير العمليات والتشغيل'
      : 'مشرف تشغيل'
    : 'إدارة العمليات';

  const bodyHtml = `
      ${getDocTitleBarHtml({
        title,
        subtitle: subtitle || `تقرير إداري وتشغيلي رسمي صادر عن ${company.systemName}`,
        ref: refCode,
        meta: `${dateFormatted} - ${timeFormatted} • إجمالي النتائج: ${data.length} سجل`,
      })}

      <!-- Data Table -->
      <table class="lh-table">
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            ${columns.map((c) => `<th>${c.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data
            .map((item, idx) => {
              return `<tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                ${columns
                  .map((c) => {
                    const val = extractCellValue(item, c);
                    return `<td>${val}</td>`;
                  })
                  .join('')}
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Endorsement / Approvals -->
      <div class="lh-signs c3 lh-avoid">
        <div>
          <div class="lh-sign-title">المُعِد / المستخرج</div>
          <div class="lh-sign-name">${userName} (${userRole})</div>
          <div class="lh-sign-line"></div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          ${getMarshalOfficialSealMarkup({
            size: 96,
            labelAr: company.stampTextAr,
            labelEn: company.stampTextEn,
            crNumber: company.crNumber,
          })}
          <div class="lh-seal-cap">الختم الرسمي المعتمد</div>
        </div>

        <div>
          <div class="lh-sign-title">اعتماد الإدارة العليا</div>
          <div class="lh-sign-name">المدير العام التنفيذي</div>
          <div class="lh-sign-line"></div>
        </div>
      </div>
  `;

  const html = buildLetterheadDocument({
    title: `${title} - ${company.nameAr}`,
    bodyHtml,
    orientation,
    autoPrint: true,
  });

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Generates an official executive memorandum PDF for a specific operational report
 */
export function exportReportMemoPDF(report: any, currentUser?: any) {
  const company = getExportCompanyInfo();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const refCode = `MEMO-MRSHL-${report.id?.slice(-6)?.toUpperCase() || Math.floor(100000 + Math.random() * 900000)}`;

  const statusLabel =
    report.status === 'approved'
      ? 'معتمد رسمياً'
      : report.status === 'submitted'
      ? 'مرفوع للاعتماد'
      : report.status === 'under_review'
      ? 'قيد المراجعة والتدقيق'
      : report.status === 'rejected'
      ? 'مرفوض / طلب تعديل'
      : 'مسودة';

  const statusColor =
    report.status === 'approved'
      ? '#059669'
      : report.status === 'rejected'
      ? '#e11d48'
      : '#d97706';

  const memoCss = `
    .memo-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-right: 5px solid #d4af37; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    .memo-banner h2 { font-size: 15px; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; }
    .memo-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 10px; }
    .meta-item strong { color: #64748b; display: block; font-size: 9px; margin-bottom: 2px; }
    .meta-item span { color: #0f172a; font-weight: 700; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; background: ${statusColor}; font-weight: 800; font-size: 10.5px; }
    .section-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 11px; }
    .section-title { font-size: 11px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 8px; }
    .section-content { color: #334155; font-size: 10.5px; white-space: pre-line; }
  `;

  const bodyHtml = `
      ${getDocTitleBarHtml({
        title: 'مذكرة إدارية رسمية',
        subtitle: 'مذكرة تشغيلية موجهة إلى الإدارة العامة',
        ref: refCode,
        meta: `تاريخ المذكرة: <strong>${dateFormatted}</strong>`,
      })}

      <div class="memo-banner">
        <div>
          <h2>${report.title}</h2>
          <div style="font-size: 10px; color: #64748b;">
            نوع التقرير: <strong>${report.reportType?.replace('_', ' ')?.toUpperCase()}</strong> • الفترة: <strong>${report.period || 'يومي'}</strong>
          </div>
        </div>
        <div>
          <span class="status-badge">${statusLabel}</span>
        </div>
      </div>

      <div class="memo-meta-grid">
        <div class="meta-item">
          <strong>القسم المختص</strong>
          <span>${report.department || 'إدارة العمليات والتشغيل'}</span>
        </div>
        <div class="meta-item">
          <strong>تاريخ العمليات</strong>
          <span>${report.date || dateFormatted}</span>
        </div>
        <div class="meta-item">
          <strong>مُعد التقرير</strong>
          <span>${report.authorName || currentUser?.fullName || 'مشرف التشغيل'}</span>
        </div>
        <div class="meta-item">
          <strong>المستلم / الموجه له</strong>
          <span>المدير العام التنفيذي</span>
        </div>
      </div>

      <!-- Executive Summary -->
      <div class="section-box">
        <div class="section-title">📌 الملخص التنفيذي (Executive Summary)</div>
        <div class="section-content">${report.summary || 'لا يوجد ملخص'}</div>
      </div>

      <!-- Operational Details -->
      <div class="section-box">
        <div class="section-title">📊 تفاصيل العمليات والأرقام والإنجازات (Operational Data)</div>
        <div class="section-content">${report.details || 'لا توجد تفاصيل'}</div>
      </div>

      <!-- Issues & Challenges -->
      ${
        report.issues
          ? `<div class="section-box" style="border-right: 4px solid #f43f5e;">
              <div class="section-title" style="color: #be123c;">⚠️ المشاكل والتحديات التشغيلية (Operational Issues)</div>
              <div class="section-content">${report.issues}</div>
            </div>`
          : ''
      }

      <!-- Actions Taken -->
      ${
        report.actionsTaken
          ? `<div class="section-box" style="border-right: 4px solid #3b82f6;">
              <div class="section-title" style="color: #1d4ed8;">⚡ الإجراءات الفورية المتخذة (Immediate Actions Taken)</div>
              <div class="section-content">${report.actionsTaken}</div>
            </div>`
          : ''
      }

      <!-- Recommendations -->
      ${
        report.recommendations
          ? `<div class="section-box" style="border-right: 4px solid #10b981;">
              <div class="section-title" style="color: #047857;">💡 التوصيات المقترحة (Recommendations)</div>
              <div class="section-content">${report.recommendations}</div>
            </div>`
          : ''
      }

      <!-- Executive Feedback -->
      ${
        report.reviewFeedback
          ? `<div class="section-box" style="background: #f8fafc; border-right: 4px solid #6366f1;">
              <div class="section-title" style="color: #4338ca;">✍️ توجيهات واعتماد الإدارة العامة (Executive Feedback)</div>
              <div class="section-content" style="font-weight: 600;">${report.reviewFeedback}</div>
            </div>`
          : ''
      }

      <!-- Endorsements -->
      <div class="lh-signs c3 lh-avoid">
        <div>
          <div class="lh-sign-title">مُعِد التقرير التشغيلي</div>
          <div class="lh-sign-name">${report.authorName || currentUser?.fullName || 'مشرف التشغيل'}</div>
          <div class="lh-sign-line"></div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          ${getMarshalOfficialSealMarkup({
            size: 96,
            labelAr: company.stampTextAr,
            labelEn: company.stampTextEn,
            crNumber: company.crNumber,
          })}
          <div class="lh-seal-cap">الختم المعتمد إلكترونياً</div>
        </div>

        <div>
          <div class="lh-sign-title">اعتماد المدير العام</div>
          <div class="lh-sign-name">سعود فيصل القحطاني</div>
          <div class="lh-sign-line"></div>
        </div>
      </div>
  `;

  const html = buildLetterheadDocument({
    title: `${report.title} - مذكرة إدارية رسمية`,
    bodyHtml,
    extraCss: memoCss,
    autoPrint: true,
  });

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
