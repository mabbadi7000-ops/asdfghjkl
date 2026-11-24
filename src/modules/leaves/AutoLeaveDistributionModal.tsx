import React, { useState } from 'react';
import {
  Wand2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Driver, DriverLeaveRecord, VehicleShift } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AutoLeaveDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  existingLeaves: DriverLeaveRecord[];
  existingShifts: VehicleShift[];
  onApplyBatch: (newLeaves: Omit<DriverLeaveRecord, 'id'>[]) => Promise<void>;
}

export interface GeneratedLeaveCandidate {
  driverId: string;
  driverName: string;
  driverPhone: string;
  date: string;
  dayNameAr: string;
  conflictNotes?: string;
  hasConflict: boolean;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const AutoLeaveDistributionModal: React.FC<AutoLeaveDistributionModalProps> = ({
  isOpen,
  onClose,
  drivers,
  existingLeaves,
  existingShifts,
  onApplyBatch,
}) => {
  const { tx } = useLanguage();

  // Range selection (Defaults to current week or upcoming week)
  const today = new Date();
  const getNextSunday = () => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = (7 - day) % 7; // days until next Sunday
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    return d.toISOString().slice(0, 10);
  };

  const getNextThursday = () => {
    const sundayStr = getNextSunday();
    const d = new Date(sundayStr);
    d.setDate(d.getDate() + 4); // Thursday
    return d.toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState(getNextSunday());
  const [endDate, setEndDate] = useState(getNextThursday());
  const [daysPerDriver, setDaysPerDriver] = useState<number>(1);
  const [targetType, setTargetType] = useState<'all' | 'active_only'>('active_only');
  const [generatedList, setGeneratedList] = useState<GeneratedLeaveCandidate[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Target drivers
  const targetDrivers = drivers.filter((d) => {
    if (targetType === 'active_only') {
      return d.status === 'active';
    }
    return d.status !== 'terminated';
  });

  // Calculate available allowed days within the range (Strictly excluding Thursday=4, Friday=5, Saturday=6)
  const getAllowedDates = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const curr = new Date(start);
    const stop = new Date(end);

    while (curr <= stop) {
      const dayOfWeek = curr.getDay(); // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
      // User requirement: عدا أيام السبت والجمعة والخميس (Strictly allow Sun, Mon, Tue, Wed: 0, 1, 2, 3)
      if (dayOfWeek !== 4 && dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(curr.toISOString().slice(0, 10));
      }
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // Algorithm: Balanced & randomized distribution avoiding existing leaves & active vehicle shifts
  const handleGenerateDistribution = () => {
    setErrorMsg('');
    const allowedDates = getAllowedDates(startDate, endDate);

    if (allowedDates.length === 0) {
      setErrorMsg('النطاق الزمني المحدد لا يحتوي على أيام مسموحة للتوزيع (الأحد، الإثنين، الثلاثاء، الأربعاء). يرجى توسيع النطاق.');
      return;
    }

    if (targetDrivers.length === 0) {
      setErrorMsg('لا يوجد مناديب متاحين للتوزيع.');
      return;
    }

    // Daily capacity tracker to balance the load across allowed days
    const dailyCount: Record<string, number> = {};
    allowedDates.forEach((d) => {
      dailyCount[d] = 0;
    });

    const results: GeneratedLeaveCandidate[] = [];

    // Shuffle drivers randomly
    const shuffledDrivers = [...targetDrivers].sort(() => Math.random() - 0.5);

    for (const driver of shuffledDrivers) {
      // Find candidate days for this driver that have no existing approved leaves
      const driverLeaves = existingLeaves.filter(
        (l) => l.driverId === driver.id && l.status !== 'rejected' && l.status !== 'cancelled'
      );

      // Check dates without existing leave
      const freeDates = allowedDates.filter((dateStr) => {
        const hasLeave = driverLeaves.some((l) => dateStr >= l.startDate && dateStr <= l.endDate);
        return !hasLeave;
      });

      if (freeDates.length === 0) {
        continue;
      }

      // Pick the least loaded date among freeDates (with randomized tie-breaking)
      // Sort freeDates by dailyCount ascending, with minor random perturbation
      const sortedFreeDates = [...freeDates].sort((a, b) => {
        const countDiff = dailyCount[a] - dailyCount[b];
        if (countDiff !== 0) return countDiff;
        return Math.random() - 0.5;
      });

      // Take requested daysPerDriver
      const chosenDates = sortedFreeDates.slice(0, Math.min(daysPerDriver, sortedFreeDates.length));

      for (const chosenDate of chosenDates) {
        dailyCount[chosenDate]++;

        // Check for shift conflict
        const hasShift = existingShifts.some(
          (s) => s.driverId === driver.id && s.shiftDate === chosenDate && s.status !== 'cancelled'
        );

        const dObj = new Date(chosenDate);
        const dayName = ARABIC_DAYS[dObj.getDay()];

        results.push({
          driverId: driver.id,
          driverName: driver.fullName,
          driverPhone: driver.phone || driver.iqamaNumber,
          date: chosenDate,
          dayNameAr: dayName,
          hasConflict: hasShift,
          conflictNotes: hasShift ? 'يوجد وردية مسجلة في هذا اليوم (سيتم تنبيه المشرف)' : undefined,
        });
      }
    }

    // Sort results by date then driver name
    results.sort((a, b) => a.date.localeCompare(b.date) || a.driverName.localeCompare(b.driverName));

    setGeneratedList(results);
    setIsGenerated(true);
  };

  const handleApply = async () => {
    if (generatedList.length === 0) return;
    setSubmitting(true);
    try {
      const batchId = `batch-${Date.now()}`;
      const newRecords: Omit<DriverLeaveRecord, 'id'>[] = generatedList.map((item) => ({
        driverId: item.driverId,
        driverName: item.driverName,
        driverPhone: item.driverPhone,
        leaveType: 'weekly_rest',
        startDate: item.date,
        endDate: item.date,
        totalDays: 1,
        status: 'approved',
        reason: 'توزيع ذكي لعطلات الأسبوع (عدا الخميس والجمعة والسبت)',
        isAutoDistributed: true,
        autoDistributionBatchId: batchId,
        notes: item.conflictNotes || 'تم جدولتها واعتمادها تلقائياً بالخوارزمية الذكية دون تعارض',
      }));

      await onApplyBatch(newRecords);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ جدول الإجازات');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="أداة التوزيع الذكي وجدولة الإجازات والعطلات"
      subtitle="خوارزمية ذكية لتوزيع عطلات المناديب عشوائياً وتلقائياً عدا (الخميس، الجمعة، والسبت) لمنع التعارض"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Rules & Policy Banner */}
        <div className="p-4 bg-linear-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-300/60 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>قواعد ضبط التوزيع والتوازن التشغيلي</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                  خوارزمية الأمان الميداني
                </span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                تستثني الأداة أيام الذروة الأسبوعية <strong className="text-rose-700">(الخميس، الجمعة، والسبت)</strong> وتوزع الإجازات حصراً بين أيام العمل الاعتيادية: <strong className="text-emerald-700">الأحد، الإثنين، الثلاثاء، والأربعاء</strong> بالتساوي لضمان استقرار طاقة الأسطول وعدم حدوث أي عجز في الورديات.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>بداية الفترة *</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>نهاية الفترة *</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>أيام الإجازة لكل مندوب</span>
            </label>
            <select
              value={daysPerDriver}
              onChange={(e) => setDaysPerDriver(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value={1}>يوم واحد (1 يوم)</option>
              <option value={2}>يومان (2 يوم)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>شريحة المناديب المستهدفة</span>
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="active_only">المناديب النشطين فقط ({drivers.filter((d) => d.status === 'active').length})</option>
              <option value="all">كافة المناديب المسجلين ({drivers.filter((d) => d.status !== 'terminated').length})</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button: Generate Schedule */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500 font-semibold">
            <span>المناديب المؤهلون للتوزيع: </span>
            <strong className="text-slate-900 font-black">{targetDrivers.length} مندوب</strong>
          </div>

          <button
            type="button"
            onClick={handleGenerateDistribution}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Wand2 className="w-4 h-4 text-slate-950" />
            <span>{isGenerated ? 'إعادة التوزيع وتوليد جدول بديل 🎲' : 'توليد جدول الإجازات عشوائياً 🎲'}</span>
          </button>
        </div>

        {/* Results Preview Table */}
        {isGenerated && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>معاينة الجدول المقترح ({generatedList.length} يوم إجازة)</span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  جاهز للربط والاعتماد
                </span>
              </h4>

              {/* Day Distribution Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء'].map((dayName) => {
                  const count = generatedList.filter((g) => g.dayNameAr === dayName).length;
                  return (
                    <span
                      key={dayName}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {dayName}: <strong className="text-slate-900">{count}</strong>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 sticky top-0 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">اسم المندوب</th>
                    <th className="p-2.5">تاريخ الإجازة المقترح</th>
                    <th className="p-2.5">اليوم</th>
                    <th className="p-2.5">فحص التعارض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {generatedList.map((item, idx) => (
                    <tr key={`${item.driverId}-${item.date}`} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900">{item.driverName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{item.driverPhone}</span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{item.date}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.dayNameAr}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {item.hasConflict ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{item.conflictNotes}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>خالٍ من أي تعارض</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit & Save in Database */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={submitting || generatedList.length === 0}
                onClick={handleApply}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-white" />
                )}
                <span>
                  {submitting
                    ? 'جاري الحفظ في قواعد البيانات...'
                    : `اعتماد وحفظ جدول الإجازات في النظام (${generatedList.length} إجازة)`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
