import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Receipt,
  Layers,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import { DriverAdvanceRecord, Driver, AdvanceStatus } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface DriverAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (advanceData: Partial<DriverAdvanceRecord>) => Promise<void>;
  initialData?: DriverAdvanceRecord | null;
  defaultDriverId?: string;
}

export const DriverAdvanceModal: React.FC<DriverAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultDriverId,
}) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [driverId, setDriverId] = useState(defaultDriverId || '');
  const [amount, setAmount] = useState<number>(1000);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('ظرف عائلي طارئ');
  const [status, setStatus] = useState<AdvanceStatus>('active');
  const [receiptDocUrl, setReceiptDocUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDrivers() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      if (!driverId && d.length > 0) {
        setDriverId(defaultDriverId || d[0].id);
      }
    }
    loadDrivers();
  }, [isOpen, defaultDriverId]);

  useEffect(() => {
    if (initialData) {
      setDriverId(initialData.driverId || '');
      setAmount(initialData.amount || 1000);
      setInstallmentsCount(initialData.installmentsCount || 1);
      setRequestDate(initialData.requestDate || new Date().toISOString().slice(0, 10));
      setReason(initialData.reason || '');
      setStatus(initialData.status || 'active');
      setReceiptDocUrl(initialData.receiptDocUrl || '');
      setNotes(initialData.notes || '');
    } else {
      setAmount(1000);
      setInstallmentsCount(2);
      setRequestDate(new Date().toISOString().slice(0, 10));
      setReason('ظرف عائلي طارئ');
      setStatus('active');
      setReceiptDocUrl('');
      setNotes('');
      if (defaultDriverId) setDriverId(defaultDriverId);
    }
  }, [initialData, isOpen, defaultDriverId]);

  const monthlyInstallment = installmentsCount > 0 ? Math.round(amount / installmentsCount) : amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selDriver = drivers.find((d) => d.id === driverId);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const advanceNum = initialData?.advanceNumber || `ADV-${new Date().getFullYear()}-${randomSuffix}`;
    const fraudCode = initialData?.fraudVerificationCode || `SEC-ADV-${Math.floor(100000 + Math.random() * 900000)}`;

    await onSubmit({
      advanceNumber: advanceNum,
      driverId,
      driverName: selDriver ? selDriver.fullName : 'كابتن توصيل',
      driverIqama: selDriver?.iqamaNumber || '',
      requestDate,
      amount: Number(amount),
      repaidAmount: initialData?.repaidAmount || 0,
      remainingAmount: (Number(amount) - (initialData?.repaidAmount || 0)),
      installmentsCount: Number(installmentsCount),
      monthlyInstallment,
      reason,
      approvedById: currentUser?.id || 'sys',
      approvedByName: currentUser?.fullName || 'إدارة التشغيل والمالية',
      approvedByRole: currentUser?.role || 'operations_manager',
      disbursedById: currentUser?.id || 'sys',
      disbursedByName: currentUser?.fullName || 'مسؤول الصرف المالي',
      disbursedByRole: currentUser?.role || 'admin',
      fraudVerificationCode: fraudCode,
      status,
      disbursedDate: requestDate,
      receiptDocUrl,
      notes,
    });

    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'تعديل بيانات السلفة المالية' : 'تسجيل سلفة مالية جديدة للكابتن'}
      subtitle="صرف سلفة مالية مجدولة وتحديد أقساط الاستقطاع من الرواتب الشهرية"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription="يتم تسجيل واعتماد صرف السلفة المالية باسم المسؤول المصرح له وربط أقساطها تلقائياً بمسيرات الرواتب."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Driver */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">الكابتن المستفيد *</label>
            <select
              required
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="">اختر الكابتن...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.phone}) - إقامة: {d.iqamaNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">مبلغ السلفة (SAR) *</label>
            <input
              type="number"
              required
              min={100}
              step="50"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="مثال: 1000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white outline-hidden"
            />
          </div>

          {/* Installments count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">عدد أقساط السداد *</label>
            <select
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value={1}>شهر واحد (خصم كامل المبلغ)</option>
              <option value={2}>شهرين (قسطين متساويين)</option>
              <option value={3}>3 أشهر</option>
              <option value={4}>4 أشهر</option>
              <option value={6}>6 أشهر</option>
            </select>
          </div>

          {/* Request Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ صرف السلفة *</label>
            <input
              type="date"
              required
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">سبب طلب السلفة *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ظرف طارئ، علاج، تجديد إقامة..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Repayment Calculation Preview */}
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-purple-950">
          <div>
            <span className="font-bold block">القسط الشهري المستقطع من الراتب:</span>
            <span className="text-[11px] text-purple-800">
              سيتم استقطاع {monthlyInstallment.toLocaleString()} ر.س شهرياً لمدة {installmentsCount} شهر
            </span>
          </div>
          <span className="text-base font-black font-mono text-purple-900">
            {monthlyInstallment.toLocaleString()} ر.س / شهر
          </span>
        </div>

        {/* Upload Receipt / Promissory note */}
        <FileUploadZone
          label="إرفاق سند لأمر أو إيصال التحويل البنكي"
          sublabel="ارفق صورة سند الصرف أو إشعار التحويل البنكي لتوثيق السلفة"
          value={receiptDocUrl}
          onChange={(url) => setReceiptDocUrl(url)}
          previewHeight="h-32"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات وشروط إضافية</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أية اتفاقات خاصة بشأن آلية الخصم من الراتب..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
          />
        </div>

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
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {loading ? t('loading') : 'حفظ واعتماد السلفة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
