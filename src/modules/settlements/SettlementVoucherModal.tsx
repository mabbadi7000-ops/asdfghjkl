import React from 'react';
import {
  Printer,
  Download,
  FileText,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { CashSettlementRecord } from '../../types';
import { downloadFile, isImageData } from '../../utils/fileUtils';
import { appendSessionToken } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { BrandLogo } from '../../components/common/BrandLogo';
import { printCashSettlementVoucher } from '../../utils/printDocumentHelpers';

interface SettlementVoucherModalProps {
  settlement: CashSettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementVoucherModal: React.FC<SettlementVoucherModalProps> = ({
  settlement,
  isOpen,
  onClose,
}) => {
  const { t, tx, language } = useLanguage();
  if (!settlement) return null;

  const isMatched = settlement.difference === 0;
  const isDeficit = settlement.difference < 0;

  const paymentMethodLabels: Record<string, string> = {
    cash_handover: tx('تسليم نقدي مباشر (كاش للمشرف)', 'Direct Cash to Supervisor'),
    bank_transfer: tx('تحويل بنكي إلكتروني (إيداع الحساب)', 'Bank Transfer (Deposit)'),
    pos_network: tx('شبكة مدى / نقاط البيع (POS)', 'POS / Mada Network'),
    stc_pay: tx('محفظة رقمية (STC Pay / Urpay)', 'Digital Wallet (STC Pay / Urpay)'),
    deduction_from_salary: tx('خصم من المستحقات / الراتب', 'Deduction from Salary'),
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    approved: { label: tx('معتمد ومصفى نهائياً', 'Approved & Cleared'), color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    pending: { label: tx('بانتظار المراجعة والتدقيق', 'Pending Review'), color: 'bg-amber-100 text-amber-800 border-amber-200' },
    disputed: { label: tx('يوجد عجز قيد التحقيق', 'Disputed Deficit'), color: 'bg-rose-100 text-rose-800 border-rose-200' },
    rejected: { label: tx('مرفوض وغير مطابق', 'Rejected'), color: 'bg-slate-200 text-slate-800 border-slate-300' },
  };

  const handlePrint = () => {
    printCashSettlementVoucher(settlement);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tx(`سند تصفية وقبض كاش رقم #${settlement.settlementNumber}`, `Cash Settlement Voucher #${settlement.settlementNumber}`)}
      subtitle={tx(`تاريخ التصفية: ${settlement.date} • المنصة: ${settlement.platformName || settlement.platformId}`, `Settlement Date: ${settlement.date} • Platform: ${settlement.platformName || settlement.platformId}`)}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Printable Voucher Paper */}
        <div id="settlement-voucher-printable" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-900">
          {/* Voucher Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo size="md" variant="icon" isDark={false} />
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900">{tx('شركة مارشال لوجيستيكس', 'MARSHAL LOGISTIC LLC')}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{tx('س.ت: 7054828277 • الرقم الضريبي: 310298471200003', 'CR: 7054828277 • VAT: 310298471200003')}</p>
                </div>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <span className="inline-block px-3 py-1 text-xs font-black rounded-lg border font-mono bg-slate-50 border-slate-300">
                {settlement.settlementNumber}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {tx('تاريخ السند:', 'Voucher Date:')} <strong>{settlement.date}</strong>
              </p>
            </div>
          </div>

          {/* Status Badge Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">{tx('حالة التصفية:', 'Settlement Status:')}</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${statusLabels[settlement.status]?.color}`}>
                {statusLabels[settlement.status]?.label || settlement.status}
              </span>
            </div>

            <div className="text-xs text-slate-700 flex items-center gap-2">
              <span className="text-slate-500 font-semibold">{tx('المستلم المالي المسجل:', 'Financial Receiver:')}</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {settlement.receivedByName || settlement.recordedByName || 'مشرف العمليات'}
              </span>
              {settlement.receivedByRole && (
                <span className="text-[10px] text-slate-500">
                  ({settlement.receivedByRole === 'admin' ? 'مدير النظام والأمان' : settlement.receivedByRole === 'general_manager' ? 'المدير العام' : 'مشرف العمليات'})
                </span>
              )}
            </div>
          </div>

          {/* Anti-Fraud Cryptographic Guarantee Stamp */}
          <FinancialOperatorBadge
            name={settlement.receivedByName || settlement.recordedByName}
            role={settlement.receivedByRole || settlement.recordedByRole}
            actionTitle={tx('سند قبض وتصفية معتمد - حماية ضد الاحتيال المالي', 'Certified Anti-Fraud Settlement Record')}
            verificationCode={settlement.fraudVerificationCode || `SEC-STL-${settlement.settlementNumber}`}
            variant="stamp"
          />

          {/* Parties & Shift Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{tx('بيانات الكابتن المسلّم', 'Delivering Courier Info')}</span>
              <p className="text-sm font-black text-slate-900">{settlement.driverName || tx('سائق التوصيل', 'Courier Driver')}</p>
              {settlement.driverIqama && (
                <p className="text-slate-600 font-mono text-xs">{tx('رقم الإقامة / الهوية:', 'Iqama / National ID:')} {settlement.driverIqama}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{tx('بيانات المنصة والوردية', 'Platform & Shift Info')}</span>
              <p className="text-sm font-bold text-slate-900">{settlement.platformName || settlement.platformId}</p>
              <p className="text-slate-600 text-xs">
                {tx('الفترة:', 'Period:')} {settlement.shiftPeriod || tx('الوردية التشغيلية', 'Shift')} • {tx('عدد طلبات الكاش:', 'COD Orders:')} <strong>{settlement.ordersCount} {tx('طلب', 'orders')}</strong>
              </p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-start">{tx('البيان المالي', 'Financial Item')}</th>
                  <th className="p-3 text-end">{tx('المبلغ المطلوب بالمنصة (SAR)', 'Expected Target (SAR)')}</th>
                  <th className="p-3 text-end">{tx('المبلغ المستلم فعلياً (SAR)', 'Actual Collected (SAR)')}</th>
                  <th className="p-3 text-end">{tx('الفارق / المطابقة (SAR)', 'Difference / Reconciled (SAR)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="font-mono">
                  <td className="p-3 font-sans font-bold text-slate-800">
                    {tx('كاش طلبات الدفع عند الاستلام (COD)', 'Cash-on-Delivery (COD) Orders')}
                  </td>
                  <td className="p-3 text-end font-bold text-slate-800">
                    {settlement.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('sar')}
                  </td>
                  <td className="p-3 text-end font-black text-emerald-600 text-sm">
                    {settlement.collectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('sar')}
                  </td>
                  <td className="p-3 text-end">
                    {isMatched ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800">
                        0.00 {t('sar')} ({tx('مطابق 100%', '100% Reconciled')})
                      </span>
                    ) : isDeficit ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-100 text-rose-800">
                        {tx('عجز:', 'Deficit:')} {Math.abs(settlement.difference).toLocaleString()} {t('sar')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-100 text-blue-800">
                        {tx('فائض:', 'Surplus:')} +{settlement.difference.toLocaleString()} {t('sar')}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment & Bank Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">{tx('طريقة التوريد والاستلام:', 'Payment & Handover Method:')}</span>
              <strong className="text-slate-900 font-bold">
                {paymentMethodLabels[settlement.paymentMethod] || settlement.paymentMethod}
              </strong>
            </div>
            {settlement.referenceNumber && (
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                <span className="text-slate-500 font-sans">{tx('رقم الحوالة / الإيصال:', 'Transfer Reference / Receipt #:')}</span>
                <strong className="text-slate-800 font-bold">{settlement.referenceNumber}</strong>
              </div>
            )}
            {settlement.bankName && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500">{tx('البنك المحول إليه:', 'Target Bank:')}</span>
                <strong className="text-slate-800">{settlement.bankName}</strong>
              </div>
            )}
          </div>

          {/* Notes */}
          {settlement.notes && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900">
              <span className="font-bold block mb-0.5">{tx('ملاحظات التصفية والتسوية:', 'Settlement Notes:')}</span>
              <span>{settlement.notes}</span>
            </div>
          )}

          {/* Attached Receipt Image */}
          {(settlement.receiptUrl || settlement.receiptDocUrl) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block">{tx('صورة إشعار الإيداع / سند القبض المرفق:', 'Attached Deposit Slip / Voucher Photo:')}</span>
              <div className="max-h-64 rounded-xl overflow-hidden border border-slate-300 bg-white flex items-center justify-center p-2">
                {isImageData(settlement.receiptUrl || settlement.receiptDocUrl) ? (
                  <img
                    src={appendSessionToken(settlement.receiptUrl || settlement.receiptDocUrl || '')}
                    alt={tx('إيصال التصفية', 'Settlement Receipt')}
                    className="max-h-60 object-contain rounded-lg"
                  />
                ) : (
                  <div className="p-4 text-center">
                    <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                    <p className="font-bold text-slate-800">{tx('ملف إشعار إيداع رسمي ممسوح ضوئياً', 'Official Scanned Document')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
            <div className="text-center space-y-4">
              <p className="font-bold text-slate-700">{tx('توقيع وإقرار الكابتن المسلّم', 'Delivering Courier Signature')}</p>
              <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono">
                {settlement.driverName} (إقامة: {settlement.driverIqama || '---'})
              </div>
              <p className="text-[10px] text-slate-400">{tx('أقر بصحة المبالغ الموردة أعلاه دون أي نقص', 'I acknowledge the accuracy of handed over funds')}</p>
            </div>

            <div className="text-center space-y-4">
              <p className="font-bold text-slate-700">{tx('المستلم / المحاسب المالي المسؤول', 'Receiver / Authorized Finance Officer')}</p>
              <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-950">
                {settlement.receivedByName || settlement.recordedByName || 'مشرف العمليات'}
                {settlement.reviewedByName && (
                  <span className="block text-[10px] text-slate-500 font-normal">
                    {tx('اعتماد التدقيق:', 'Audited by:')} {settlement.reviewedByName}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">{tx('ختم واعتماد استلام العهدة والتسوية البنكية', 'Stamp & Official Accounting Approval')}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{tx('طباعة سند التصفية', 'Print Voucher')}</span>
            </button>
            {(settlement.receiptUrl || settlement.receiptDocUrl) && (
              <button
                type="button"
                onClick={() => downloadFile((settlement.receiptUrl || settlement.receiptDocUrl)!, `settlement-${settlement.settlementNumber}-receipt`)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{tx('تحميل الإيصال المرفق', 'Download Receipt')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
