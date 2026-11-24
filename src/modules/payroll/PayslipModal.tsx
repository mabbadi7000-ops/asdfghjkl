import React from 'react';
import {
  Printer,
  Download,
  Building,
  User,
  Calendar,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Fuel,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { BrandLogo } from '../../components/common/BrandLogo';
import { DriverPayrollRecord } from '../../types';
import { printPayslipDocument, downloadPayslipHtml } from '../../utils/printPayslip';

interface PayslipModalProps {
  payroll: DriverPayrollRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  payroll,
  isOpen,
  onClose,
}) => {
  if (!payroll) return null;

  const handlePrint = () => {
    printPayslipDocument(payroll);
  };

  const handleDownload = () => {
    downloadPayslipHtml(payroll);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    paid: { label: 'تم الصرف والتحويل البنكي', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    approved: { label: 'معتمد وجاهز للصرف', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    reviewed: { label: 'تم التدقيق', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    draft: { label: 'مسودة قيد الإعداد', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const paymentMethodLabels: Record<string, string> = {
    wps_bank: 'نظام حماية الأجور (WPS البنكي)',
    bank_transfer: 'تحويل سريع للآيبان البنكي',
    cash: 'صرف نقدي رسمي (سند قبض)',
    cheque: 'شيك بنكي معتمد',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`مسير راتب ومستحقات الكابتن: ${payroll.driverName}`}
      subtitle={`رقم المسير: #${payroll.payrollNumber} • شهر الاستحقاق: ${payroll.month}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Printable Payslip Sheet */}
        <div id="payslip-printable-sheet" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" variant="icon" isDark={false} />
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900">شركة مارشال لوجيستيكس</h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  إدارة الموارد البشرية والرواتب • س.ت: 7054828277 • نظام حماية الأجور (WPS)
                </p>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <span className="inline-block px-3 py-1 text-xs font-black rounded-lg border font-mono bg-slate-50 border-slate-300">
                {payroll.payrollNumber}
              </span>
              <p className="text-[11px] text-slate-600 mt-1 font-bold">
                مسير رواتب شهر: <strong className="font-mono text-slate-900">{payroll.month}</strong>
              </p>
            </div>
          </div>

          {/* Driver & Banking Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">الكابتن</span>
              <strong className="text-slate-900">{payroll.driverName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">رقم الإقامة / الهوية</span>
              <strong className="font-mono text-slate-900">{payroll.driverIqama}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">المنصة المشغلة</span>
              <strong className="text-slate-900">{payroll.platformName || 'أسطول عام'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">حالة المسير</span>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusLabels[payroll.status]?.color}`}>
                {statusLabels[payroll.status]?.label || payroll.status}
              </span>
            </div>

            {payroll.bankIban && (
              <div className="col-span-2 pt-2 border-t border-slate-200/80 font-mono text-[11px]">
                <span className="text-slate-400 block text-[10px] font-sans">الآيبان البنكي (IBAN):</span>
                <strong className="text-slate-800">{payroll.bankIban} ({payroll.bankName || 'البنك'})</strong>
              </div>
            )}
            {payroll.paymentDate && (
              <div className="col-span-2 pt-2 border-t border-slate-200/80 text-[11px]">
                <span className="text-slate-400 block text-[10px]">تاريخ الصرف والمرجع:</span>
                <strong className="text-slate-800 font-mono">{payroll.paymentDate} • {payroll.paymentReference || 'تحويل مباشر'}</strong>
              </div>
            )}
          </div>

          {/* Anti-Fraud Security Guarantee Stamp */}
          <FinancialOperatorBadge
            name={payroll.status === 'paid' && payroll.disbursedByName ? payroll.disbursedByName : payroll.preparedByName}
            role={payroll.status === 'paid' && payroll.disbursedByRole ? payroll.disbursedByRole : payroll.preparedByRole}
            actionTitle={payroll.status === 'paid' ? 'مسير رواتب معتمد ومصروف بنكياً' : 'مسير رواتب معتمد وموثق'}
            verificationCode={payroll.fraudVerificationCode || `SEC-PAY-${payroll.payrollNumber}`}
            variant="stamp"
          />

          {/* Main Financial Tables: Earnings vs Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* EARNINGS TABLE */}
            <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/20">
              <div className="p-3 bg-emerald-100/60 border-b border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  <span>الاستحقاقات والبدلات (Earnings)</span>
                </span>
                <span className="font-mono font-black">{payroll.grossEarnings.toLocaleString()} ر.س</span>
              </div>

              <table className="w-full text-xs divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 text-slate-700">الراتب الأساسي</td>
                    <td className="p-2.5 text-end font-mono font-bold text-slate-900">
                      {payroll.basicSalary.toLocaleString()} ر.س
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-700">
                      عدد الطلبات المنفذة
                    </td>
                    <td className="p-2.5 text-end font-mono font-bold text-slate-900">
                      {payroll.deliveriesCount} طلب {payroll.commissionRatePerOrder ? `(${payroll.commissionRatePerOrder} ر.س/طلب)` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-700">إجمالي عمولة الطلبات</td>
                    <td className="p-2.5 text-end font-mono font-bold text-emerald-700">
                      {payroll.deliveryCommissions.toLocaleString()} ر.س
                    </td>
                  </tr>
                  {payroll.bonuses > 0 && (
                    <tr>
                      <td className="p-2.5 text-slate-700">المكافآت والحوافز الإضافية</td>
                      <td className="p-2.5 text-end font-mono font-bold text-emerald-700">
                        +{payroll.bonuses.toLocaleString()} ر.س
                      </td>
                    </tr>
                  )}
                  <tr className="bg-emerald-100/40 font-bold border-t border-emerald-200">
                    <td className="p-3 text-emerald-900">إجمالي الاستحقاقات (Gross)</td>
                    <td className="p-3 text-end font-mono font-black text-emerald-900 text-sm">
                      {payroll.grossEarnings.toLocaleString()} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DEDUCTIONS TABLE */}
            <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20">
              <div className="p-3 bg-rose-100/60 border-b border-rose-200 flex items-center justify-between text-xs font-bold text-rose-950">
                <span className="flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-rose-700" />
                  <span>الاستقطاعات والخصومات (Deductions)</span>
                </span>
                <span className="font-mono font-black">-{payroll.totalDeductions.toLocaleString()} ر.س</span>
              </div>

              <table className="w-full text-xs divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 text-slate-700 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                      <span>قسط السلفة المالية</span>
                    </td>
                    <td className="p-2.5 text-end font-mono font-bold text-rose-600">
                      {payroll.advanceDeduction > 0 ? `-${payroll.advanceDeduction.toLocaleString()} ر.س` : '0.00 ر.س'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-700 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-amber-600" />
                      <span>عجز تصفية الكاش والعهد (COD)</span>
                    </td>
                    <td className="p-2.5 text-end font-mono font-bold text-rose-600">
                      {payroll.cashShortageDeduction > 0 ? `-${payroll.cashShortageDeduction.toLocaleString()} ر.س` : '0.00 ر.س'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-700 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>المخالفات المرورية المسجلة</span>
                    </td>
                    <td className="p-2.5 text-end font-mono font-bold text-rose-600">
                      {payroll.violationDeduction > 0 ? `-${payroll.violationDeduction.toLocaleString()} ر.س` : '0.00 ر.س'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-700 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-blue-600" />
                      <span>خصم تجاوز استهلاك الوقود</span>
                    </td>
                    <td className="p-2.5 text-end font-mono font-bold text-rose-600">
                      {payroll.fuelExcessDeduction > 0 ? `-${payroll.fuelExcessDeduction.toLocaleString()} ر.س` : '0.00 ر.س'}
                    </td>
                  </tr>
                  {payroll.absenceDeduction > 0 && (
                    <tr>
                      <td className="p-2.5 text-slate-700">خصم الغياب والتأخير</td>
                      <td className="p-2.5 text-end font-mono font-bold text-rose-600">
                        -{payroll.absenceDeduction.toLocaleString()} ر.س
                      </td>
                    </tr>
                  )}
                  <tr className="bg-rose-100/40 font-bold border-t border-rose-200">
                    <td className="p-3 text-rose-900">إجمالي الاستقطاعات</td>
                    <td className="p-3 text-end font-mono font-black text-rose-900 text-sm">
                      -{payroll.totalDeductions.toLocaleString()} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* NET PAYABLE BANNER */}
          <div className="p-4 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-300 font-bold block">صافي الراتب المستحق للصرف (Net Payable)</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                إجمالي الاستحقاقات ({payroll.grossEarnings.toLocaleString()}) - إجمالي الاستقطاعات ({payroll.totalDeductions.toLocaleString()})
              </p>
            </div>

            <div className="text-center sm:text-end">
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {payroll.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
              </span>
              <p className="text-[10px] text-slate-300 mt-0.5">
                طريقة الصرف: {payroll.paymentMethod ? paymentMethodLabels[payroll.paymentMethod] : 'تحويل بنكي رسمي'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {payroll.notes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900">
              <span className="font-bold block mb-0.5">ملاحظات مسير الراتب:</span>
              <span>{payroll.notes}</span>
            </div>
          )}
          {payroll.paymentReceiptUrl && (
            <div className="col-span-2 pt-2 border-t border-slate-200/80 text-[11px]">
              <span className="text-slate-400 block text-[10px]">إيصال التحويل البنكي / سند الصرف:</span>
              <a href={payroll.paymentReceiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">
                معاينة أو تحميل الإيصال
              </a>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
            <div className="text-center space-y-3">
              <p className="font-bold text-slate-700">توقيع وإقرار الكابتن بالاستلام</p>
              <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold">
                {payroll.driverName} (إقامة: {payroll.driverIqama})
              </div>
              <p className="text-[10px] text-slate-400">أقر باستلام كافة مستحقاتي الشهرية الموضحة أعلاه</p>
            </div>

            <div className="text-center space-y-3">
              <p className="font-bold text-slate-700">اعتماد الإدارة المالية والصرف البنكي</p>
              <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-950">
                <span>المعد: {payroll.preparedByName || 'مسؤول الرواتب'}</span>
                {payroll.approvedByName && (
                  <span className="block text-[10px] text-emerald-800 font-normal mt-0.5">
                    المعتمد: {payroll.approvedByName} {payroll.disbursedByName ? `• الصرف: ${payroll.disbursedByName}` : ''}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">سجل مالي رسمي معتمد وموثق لمنع الاحتيال</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مسير الراتب</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نسخة الطباعة (HTML)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};
