import { DriverPayrollRecord } from '../types';
import { BRAND } from './brandAssets';
import { getExportCompanyInfo, getMarshalOfficialSealMarkup } from './exportUtils';
import { buildLetterheadDocument, getDocTitleBarHtml } from './letterhead';
import { printHtmlViaIframe } from './printDocumentHelpers';

const PAYSLIP_CSS = `
  .info-box { font-size: 11px; }
  .info-label { color: #64748b; font-size: 9px; display: block; }
  .info-val { font-weight: 700; color: #0f172a; }
  .tables-section { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .table-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .table-header { padding: 8px 12px; font-weight: 800; font-size: 11px; }
  .header-earnings { background: #ecfdf5; color: #065f46; border-bottom: 1px solid #a7f3d0; }
  .header-deductions { background: #fff1f2; color: #9f1239; border-bottom: 1px solid #fecdd3; }
  .table-card table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .table-card td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .text-end { text-align: left; font-family: monospace; font-weight: 700; }
  .total-row { font-weight: 800; background: #f8fafc; }
  .net-banner { display: flex; justify-content: space-between; align-items: center; background: ${BRAND.navy}; color: #ffffff; padding: 14px 20px; border-radius: 10px; border-bottom: 3px solid ${BRAND.gold}; margin-bottom: 14px; }
  .net-title { font-size: 14px; font-weight: 800; }
  .net-sub { font-size: 10px; color: #cbd5e1; }
  .net-amount { font-size: 24px; font-weight: 900; font-family: monospace; color: ${BRAND.goldLight}; }
  .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; border-top: 1px dashed #cbd5e1; padding-top: 18px; margin-top: 18px; text-align: center; break-inside: avoid; }
  .sign-box { font-size: 10px; color: #64748b; }
  .sign-line { height: 48px; border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; }
`;

