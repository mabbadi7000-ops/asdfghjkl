import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { Driver, DriverLeaveRecord, LeaveType, LeaveStatus, VehicleShift } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leaveData: Partial<DriverLeaveRecord>) => Promise<void>;
  editingLeave?: DriverLeaveRecord | null;
  drivers: Driver[];
  existingLeaves: DriverLeaveRecord[];
  existingShifts: VehicleShift[];
}

export const LeaveFormModal: React.FC<LeaveFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLeave,
  drivers,
  existingLeaves,
  existingShifts,
}) => {
  const { tx } = useLanguage();

  const [driverId, setDriverId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<LeaveStatus>('approved');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingLeave) {
      setDriverId(editingLeave.driverId);
      setLeaveType(editingLeave.leaveType);
      setStartDate(editingLeave.startDate);
      setEndDate(editingLeave.endDate);
      setStatus(editingLeave.status);
      setReason(editingLeave.reason || '');
      setNotes(editingLeave.notes || '');
      setAttachmentUrl(editingLeave.attachmentUrl || '');
    } else {
      setDriverId(drivers.length > 0 ? drivers[0].id : '');
      setLeaveType('annual');
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setStatus('approved');
      setReason('');
      setNotes('');
      setAttachmentUrl('');
    }
  }, [editingLeave, isOpen, drivers]);

  // Conflict validation: check existing approved leaves & vehicle shifts within the range
  useEffect(() => {
    if (!driverId || !startDate || !endDate) {
      setConflictWarning(null);
      return;
    }

    if (startDate > endDate) {
      setConflictWarning('تاريخ نهاية الإجازة يجب أن يكون مساوياً أو بعد تاريخ البداية.');
      return;
    }

    // 1. Check overlap with other leaves for this driver
    const otherLeaves = existingLeaves.filter((l) => {
      if (editingLeave && l.id === editingLeave.id) return false;
      if (l.driverId !== driverId) return false;
      if (l.status === 'rejected' || l.status === 'cancelled') return false;
      return !(endDate < l.startDate || startDate > l.endDate);
    });

    if (otherLeaves.length > 0) {
      setConflictWarning(`⚠️ تنبيه تعارض: هذا المندوب لديه إجازة مسجلة مسبقاً في الفترة (${otherLeaves[0].startDate} إلى ${otherLeaves[0].endDate}).`);
      return;
    }

    // 2. Check overlap with scheduled vehicle shifts
    const conflictingShifts = existingShifts.filter((s) => {
      if (s.driverId !== driverId) return false;
      if (s.status === 'cancelled') return false;
      return s.shiftDate >= startDate && s.shiftDate <= endDate;
    });

    if (conflictingShifts.length > 0) {
      setConflictWarning(`⚠️ تنبيه تعارض مع الوردية: يوجد (${conflictingShifts.length}) وردية مسندة لهذا المندوب خلال فترة الإجازة المختارة.`);
      return;
    }

    setConflictWarning(null);
  }, [driverId, startDate, endDate, existingLeaves, existingShifts, editingLeave]);

  // Compute total days inclusive
  const calculateDays = () => {
    if (!startDate || !endDate || startDate > endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !startDate || !endDate) return;

    setSubmitting(true);
    try {
      const selectedDriver = drivers.find((d) => d.id === driverId);
      await onSubmit({
        driverId,
        driverName: selectedDriver?.fullName || '',
        driverPhone: selectedDriver?.phone || selectedDriver?.iqamaNumber || '',
        driverIqama: selectedDriver?.iqamaNumber || '',
        leaveType,
        startDate,
        endDate,
        totalDays: calculateDays(),
        status,
        reason,
        notes,
        attachmentUrl,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLeave ? 'تعديل بيانات الإجازة' : 'تسجيل إجازة جديدة لمندوب'}
      subtitle="تحديد فترة الإجازة، نوعها ومطابقتها مع جدول الورديات لمنع التعارض"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Driver Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>مندوب التوصيل *</span>
          </label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
          >
            <option value="">-- اختر المندوب --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.phone || d.iqamaNumber}) - {d.status === 'vacation' ? '[في إجازة حالياً]' : '[نشط]'}
              </option>
            ))}
          </select>
        </div>

        {/* Leave Type and Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              نوع الإجازة *
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="annual">إجازة سنوية (Annual Leave)</option>
              <option value="weekly_rest">عطلة أسبوعية دورية (Weekly Rest)</option>
              <option value="emergency">إجازة طارئة (Emergency)</option>
              <option value="sick">إجازة مرضية (Sick Leave)</option>
              <option value="unpaid">إجازة بدون راتب (Unpaid)</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              حالة الاعتماد *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeaveStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="approved">معتمدة رسمياً (Approved)</option>
              <option value="pending">قيد المراجعة (Pending)</option>
              <option value="completed">منتهية (Completed)</option>
              <option value="cancelled">ملغاة (Cancelled)</option>
            </select>
          </div>
        </div>

        {/* Start Date & End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>تاريخ البداية *</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>تاريخ النهاية *</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>إجمالي الأيام</span>
            </label>
            <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-600 flex items-center justify-between">
              <span>{calculateDays()}</span>
              <span className="text-[10px] text-slate-400">يوم</span>
            </div>
          </div>
        </div>

        {/* Conflict Warning Alert */}
        {conflictWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p>{conflictWarning}</p>
              <p className="text-[10px] font-normal text-amber-700">
                يمكنك التعديل أو المتابعة إذا كنت ترغب في إعادة تعيين وردية المندوب.
              </p>
            </div>
          </div>
        )}

        {/* Reason and Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>سبب الإجازة</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: إجازة سنوية دورية / ظرف عائلي / مراجعة طبية..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات إضافية
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات المشرف أو تعليمات تسليم المركبة والعهدة..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white outline-hidden resize-none"
          />
        </div>

        <FileUploadZone
          label="إرفاق تقرير طبي أو مستند للإجازة"
          value={attachmentUrl}
          onChange={setAttachmentUrl}
        />

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{submitting ? 'جاري الحفظ...' : editingLeave ? 'تحديث الإجازة' : 'تسجيل الإجازة'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
