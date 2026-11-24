/**
 * Brand-integrated Document Print Utilities for Marshal Logistics
 * Provides printed documents (Vouchers, Contracts, Payslips) on the approved letterhead paper:
 * - Brand palette sampled from the paper (see brandAssets)
 * - Company legal numbers, official signature lines and the stamp set in system settings
 * - Hidden iframe printing mechanism that works smoothly inside AI Studio and web iframes
 */

import { CashSettlementRecord, FreelancerRental, SupervisorAccountPackage } from '../types';
import { BRAND } from './brandAssets';
import { getExportCompanyInfo, getMarshalOfficialSealMarkup } from './exportUtils';
import { buildLetterheadDocument, getDocTitleBarHtml } from './letterhead';

const VOUCHER_CSS = `
  .label { font-size: 9px; color: #64748b; display: block; }
  .val { font-size: 11px; font-weight: 700; color: #0f172a; }
  .financial-box { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
  .financial-box table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .financial-box th { background: ${BRAND.navy}; color: #ffffff; padding: 8px 10px; text-align: right; }
  .financial-box td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .net-box { background: ${BRAND.navy}; color: #ffffff; padding: 13px 18px; border-radius: 8px; border-bottom: 3px solid ${BRAND.gold}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .terms-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fafafa; margin-bottom: 14px; font-size: 10px; color: #334155; }
  .terms-box ol { padding-right: 18px; margin-top: 6px; }
  .terms-box li { margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; break-inside: avoid; }
  .sign-line { height: 44px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }
`;

/** Resolves once stylesheets, fonts and images (the letterhead artwork) are loaded, so the print preview is complete. */
export async function waitForPrintableAssets(doc: Document, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const assetsReady = () => doc.readyState === 'complete' && Array.from(doc.images).every((image) => image.complete);
  while (!assetsReady() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await Promise.race([doc.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 2000))]).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 150));
}

/**
 * Universal print helper via hidden iframe
 */
export function printHtmlViaIframe(html: string, iframeId = 'marshal-print-iframe'): void {
  try {
    const existing = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      void waitForPrintableAssets(doc).then(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          fallbackWindowPrint(html);
        }
      });
      return;
    }
  } catch (e) {
    console.warn('[printHtmlViaIframe] failed, falling back:', e);
  }

  fallbackWindowPrint(html);
}

function fallbackWindowPrint(html: string) {
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      void waitForPrintableAssets(printWindow.document).then(() => printWindow.print());
      return;
    }
  } catch {}

  // Fallback download as HTML if popups blocked
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marshal-document-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Print Cash Settlement Voucher with strict Marshal brand visual identity
 */
