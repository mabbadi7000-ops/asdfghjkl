import React, { useState, useEffect } from 'react';
import {
  Banknote,
  User,
  Layers,
  Calendar,
  CreditCard,
  Building,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  CashSettlementRecord,
  SettlementStatus,
  SettlementPaymentMethod,
  Driver,
  PlatformContract,
} from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface CashSettlementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settlementData: Partial<CashSettlementRecord>) => Promise<void>;
  initialData?: CashSettlementRecord | null;
  defaultDriverId?: string;
}

export const CashSettlementFormModal: React.FC<CashSettlementFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultDriverId,
}) => {
  const { t, tx, language } = useLanguage();
  const { currentUser } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  // Form Fields
  const [driverId, setDriverId] = useState(defaultDriverId || '');
  const [platformId, setPlatformId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftPeriod, setShiftPeriod] = useState('وردية المساء (العشاء)');
  const [ordersCount, setOrdersCount] = useState<number>(15);
  const [expectedAmount, setExpectedAmount] = useState<number>(500);
  const [collectedAmount, setCollectedAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<SettlementPaymentMethod>('cash_handover');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('مصرف الراجحي');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [status, setStatus] = useState<SettlementStatus>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      const p = await fetchCollection<PlatformContract>('platforms');
      setPlatforms(p);

      if (!driverId && d.length > 0) {
        setDriverId(defaultDriverId || d[0].id);
      }
      if (!platformId && p.length > 0) {
        setPlatformId(p[0].id);
      }
    }
    loadMeta();
  }, [isOpen, defaultDriverId]);

  useEffect(() => {
    if (initialData) {
      setDriverId(initialData.driverId || '');
      setPlatformId(initialData.platformId || '');
      setDate(initialData.date || new Date().toISOString().slice(0, 10));
      setShiftPeriod(initialData.shiftPeriod || 'وردية المساء');
      setOrdersCount(initialData.ordersCount || 1);
      setExpectedAmount(initialData.expectedAmount || 0);
      setCollectedAmount(initialData.collectedAmount || 0);
      setPaymentMethod(initialData.paymentMethod || 'cash_handover');
      setReferenceNumber(initialData.referenceNumber || '');
      setBankName(initialData.bankName || 'مصرف الراجحي');
      setReceiptUrl(initialData.receiptUrl || initialData.receiptDocUrl || '');
      setStatus(initialData.status || 'approved');
      setNotes(initialData.notes || '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setShiftPeriod('وردية المساء (العشاء)');
      setOrdersCount(15);
      setExpectedAmount(500);
      setCollectedAmount(500);
      setPaymentMethod('cash_handover');
      setReferenceNumber('');
      setBankName('مصرف الراجحي');
      setReceiptUrl('');
      setStatus('approved');
      setNotes('');
      if (defaultDriverId) setDriverId(defaultDriverId);
    }
  }, [initialData, isOpen, defaultDriverId]);

  // When driver changes, auto-select their platform if they have one assigned
  const handleDriverChange = (newDriverId: string) => {
    setDriverId(newDriverId);
    const selected = drivers.find((d) => d.id === newDriverId);
    if (selected?.platformId) {
      setPlatformId(selected.platformId);
    }
  };

  const difference = collectedAmount - expectedAmount;
  const isMatched = difference === 0;
  const isDeficit = difference < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selDriver = drivers.find((d) => d.id === driverId);
    const selPlatform = platforms.find((p) => p.id === platformId);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const settlementNum = initialData?.settlementNumber || `STL-${new Date().getFullYear()}-${randomSuffix}`;
    const fraudCode = initialData?.fraudVerificationCode || `SEC-STL-${Math.floor(100000 + Math.random() * 900000)}`;

    await onSubmit({
      settlementNumber: settlementNum,
      date,
      driverId,
      driverName: selDriver ? selDriver.fullName : 'كابتن توصيل',
      driverIqama: selDriver?.iqamaNumber || '',
      platformId,
      platformName: selPlatform ? selPlatform.name : 'منصة توصيل',
      shiftPeriod,
      ordersCount: Number(ordersCount),
      expectedAmount: Number(expectedAmount),
      collectedAmount: Number(collectedAmount),
      difference,
      paymentMethod,
      referenceNumber,
      bankName: paymentMethod === 'bank_transfer' || paymentMethod === 'pos_network' ? bankName : '',
      receiptUrl,
      receiptDocUrl: receiptUrl,
      receivedById: currentUser?.id || 'sys',
      receivedByName: currentUser?.fullName || 'مشرف العمليات',
      receivedByRole: currentUser?.role || 'supervisor',
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.fullName || 'مشرف العمليات',
      recordedByRole: currentUser?.role || 'supervisor',
      fraudVerificationCode: fraudCode,
      status,
      notes,
    });

    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? tx('تعديل تصفية كاش', 'Edit Cash Settlement') : tx('تسجيل وتصفية كاش جديد للمناديب', 'Record New Courier Cash Settlement')}
      subtitle={tx('تحصيل عهدة الكاش المستلم من طلبات تطبيقات التوصيل (جاهز، هنقرستيشن، كيتا...)', 'Reconcile and collect cash-on-delivery payments from delivery platforms')}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Audit Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription={tx('يتم ربط سند القبض بهوية المستلم لمنع الاحتيال وضمان تطابق المبالغ الموردة.', 'The settlement receipt is bound to the receiver identity for fraud prevention.')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Driver selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('الكابتن / السائق المسلّم *', 'Delivering Driver *')}</label>
            <select
              required
              value={driverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="">{tx('اختر الكابتن...', 'Select Courier...')}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Platform selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('منصة التوصيل المعنية *', 'Delivery Platform *')}</label>
            <select
              required
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="">{tx('اختر المنصة...', 'Select Platform...')}</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="other_hunger">هنقرستيشن (Hungerstation)</option>
              <option value="other_jahez">جاهز (Jahez)</option>
              <option value="other_keeta">كيتا (Keeta)</option>
              <option value="other_toyou">تويو (ToYou)</option>
              <option value="other_ninja">نينجا (Ninja)</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ التصفية *', 'Settlement Date *')}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          {/* Shift period */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('الوردية / الفترة', 'Shift / Period')}</label>
            <select
              value={shiftPeriod}
              onChange={(e) => setShiftPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="وردية الغداء">{tx('وردية الغداء (11:00 ص - 4:00 م)', 'Lunch Shift (11:00 AM - 4:00 PM)')}</option>
              <option value="وردية المساء (العشاء)">{tx('وردية المساء / العشاء (4:00 م - 12:00 م)', 'Dinner Shift (4:00 PM - 12:00 AM)')}</option>
              <option value="وردية بعد منتصف الليل">{tx('وردية بعد منتصف الليل (12:00 م - 5:00 ص)', 'Night Shift (12:00 AM - 5:00 AM)')}</option>
              <option value="كامل اليوم">{tx('تصفية يومية كاملة', 'Full Day Settlement')}</option>
              <option value="تصفية أسبوعية">{tx('تصفية أسبوعية مجمعة', 'Weekly Bulk Settlement')}</option>
            </select>
          </div>

          {/* Orders Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('عدد طلبات الكاش (COD Orders) *', 'COD Orders Count *')}</label>
            <input
              type="number"
              required
              min={1}
              value={ordersCount}
              onChange={(e) => setOrdersCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          {/* Platform Expected Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tx('المبلغ المطلوب في تطبيق المنصة (SAR) *', 'Expected Amount on App (SAR) *')}
            </label>
            <input
              type="number"
              required
              min={0}
              step="any"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(Number(e.target.value))}
              placeholder={tx('المبلغ المسجل في تطبيق السائق', 'Amount on driver app')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>

          {/* Actual Collected Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tx('المبلغ المستلم فعلياً من الكابتن (SAR) *', 'Actual Collected Amount (SAR) *')}
            </label>
            <input
              type="number"
              required
              min={0}
              step="any"
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(Number(e.target.value))}
              placeholder={tx('المبلغ المسلم للمشرف أو المحول', 'Amount handed over')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-700 focus:bg-white outline-hidden"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('طريقة التوريد / الاستلام *', 'Handover / Payment Method *')}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as SettlementPaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="cash_handover">{tx('تسليم نقدي مباشر للمشرف (كاش بيد)', 'Direct Cash to Supervisor')}</option>
              <option value="bank_transfer">{tx('تحويل بنكي مباشر لحساب الشركة', 'Bank Transfer to Company Account')}</option>
              <option value="pos_network">{tx('شبكة نقاط البيع مدى (POS)', 'POS / Mada Network')}</option>
              <option value="stc_pay">{tx('محفظة رقمية (STC Pay / Urpay)', 'Digital Wallet (STC Pay / Urpay)')}</option>
              <option value="deduction_from_salary">{tx('خصم من الراتب / المستحقات', 'Salary Deduction')}</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Alert */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          isMatched
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : isDeficit
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            {isMatched ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : isDeficit ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {isMatched
                  ? tx('المبلغ مطابق تماماً لسجل المنصة (100% تطابق)', 'Amount perfectly matches platform balance (100% reconciled)')
                  : isDeficit
                  ? tx(`تنبيه: يوجد عجز نقدي بقيمة ${Math.abs(difference).toLocaleString()} ريال لم يتم تسليمه`, `Warning: Cash deficit of ${Math.abs(difference).toLocaleString()} SAR`)
                  : tx(`يوجد فائض نقدي مسلّم بقيمة ${difference.toLocaleString()} ريال`, `Cash surplus of ${difference.toLocaleString()} SAR handed over`)}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {tx('المطلوب:', 'Target:')} {expectedAmount.toLocaleString()} {t('sar')} | {tx('المستلم:', 'Collected:')} {collectedAmount.toLocaleString()} {t('sar')}
              </p>
            </div>
          </div>

          <div className="text-end font-mono font-black text-sm">
            {tx('الفارق:', 'Diff:')} {difference > 0 ? `+${difference}` : difference} {t('sar')}
          </div>
        </div>

        {/* Bank & Reference Details (conditional) */}
        {(paymentMethod === 'bank_transfer' || paymentMethod === 'pos_network' || paymentMethod === 'stc_pay') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('اسم البنك أو المحفظة', 'Bank or Wallet Name')}</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={tx('الراجحي، الأهلي، الإنماء، STC Pay...', 'Al Rajhi, SNB, Alinma, STC Pay...')}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('رقم الحوالة / العملية البنكية', 'Reference / Transfer #')}</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={tx('رقم الإشعار أو مرجع التحويل', 'Receipt reference #')}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Upload Receipt / Deposit Slip */}
        <FileUploadZone
          label={tx('إرفاق صورة إشعار التحويل البنكي أو سند القبض', 'Attach Transfer Receipt / Voucher Photo')}
          sublabel={tx('اسحب صورة إيصال التحويل أو سند التوريد الموقع لتوثيقه في الأرشيف المالي', 'Upload payment voucher or receipt photo to cloud archive')}
          value={receiptUrl}
          onChange={(url) => setReceiptUrl(url)}
          previewHeight="h-32"
        />

        {/* Status & Review */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('حالة الاعتماد *', 'Settlement Status *')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SettlementStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-hidden"
            >
              <option value="approved">{tx('معتمد ومصفى نهائياً (Approved)', 'Approved & Cleared')}</option>
              <option value="pending">{tx('معلق بانتظار تدقيق الإدارة (Pending Review)', 'Pending Review')}</option>
              <option value="disputed">{tx('يوجد عجز قيد المتابعة والتحقيق (Disputed)', 'Disputed / Deficit under Investigation')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('المستلم الموثق', 'Verified Recipient')}</label>
            <input
              type="text"
              disabled
              value={currentUser?.fullName || tx('مشرف العمليات', 'Operations Supervisor')}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('ملاحظات التصفية', 'Settlement Notes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tx('أية ملاحظات إضافية حول التوريد أو سبب العجز في حال وجوده...', 'Any notes regarding payment or deficit reason...')}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {loading ? t('loading') : tx('حفظ وتثبيت سند التصفية', 'Save & Approve Settlement')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