export function generatePayslipHtml(payroll: DriverPayrollRecord): string {
  const company = getExportCompanyInfo();
  const statusLabels: Record<string, string> = {
    paid: 'تم الصرف والتحويل البنكي (Paid)',
    approved: 'معتمد وجاهز للصرف (Approved)',
    reviewed: 'تم التدقيق والمراجعة (Reviewed)',
    draft: 'مسودة قيد الإعداد (Draft)',
  };

  const paymentMethodLabels: Record<string, string> = {
    wps_bank: 'نظام حماية الأجور (WPS البنكي)',
    bank_transfer: 'تحويل سريع للآيبان البنكي',
    cash: 'صرف نقدي رسمي (سند قبض)',
    cheque: 'شيك بنكي معتمد',
  };

  const bodyHtml = `
    ${getDocTitleBarHtml({
      title: 'مسير راتب كابتن توصيل',
      subtitle: 'إدارة الموارد البشرية والرواتب • نظام حماية الأجور السعودي (WPS)',
      ref: `#${payroll.payrollNumber}`,
      meta: `شهر الاستحقاق: <strong>${payroll.month}</strong>`,
    })}

    <!-- Driver Info Grid -->
    <div class="lh-grid">
      <div class="info-box">
        <span class="info-label">اسم الكابتن</span>
        <span class="info-val">${payroll.driverName}</span>
      </div>
      <div class="info-box">
        <span class="info-label">رقم الإقامة / الهوية</span>
        <span class="info-val" style="font-family: monospace;">${payroll.driverIqama}</span>
      </div>
      <div class="info-box">
        <span class="info-label">المنصة المشغلة</span>
        <span class="info-val">${payroll.platformName || 'أسطول عام'}</span>
      </div>
      <div class="info-box">
        <span class="info-label">طريقة الصرف</span>
        <span class="info-val">${paymentMethodLabels[payroll.paymentMethod || 'wps_bank'] || payroll.paymentMethod}</span>
      </div>
      <div class="info-box">
        <span class="info-label">حالة المسير</span>
        <span class="info-val">${statusLabels[payroll.status] || payroll.status}</span>
      </div>
      <div class="info-box">
        <span class="info-label">عدد الطلبات المنفذة</span>
        <span class="info-val" style="font-family: monospace;">${payroll.deliveriesCount || 0} طلب</span>
      </div>
      <div class="info-box">
        <span class="info-label">الآيبان البنكي (IBAN)</span>
        <span class="info-val" style="font-family: monospace; font-size: 10px;">${payroll.bankIban || 'SA0380000000608010167519'}</span>
      </div>
      <div class="info-box">
        <span class="info-label">تاريخ الإصدار والاعتماد</span>
        <span class="info-val" style="font-family: monospace;">${payroll.paymentDate || new Date().toISOString().slice(0, 10)}</span>
      </div>
    </div>

    <!-- Earnings & Deductions Tables -->
    <div class="tables-section">
      <!-- Earnings -->
      <div class="table-card">
        <div class="table-header header-earnings">المستحقات والبدلات (Earnings)</div>
        <table>
          <tbody>
            <tr>
              <td>الراتب الأساسي المعتمد</td>
              <td class="text-end">${Number(payroll.basicSalary || (payroll as any).baseSalary || 0).toLocaleString()} ر.س</td>
            </tr>
            <tr>
              <td>عمولة توصيل الطلبات (${payroll.deliveriesCount || 0} طلب)</td>
              <td class="text-end">${Number(payroll.deliveryCommissions || 0).toLocaleString()} ر.س</td>
            </tr>
            <tr>
              <td>مكافآت وحوافز إضافية</td>
              <td class="text-end">${Number(payroll.bonuses || (payroll as any).bonus || 0).toLocaleString()} ر.س</td>
            </tr>
            <tr>
              <td>بدل وقود وسكن وانتقال</td>
              <td class="text-end">${Number(payroll.housingAllowance || 0 + (payroll.transportAllowance || 0)).toLocaleString()} ر.س</td>
            </tr>
            <tr class="total-row" style="color: #065f46;">
              <td>إجمالي المستحقات (Gross Total)</td>
              <td class="text-end">${Number(payroll.grossEarnings || 0).toLocaleString()} ر.س</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions -->
      <div class="table-card">
        <div class="table-header header-deductions">الاستقطاعات والخصومات الآلية (Deductions)</div>
        <table>
          <tbody>
            <tr>
              <td>عجز تصفية الكاش اليومي</td>
              <td class="text-end" style="color: ${payroll.cashShortageDeduction ? '#e11d48' : '#64748b'};">
                ${Number(payroll.cashShortageDeduction || 0).toLocaleString()} ر.س
              </td>
            </tr>
            <tr>
              <td>المخالفات المرورية المسجلة</td>
              <td class="text-end" style="color: ${payroll.violationDeduction ? '#e11d48' : '#64748b'};">
                ${Number(payroll.violationDeduction || 0).toLocaleString()} ر.س
              </td>
            </tr>
            <tr>
              <td>استقطاع السلفة والقرض المالي</td>
              <td class="text-end" style="color: ${payroll.advanceDeduction ? '#e11d48' : '#64748b'};">
                ${Number(payroll.advanceDeduction || 0).toLocaleString()} ر.س
              </td>
            </tr>
            <tr>
              <td>تجاوز استهلاك الوقود</td>
              <td class="text-end" style="color: ${payroll.fuelExcessDeduction ? '#e11d48' : '#64748b'};">
                ${Number(payroll.fuelExcessDeduction || 0).toLocaleString()} ر.س
              </td>
            </tr>
            <tr class="total-row" style="color: #9f1239;">
              <td>إجمالي الاستقطاعات (Total Deductions)</td>
              <td class="text-end">${Number(payroll.totalDeductions || 0).toLocaleString()} ر.س</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Net Salary Banner -->
    <div class="net-banner">
      <div>
        <div class="net-title">صافي الراتب المستحق للصرف والتحويل (Net Payable Salary)</div>
        <div class="net-sub">مبلغ الاستحقاق النهائي بعد خصم كافة الالتزامات والعهد المالية</div>
      </div>
      <div class="net-amount">
        ${Number(payroll.netSalary || 0).toLocaleString()} <span style="font-size: 14px;">ر.س</span>
      </div>
    </div>

    ${payroll.notes ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 10px; color: #475569;">
      <strong>ملاحظات:</strong> ${payroll.notes}
    </div>
    ` : ''}

    <!-- Signatures -->
    <div class="signatures">
      <div class="sign-box">
        <div class="sign-line"></div>
        <strong>إعداد مسؤول الرواتب</strong>
        <p style="font-size: 9px;">${payroll.preparedByName || 'مسؤول الرواتب'}</p>
      </div>

      <div class="sign-box">
        <div class="sign-line"></div>
        <strong>تدقيق الموارد البشرية</strong>
        <p style="font-size: 9px;">قسم العمليات والتدقيق</p>
      </div>

      <div class="sign-box">
        <div class="sign-line"></div>
        <strong>اعتماد المدير العام التنفيذي</strong>
        <p style="font-size: 9px;">سعود فيصل القحطاني</p>
      </div>

      <div class="sign-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
        ${getMarshalOfficialSealMarkup({
          size: 85,
          labelAr: company.stampTextAr,
          labelEn: company.stampTextEn,
          crNumber: company.crNumber,
        })}
        <span style="font-size: 8.5px; color: ${BRAND.goldDark}; font-weight: 700; margin-top: 2px;">الختم المالي للرواتب</span>
      </div>
    </div>`;

  return buildLetterheadDocument({
    title: `مسير راتب - ${payroll.driverName} - #${payroll.payrollNumber}`,
    bodyHtml,
    extraCss: PAYSLIP_CSS,
    toolbarHtml: `
      <button class="lh-btn" onclick="window.print()">🖨️ طباعة المسير الآن (Ctrl + P)</button>
      <button class="lh-btn secondary" onclick="window.close()">إغلاق النافذة</button>`,
  });
}