export function printCashSettlementVoucher(settlement: CashSettlementRecord): void {
  const company = getExportCompanyInfo();

  const statusLabel =
    settlement.status === 'approved'
      ? 'معتمد ومصفى نهائياً (Approved)'
      : settlement.status === 'pending'
      ? 'بانتظار المراجعة والتدقيق (Pending Review)'
      : settlement.status === 'disputed'
      ? 'يوجد عجز قيد التحقيق (Disputed)'
      : 'مرفوض (Rejected)';

  const methodLabel: Record<string, string> = {
    cash_office: 'توريد نقدي لخزينة الشركة (مباشر)',
    bank_transfer: 'تحويل بنكي إلكتروني (إيداع الحساب)',
    pos_network: 'شبكة مدى / نقاط البيع (POS)',
    stc_pay: 'محفظة رقمية (STC Pay / Urpay)',
    deduction_from_salary: 'خصم من المستحقات / الراتب',
  };

  const bodyHtml = `
    ${getDocTitleBarHtml({
      title: 'سند تصفية واستلام كاش رسمي معتمد (COD Clearance Voucher)',
      subtitle: 'إدارة العمليات والمالية',
      ref: `#${settlement.settlementNumber}`,
      meta: `تاريخ السند: <strong>${settlement.date}</strong>`,
    })}

    <!-- Info Grid -->
    <div class="lh-grid">
      <div>
        <span class="label">اسم الكابتن</span>
        <span class="val">${settlement.driverName}</span>
      </div>
      <div>
        <span class="label">رقم الإقامة</span>
        <span class="val num">${settlement.driverIqama || '-'}</span>
      </div>
      <div>
        <span class="label">المنصة المستهدفة</span>
        <span class="val">${settlement.platformName || settlement.platformId}</span>
      </div>
      <div>
        <span class="label">حالة السند</span>
        <span class="val" style="color: #047857;">${statusLabel}</span>
      </div>
    </div>

    <!-- Financial Table -->
    <div class="financial-box">
      <table>
        <thead>
          <tr>
            <th>بيان المحاسبة</th>
            <th>القيمة المالية (ر.س)</th>
            <th>طريقة التسوية / السداد</th>
            <th>مرجع العملية البنكية</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>المبلغ المطلوب تسويته (الطلبات المحصلة)</strong></td>
            <td class="num">${Number(settlement.expectedAmount || 0).toLocaleString()} ر.س</td>
            <td>مطابقة تقرير المنصة</td>
            <td class="num">${settlement.referenceNumber || settlement.platformId || '-'}</td>
          </tr>
          <tr>
            <td><strong>المبلغ الفعلي المستلم والمورد للشركة</strong></td>
            <td class="num" style="color: #047857; font-size: 13px;">${Number(settlement.collectedAmount || 0).toLocaleString()} ر.س</td>
            <td>${methodLabel[settlement.paymentMethod] || settlement.paymentMethod || 'نقدي'}</td>
            <td class="num">${settlement.referenceNumber || '-'}</td>
          </tr>
          <tr>
            <td><strong>فارق التصفية (الفائض / العجز)</strong></td>
            <td class="num" style="color: ${Number(settlement.difference || 0) < 0 ? '#e11d48' : '#047857'};">
              ${Number(settlement.difference || 0).toLocaleString()} ر.س
              ${Number(settlement.difference || 0) < 0 ? '(عجز مسجل)' : Number(settlement.difference || 0) > 0 ? '(فائض)' : '(مطابق تماماً)'}
            </td>
            <td colspan="2">${settlement.notes || 'تمت المطابقة والتدقيق بواسطة مسؤول العمليات'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div class="net-box">
      <div>
        <span style="font-size: 10px; color: #94a3b8; display: block;">المبلغ الصافي المورد للشركة</span>
        <strong style="font-size: 14px;">تم الإيداع بحساب الشركة والتوثيق بالنظام</strong>
      </div>
      <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #fbbf24;">
        ${Number(settlement.collectedAmount || 0).toLocaleString()} ر.س
      </div>
    </div>

    <!-- Verification Notes -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 10px; color: #475569;">
      <strong>إقرار وملاحظات:</strong>
      يقر المسؤول المالي والمستلم بأن هذا السند يمثل المبلغ الفعلي المستلم من الكابتن المذكور عن طلبات المنصة المحددة، وتم قيد المبلغ في الدفاتر المحاسبية لشركة مارشال لوجستيكس.
    </div>

    <!-- Signatures & Official Stamp -->
    <div class="signatures">
      <div>
        <p style="font-weight: 700; color: #475569;">توقيع الكابتن المسلّم</p>
        <div class="sign-line"></div>
        <p style="font-size: 10px; color: #64748b;">${settlement.driverName}</p>
      </div>
      <div>
        ${getMarshalOfficialSealMarkup({
          size: 92,
          labelAr: company.stampTextAr,
          labelEn: company.stampTextEn,
          crNumber: company.crNumber,
        })}
        <p style="font-size: 9px; color: ${BRAND.goldDark}; font-weight: 700; margin-top: 4px;">الختم المالي الرسمي</p>
      </div>
      <div>
        <p style="font-weight: 700; color: #475569;">المسؤول المالي المعتمد</p>
        <div class="sign-line"></div>
        <p style="font-size: 10px; color: #64748b;">${settlement.receivedByName || settlement.recordedByName || 'مشرف العمليات'}</p>
      </div>
    </div>`;

  const html = buildLetterheadDocument({
    title: `سند تصفية وقبض كاش #${settlement.settlementNumber} - ${company.nameAr}`,
    bodyHtml,
    extraCss: VOUCHER_CSS,
    toolbarHtml: '<button class="lh-btn" onclick="window.print()">🖨️ طباعة سند التصفية (Ctrl + P)</button>',
  });

  printHtmlViaIframe(html, 'settlement-voucher-iframe');
}

