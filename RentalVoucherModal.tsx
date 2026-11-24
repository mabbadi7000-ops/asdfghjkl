import React from 'react';
import {
  Printer,
  Download,
  KeyRound,
  ShieldCheck,
  Building,
  User,
  Calendar,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { BrandLogo } from '../../components/common/BrandLogo';
import { FreelancerRental, SupervisorAccountPackage } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { printFreelancerRentalVoucher } from '../../utils/printDocumentHelpers';

interface RentalVoucherModalProps {
  rental?: FreelancerRental | null;
  pkg?: SupervisorAccountPackage | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RentalVoucherModal: React.FC<RentalVoucherModalProps> = ({
  rental,
  pkg,
  isOpen,
  onClose,
}) => {
  const { tx, t } = useLanguage();

  if (!rental && !pkg) return null;

  const handlePrint = () => {
    printFreelancerRentalVoucher(rental, pkg);
  };

  const isSupervisorPackage = !!pkg;
  const voucherNumber = isSupervisorPackage ? pkg.packageNumber : rental!.rentalNumber;
  const title = isSupervisorPackage
    ? `سند واتفاقية تسليم حزمة يوزرات للمشرف #${pkg.packageNumber}`
    : `عقد وسند تأجير حساب فريلانسر #${rental!.rentalNumber}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={tx('مستند رسمي معتمد وموثق بهوية المسؤول المالي لمنع الاحتيال', 'Official certified lease and accounting voucher')}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Printable Paper */}
        <div id="rental-voucher-printable" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" variant="icon" isDark={false} />
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  {tx('شركة مارشال لوجيستيكس', 'MARSHAL LOGISTIC LLC')}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  {tx('إدارة الحسابات المؤجرة وعقود الفريلانسر • س.ت: 7054828277 • الرقم الضريبي: 310298471200003', 'Freelancers & Rented Accounts Division • CR: 7054828277')}
                </p>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <span className="inline-block px-3 py-1 text-xs font-black rounded-lg border font-mono bg-slate-50 border-slate-300">
                {voucherNumber}
              </span>
              <p className="text-[11px] text-slate-600 mt-1">
                {tx('تاريخ الإصدار:', 'Issue Date:')} <strong className="font-mono">{isSupervisorPackage ? pkg.startDate : rental!.startDate}</strong>
              </p>
            </div>
          </div>

          {/* Anti-Fraud Security Guarantee Stamp */}
          <FinancialOperatorBadge
            name={isSupervisorPackage ? pkg.managedByName : rental!.assignedByName}
            role={isSupervisorPackage ? pkg.managedByRole : rental!.assignedByRole}
            actionTitle={tx('عقد تأجير معتمد وموثق رقمياً ضد الاحتيال', 'Certified Rented Account Lease & Audit Trace')}
            verificationCode={isSupervisorPackage ? pkg.fraudVerificationCode : rental!.fraudVerificationCode}
            variant="stamp"
          />

          {/* Party Details */}
          {isSupervisorPackage ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{tx('بيانات المشرف الميداني المستلم', 'Field Supervisor Info')}</span>
                <p className="text-sm font-black text-slate-900">{pkg.supervisorName}</p>
                <p className="text-slate-600 font-mono text-xs">{tx('رقم الجوال:', 'Phone:')} {pkg.supervisorPhone}</p>
                <p className="text-slate-500 text-[11px]">{tx('صلاحية الإدارة والتأجير الميداني لكامل كوتة الحزمة', 'Field distribution authorized')}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{tx('بيانات الحزمة والكوتة', 'Package & Quota Info')}</span>
                <p className="text-sm font-bold text-slate-900">{pkg.packageName}</p>
                <p className="text-slate-600 text-xs">
                  {tx('المنصة:', 'Platform:')} <strong>{pkg.platformName}</strong> • {tx('عدد الحسابات:', 'Quota:')} <strong className="text-indigo-600">{pkg.accountsCount} {tx('حساب', 'accounts')}</strong>
                </p>
                <p className="text-slate-500 text-[11px] font-mono">
                  {tx('فترة الحزمة:', 'Period:')} {pkg.startDate} → {pkg.endDate}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{tx('بيانات الكابتن المستأجر (فريلانسر)', 'Freelance Courier Info')}</span>
                <p className="text-sm font-black text-slate-900">{rental!.driverName}</p>
                <p className="text-slate-600 font-mono text-xs">{tx('رقم الإقامة / الهوية:', 'Iqama / ID:')} {rental!.driverIqama}</p>
                <p className="text-slate-600 font-mono text-xs">{tx('الجوال:', 'Phone:')} {rental!.driverPhone}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{tx('بيانات الحساب المؤجر', 'Rented Account Info')}</span>
                <p className="text-sm font-bold text-slate-900">{rental!.platformName} • {rental!.accountCode}</p>
                <p className="text-slate-600 text-xs">
                  {tx('دورة السداد:', 'Billing Cycle:')} <strong>{rental!.billingCycle === 'monthly' ? 'شهري' : rental!.billingCycle === 'weekly' ? 'أسبوعي' : 'يومي'}</strong>
                </p>
                <p className="text-slate-500 text-[11px] font-mono">
                  {tx('تاريخ بدء العقد:', 'Start Date:')} {rental!.startDate}
                </p>
              </div>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-start">{tx('البيان المالي / البند', 'Financial Item')}</th>
                  <th className="p-3 text-end">{tx('المبلغ الإجمالي (SAR)', 'Gross Target (SAR)')}</th>
                  <th className="p-3 text-end">{tx('المسدد حتى الآن (SAR)', 'Paid So Far (SAR)')}</th>
                  <th className="p-3 text-end">{tx('الرصيد المتبقي (SAR)', 'Balance Due (SAR)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {isSupervisorPackage ? (
                  <>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-800">
                        {tx('إجمالي قيمة حزمة الحسابات بالجملة', 'Total Wholesale Package Amount')} ({pkg.accountsCount} × {pkg.wholesaleRatePerAccount} ر.س)
                      </td>
                      <td className="p-3 text-end font-bold text-slate-800">{pkg.totalWholesaleDue.toLocaleString()} {t('sar')}</td>
                      <td className="p-3 text-end font-bold text-emerald-600">{(pkg.totalCollectedFromSupervisor || 0).toLocaleString()} {t('sar')}</td>
                      <td className="p-3 text-end font-black text-rose-600">{pkg.supervisorBalanceDue.toLocaleString()} {t('sar')}</td>
                    </tr>
                    <tr className="bg-slate-50 font-sans text-slate-600">
                      <td className="p-2.5 font-bold">{tx('هامش ربح المشرف التقديري من التأجير بالقطاعي', 'Estimated Supervisor Margin')}</td>
                      <td colSpan={3} className="p-2.5 text-end font-mono font-black text-indigo-700">
                        +{pkg.supervisorMarginEstimate.toLocaleString()} {t('sar')} ({tx('سعر مقترح:', 'Suggested:')} {pkg.suggestedRetailRate} ر.س/حساب)
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-800">
                        {tx('رسوم إيجار الحساب', 'Account Rental Fee')} ({rental!.billingCycle})
                      </td>
                      <td className="p-3 text-end font-bold text-slate-800">{rental!.rentAmount.toLocaleString()} {t('sar')}</td>
                      <td className="p-3 text-end font-bold text-emerald-600">{rental!.totalPaid.toLocaleString()} {t('sar')}</td>
                      <td className="p-3 text-end font-black text-rose-600">{rental!.balanceDue.toLocaleString()} {t('sar')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans text-slate-700">{tx('مبلغ التأمين المسترد (Security Deposit)', 'Refundable Deposit')}</td>
                      <td className="p-3 text-end font-bold text-amber-700">{rental!.securityDeposit.toLocaleString()} {t('sar')}</td>
                      <td className="p-3 text-end text-slate-500 font-sans">{rental!.depositStatus === 'held' ? 'محتجز لدى الشركة' : 'مسترد'}</td>
                      <td className="p-3 text-end text-slate-400 font-sans">---</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes & Legal Condition */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <strong className="text-slate-800 block">{tx('شروط والتزامات الاستخدام:', 'Terms & Operational Conditions:')}</strong>
            <p>• {tx('يلتزم المستأجر/المشرف بالحفاظ على سلامة الحساب والشريحة وعدم استخدام الحساب في أنشطة مخالفة لأنظمة هيئة النقل.', 'Tenant is fully responsible for account compliance with transport regulations.')}</p>
            <p>• {tx('يتم إيقاف الحساب فوراً في حال التأخر عن سداد الدفعات الدورية في مواعيد استحقاقها المحددة أعلاه.', 'Account is subject to immediate suspension upon payment default.')}</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
            <div className="text-center space-y-3">
              <p className="font-bold text-slate-700">{isSupervisorPackage ? tx('توقيع وإقرار المشرف الميداني', 'Supervisor Signature') : tx('توقيع وإقرار الكابتن المستأجر', 'Courier Signature')}</p>
              <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold">
                {isSupervisorPackage ? pkg.supervisorName : rental!.driverName}
              </div>
              <p className="text-[10px] text-slate-400">{tx('أقر باستلام الحساب والشريحة والالتزام بالسداد', 'I acknowledge receipt of credentials and terms')}</p>
            </div>

            <div className="text-center space-y-3">
              <p className="font-bold text-slate-700">{tx('اعتماد إدارة الحسابات المؤجرة / المالية', 'Rented Accounts Division Approval')}</p>
              <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-950">
                {isSupervisorPackage ? pkg.managedByName : rental!.assignedByName || 'إدارة العمليات'}
              </div>
              <p className="text-[10px] text-slate-400">{tx('ختم واعتماد تسليم العهدة الرقمية', 'Certified Digital Handover Stamp')}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{tx('طباعة السند والعقد', 'Print Contract & Voucher')}</span>
          </button>

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