/**
 * Prints through the shared hidden-iframe helper: waits for the letterhead images, then falls back to a popup or a download.
 */
export function printPayslipDocument(payroll: DriverPayrollRecord): void {
  printHtmlViaIframe(generatePayslipHtml(payroll), 'payslip-print-iframe');
}

export function downloadPayslipHtml(htmlOrPayroll: string | DriverPayrollRecord): void {
  const html = typeof htmlOrPayroll === 'string' ? htmlOrPayroll : generatePayslipHtml(htmlOrPayroll);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `مسير-راتب-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Print complete monthly payroll sheet for all drivers
 */
export function printFullMonthlyPayrollReport(month: string, payrolls: DriverPayrollRecord[]): void {
  const company = getExportCompanyInfo();

  const totalGross = payrolls.reduce((acc, p) => acc + (p.grossEarnings || 0), 0);
  const totalDeductions = payrolls.reduce((acc, p) => acc + (p.totalDeductions || 0), 0);
  const totalNet = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);

  const bodyHtml = `
  ${getDocTitleBarHtml({
    title: 'كشف مسير الرواتب الشهري المعتمد (WPS)',
    subtitle: `${company.nameAr} • مسيرات رواتب شهر: ${month} • إجمالي الكباتن: ${payrolls.length}`,
    meta: new Date().toLocaleDateString('ar-SA'),
  })}
  <table class="lh-table">
    <thead>
      <tr>
        <th>#</th>
        <th>رقم المسير</th>
        <th>اسم الكابتن</th>
        <th>رقم الإقامة</th>
        <th>المنصة</th>
        <th>الأساسي</th>
        <th>الطلبات</th>
        <th>إجمالي المستحق</th>
        <th>عجز كاش</th>
        <th>مخالفات</th>
        <th>سلف</th>
        <th>إجمالي الاستقطاع</th>
        <th>صافي الراتب</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${payrolls.map((p, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td class="num">${p.payrollNumber}</td>
          <td><strong>${p.driverName}</strong></td>
          <td class="num">${p.driverIqama}</td>
          <td>${p.platformName || '-'}</td>
          <td class="num">${Number(p.basicSalary || (p as any).baseSalary || 0).toLocaleString()}</td>
          <td class="num">${p.deliveriesCount || 0}</td>
          <td class="num">${Number(p.grossEarnings || 0).toLocaleString()}</td>
          <td class="num" style="color: #e11d48;">${Number(p.cashShortageDeduction || 0).toLocaleString()}</td>
          <td class="num" style="color: #e11d48;">${Number(p.violationDeduction || 0).toLocaleString()}</td>
          <td class="num" style="color: #e11d48;">${Number(p.advanceDeduction || 0).toLocaleString()}</td>
          <td class="num" style="color: #e11d48; font-weight: 700;">${Number(p.totalDeductions || 0).toLocaleString()}</td>
          <td class="num" style="color: #065f46; font-weight: 800; font-size: 11px;">${Number(p.netSalary || 0).toLocaleString()} ر.س</td>
          <td>${p.status === 'paid' ? 'تم الصرف' : p.status === 'approved' ? 'معتمد' : 'مسودة'}</td>
        </tr>
      `).join('')}
      <tr class="total">
        <td colspan="7">الإجمالي الكلي (${payrolls.length} كابتن)</td>
        <td class="num">${totalGross.toLocaleString()} ر.س</td>
        <td colspan="3"></td>
        <td class="num" style="color: #e11d48;">${totalDeductions.toLocaleString()} ر.س</td>
        <td class="num" style="color: #065f46; font-size: 12px;">${totalNet.toLocaleString()} ر.س</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="lh-signs c3 lh-avoid">
    <div><div class="lh-sign-line"></div><div class="lh-sign-title">إعداد مسؤول الرواتب</div></div>
    <div><div class="lh-sign-line"></div><div class="lh-sign-title">مراجعة الموارد البشرية</div></div>
    <div><div class="lh-sign-line"></div><div class="lh-sign-title">اعتماد المدير العام التنفيذي</div></div>
  </div>`;

  const html = buildLetterheadDocument({
    title: `كشف مسير رواتب الشهر المجمع - ${month} - ${company.nameAr}`,
    bodyHtml,
    orientation: 'landscape',
    toolbarHtml: '<button class="lh-btn" onclick="window.print()">🖨️ طباعة الكشف المجمع</button>',
  });

  printHtmlViaIframe(html, 'full-payroll-print-iframe');
}