/**
 * Print Freelancer Rental Agreement & Voucher with Marshal brand visual identity
 */
export function printFreelancerRentalVoucher(
  rental?: FreelancerRental | null,
  pkg?: SupervisorAccountPackage | null
): void {
  const company = getExportCompanyInfo();

  const isSupervisor = !!pkg;
  const voucherNum = isSupervisor ? pkg.packageNumber : rental?.rentalNumber || 'VOUCHER-01';
  const partyName = isSupervisor ? pkg.supervisorName : rental?.driverName || 'الكابتن المستأجر';
  const partyId = isSupervisor ? (pkg.supervisorPhone || pkg.supervisorId) : rental?.driverIqama || '-';
  const rate = isSupervisor ? pkg.totalWholesaleDue : rental?.rentAmount || 0;
  const accountsCount = isSupervisor ? pkg.accountIds?.length || 0 : 1;

  const bodyHtml = `
    ${getDocTitleBarHtml({
      title: isSupervisor ? 'سند واتفاقية تسليم حزمة يوزرات للمشرف' : 'عقد وسند تأجير حساب منصات توصيل فريلانسر',
      subtitle: 'قسم عقود التأجير والفريلانسرز',
      ref: `#${voucherNum}`,
      meta: `تاريخ التحرير: <strong>${new Date().toLocaleDateString('ar-SA')}</strong>`,
    })}

    <!-- Info Grid -->
    <div class="lh-grid">
      <div>
        <span class="label">${isSupervisor ? 'اسم المشرف المسؤول' : 'اسم الكابتن المستأجر'}</span>
        <span class="val">${partyName}</span>
      </div>
      <div>
        <span class="label">رقم الهوية / الإقامة</span>
        <span class="val num">${partyId}</span>
      </div>
      <div>
        <span class="label">عدد الحسابات المؤجرة</span>
        <span class="val num">${accountsCount} حساب</span>
      </div>
      <div>
        <span class="label">المقابل الشهري المتفق عليه</span>
        <span class="val num" style="color: #047857; font-size: 12px;">${Number(rate).toLocaleString()} ر.س / شهرياً</span>
      </div>
    </div>

    <!-- Contract Terms -->
    <div class="terms-box">
      <strong>البنود والشروط النظامية:</strong>
      <ol>
        <li>يلتزم الطرف الثاني بالمحافظة على الحسابات المسلمة له واستخدامها حصراً في تنفيذ طلبات التوصيل النظامية.</li>
        <li>سداد القيمة الإيجارية الشهرية في موعد أقصاه اليوم الخامس من كل شهر ميلادي وفق قنوات الدفع المعتمدة.</li>
        <li>الالتزام التام بكافة لوائح الهيئة العامة للنقل والأنظمة المرورية السارية بالمملكة العربية السعودية.</li>
        <li>يحظر التنازل عن الحساب أو تأجيره للغير من الباطن تحت طائلة المساءلة القانونية وإلغاء العقد فوراً.</li>
      </ol>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div>
        <p style="font-weight: 700; color: #475569;">توقيع الطرف الثاني (المستأجر)</p>
        <div class="sign-line"></div>
        <p style="font-size: 10px; color: #64748b;">${partyName}</p>
      </div>
      <div>
        ${getMarshalOfficialSealMarkup({
          size: 92,
          labelAr: company.stampTextAr,
          labelEn: company.stampTextEn,
          crNumber: company.crNumber,
        })}
        <p style="font-size: 9px; color: ${BRAND.goldDark}; font-weight: 700; margin-top: 4px;">الختم الرسمي للمؤسسة</p>
      </div>
      <div>
        <p style="font-weight: 700; color: #475569;">المسؤول المالي المعتمد</p>
        <div class="sign-line"></div>
        <p style="font-size: 10px; color: #64748b;">إدارة العمليات والتأجير</p>
      </div>
    </div>`;

  const html = buildLetterheadDocument({
    title: `عقد وسند تأجير حسابات #${voucherNum} - ${company.nameAr}`,
    bodyHtml,
    extraCss: VOUCHER_CSS,
    toolbarHtml: '<button class="lh-btn" onclick="window.print()">🖨️ طباعة العقد والسند (Ctrl + P)</button>',
  });

  printHtmlViaIframe(html, 'freelancer-voucher-iframe');
}
