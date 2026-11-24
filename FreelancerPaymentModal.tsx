import React, { useState, useEffect } from 'react';
import {
  Banknote,
  User,
  Calendar,
  CreditCard,
  Building,
  Receipt,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  FreelancerPayment,
  FreelancerRental,
  SupervisorAccountPackage,
  FreelancerPaymentMethod,
} from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface FreelancerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: Partial<FreelancerPayment>) => Promise<void>;
  preselectedRentalId?: string;
  preselectedPackageId?: string;
}

export const FreelancerPaymentModal: React.FC<FreelancerPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedRentalId,
  preselectedPackageId,
}) => {
  const { tx } = useLanguage();
  const { currentUser } = useAuth();

  const [rentals, setRentals] = useState<FreelancerRental[]>([]);
  const [packages, setPackages] = useState<SupervisorAccountPackage[]>([]);

  const [payerType, setPayerType] = useState<'freelancer_driver' | 'field_supervisor'>(
    preselectedPackageId ? 'field_supervisor' : 'freelancer_driver'
  );
  const [rentalId, setRentalId] = useState(preselectedRentalId || '');
  const [packageId, setPackageId] = useState(preselectedPackageId || '');
  const [amount, setAmount] = useState<number>(850);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<FreelancerPaymentMethod>('bank_transfer');
  const [bankName, setBankName] = useState('مصرف الراجحي');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const [rList, pList] = await Promise.all([
        fetchCollection<FreelancerRental>('freelancer_rentals'),
        fetchCollection<SupervisorAccountPackage>('supervisor_account_packages'),
      ]);
      setRentals(rList);
      setPackages(pList);

      if (preselectedRentalId) {
        setRentalId(preselectedRentalId);
        setPayerType('freelancer_driver');
        const r = rList.find((item) => item.id === preselectedRentalId);
        if (r) setAmount(r.balanceDue > 0 ? r.balanceDue : r.rentAmount);
      } else if (preselectedPackageId) {
        setPackageId(preselectedPackageId);
        setPayerType('field_supervisor');
        const p = pList.find((item) => item.id === preselectedPackageId);
        if (p) setAmount(p.supervisorBalanceDue > 0 ? p.supervisorBalanceDue : p.totalWholesaleDue);
      } else if (rList.length > 0 && !rentalId) {
        setRentalId(rList[0].id);
        setAmount(rList[0].rentAmount);
      }
    }
    loadMeta();
  }, [isOpen, preselectedRentalId, preselectedPackageId]);

  const handleRentalSelect = (rId: string) => {
    setRentalId(rId);
    const r = rentals.find((item) => item.id === rId);
    if (r) {
      setAmount(r.balanceDue > 0 ? r.balanceDue : r.rentAmount);
    }
  };

  const handlePackageSelect = (pkgId: string) => {
    setPackageId(pkgId);
    const p = packages.find((item) => item.id === pkgId);
    if (p) {
      setAmount(p.supervisorBalanceDue > 0 ? p.supervisorBalanceDue : p.totalWholesaleDue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const payNum = `RCP-RNT-${new Date().getFullYear()}-${randomSuffix}`;
    const fraudCode = `SEC-RCP-${Math.floor(100000 + Math.random() * 900000)}`;

    let payerName = '';
    let payerId = '';
    let payerPhone = '';
    let payerIqama = '';
    let selectedRentalNumber = '';
    let selectedPackageNumber = '';

    if (payerType === 'freelancer_driver') {
      const selRental = rentals.find((r) => r.id === rentalId);
      payerName = selRental?.driverName || 'كابتن فريلانسر';
      payerId = selRental?.driverId || 'drv';
      payerPhone = selRental?.driverPhone || '';
      payerIqama = selRental?.driverIqama || '';
      selectedRentalNumber = selRental?.rentalNumber || '';
    } else {
      const selPkg = packages.find((p) => p.id === packageId);
      payerName = selPkg?.supervisorName || 'مشرف ميداني';
      payerId = selPkg?.supervisorId || 'sup';
      payerPhone = selPkg?.supervisorPhone || '';
      selectedPackageNumber = selPkg?.packageNumber || '';
    }

    await onSubmit({
      paymentNumber: payNum,
      rentalId: payerType === 'freelancer_driver' ? rentalId : undefined,
      rentalNumber: payerType === 'freelancer_driver' ? selectedRentalNumber : undefined,
      packageId: payerType === 'field_supervisor' ? packageId : undefined,
      packageNumber: payerType === 'field_supervisor' ? selectedPackageNumber : undefined,
      payerType,
      payerId,
      payerName,
      payerPhone,
      payerIqama,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      bankName: paymentMethod === 'bank_transfer' || paymentMethod === 'pos_network' ? bankName : undefined,
      referenceNumber: referenceNumber || undefined,
      receivedById: currentUser?.id || 'sys',
      receivedByName: currentUser?.fullName || 'المسؤول المالي',
      receivedByRole: currentUser?.role || 'operations_manager',
      fraudVerificationCode: fraudCode,
      notes,
    });

    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tx('تسجيل سند قبض وتحصيل إيجار حساب', 'Record Rent Payment Receipt')}
      subtitle={tx('توثيق استلام رسوم إيجار الحسابات من الكباتن الفريلانسر أو المشرفين الميدانيين', 'Collect and record rented account fees with verified digital audit')}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription={tx('يتم ربط سند القبض بهوية المستلم لمنع الاحتيال وضمان إيداع مبالغ الإيجار في حساب الشركة.', 'Rent payment receipt is cryptographically bound to the receiver.')}
        />

        {/* Payer Type Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setPayerType('freelancer_driver')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              payerType === 'freelancer_driver'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tx('تحصيل من كابتن فريلانسر (تأجير مباشر)', 'Direct Freelance Courier')}
          </button>
          <button
            type="button"
            onClick={() => setPayerType('field_supervisor')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              payerType === 'field_supervisor'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tx('تحصيل من مشرف ميداني (حزمة يوزرات)', 'Field Supervisor (Wholesale Package)')}
          </button>
        </div>

        {payerType === 'freelancer_driver' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('عقد تأجير الكابتن *', 'Target Rental Contract *')}</label>
            <select
              required
              value={rentalId}
              onChange={(e) => handleRentalSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="">{tx('اختر عقد التأجير...', 'Select rental...')}</option>
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rentalNumber} • {r.driverName} ({r.platformName} - {r.accountCode}) • متبقي: {r.balanceDue} ر.س
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('حزمة المشرف الميداني *', 'Target Supervisor Package *')}</label>
            <select
              required
              value={packageId}
              onChange={(e) => handlePackageSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="">{tx('اختر حزمة المشرف...', 'Select package...')}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageNumber} • {p.packageName} ({p.supervisorName}) • متبقي: {p.supervisorBalanceDue} ر.س
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('المبلغ المحصل فعلياً (SAR) *', 'Collected Amount (SAR) *')}</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-700 focus:bg-white outline-hidden"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ التحصيل والاستلام *', 'Collection Date *')}</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('طريقة السداد *', 'Payment Method *')}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as FreelancerPaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
            >
              <option value="bank_transfer">{tx('تحويل بنكي إلكتروني', 'Bank Transfer')}</option>
              <option value="pos_network">{tx('شبكة مدى / نقاط البيع', 'Mada POS')}</option>
              <option value="stc_pay">{tx('محفظة STC Pay / Urpay', 'STC Pay / Urpay')}</option>
              <option value="cash">{tx('تسليم نقدي مباشر (كاش)', 'Direct Cash')}</option>
            </select>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('البنك المودع فيه', 'Target Bank')}</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. مصرف الراجحي"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          {/* Reference # */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('رقم الحوالة / الإيصال', 'Transfer Ref #')}</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TRX-889102"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('ملاحظات السداد والتسوية', 'Payment Notes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tx('سداد دفعة إيجار حساب منصة جاهز لشهر أكتوبر...', 'Notes...')}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {tx('إلغاء', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {loading ? tx('جارٍ التوثيق...', 'Processing...') : tx('إصدار سند القبض وتحديث الرصيد', 'Issue Receipt & Update Balance')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
