import React, { useState, useEffect } from 'react';
import {
  Truck,
  FileText,
  ShieldCheck,
  Calendar,
  Gauge,
  Camera,
  Layers,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { Vehicle, VehicleStatus, Driver } from '../../types';
import { apiFetch, fetchCollection } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void | string>;
  initialData?: Vehicle | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useLanguage();
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'media'>('info');
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Specs & Info
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('تويوتا');
  const [model, setModel] = useState('ياريس');
  const [year, setYear] = useState<number>(2024);
  const [color, setColor] = useState('أبيض');
  const [vin, setVin] = useState('');
  const [vehicleType, setVehicleType] = useState('سيدان مدمجة');
  const [status, setStatus] = useState<VehicleStatus>('available');
  const [currentDriverId, setCurrentDriverId] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('شركة التعاونية للتأمين');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('2027-01-01');
  const [istemaraExpiryDate, setIstemaraExpiryDate] = useState('2027-01-01');
  const [currentOdometer, setCurrentOdometer] = useState<number>(35000);
  const [fuelType, setFuelType] = useState<'gasoline_91' | 'gasoline_95' | 'diesel'>('gasoline_91');
  const [shiftModeEnabled, setShiftModeEnabled] = useState(false);
  const [dayDriverId, setDayDriverId] = useState('');
  const [nightDriverId, setNightDriverId] = useState('');
  const [notes, setNotes] = useState('');

  // Media & Documents
  const [photoUrl, setPhotoUrl] = useState('');
  const [istemaraDocUrl, setIstemaraDocUrl] = useState('');
  const [insuranceDocUrl, setInsuranceDocUrl] = useState('');
  const [mvpiDocUrl, setMvpiDocUrl] = useState('');
  const [operationCardDocUrl, setOperationCardDocUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  useEffect(() => {
    async function loadDrivers() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
    }
    loadDrivers();
  }, []);

  useEffect(() => {
    setArchiveError('');
    if (initialData) {
      setPlateNumber(initialData.plateNumber || '');
      setMake(initialData.make || 'تويوتا');
      setModel(initialData.model || 'ياريس');
      setYear(initialData.year || 2024);
      setColor(initialData.color || 'أبيض');
      setVin(initialData.vin || '');
      setVehicleType(initialData.vehicleType || 'سيدان مدمجة');
      setStatus(initialData.status || 'available');
      setCurrentDriverId(initialData.currentDriverId || '');
      setShiftModeEnabled(!!initialData.shiftModeEnabled);
      setDayDriverId(initialData.dayDriverId || '');
      setNightDriverId(initialData.nightDriverId || '');
      setInsuranceCompany(initialData.insuranceCompany || '');
      setInsuranceExpiryDate(initialData.insuranceExpiryDate || '');
      setIstemaraExpiryDate(initialData.istemaraExpiryDate || '');
      setCurrentOdometer(initialData.currentOdometer || 0);
      setFuelType((initialData.fuelType as any) || 'gasoline_91');
      setNotes(initialData.notes || '');

      setPhotoUrl(initialData.photoUrl || '');
      setIstemaraDocUrl(initialData.istemaraDocUrl || '');
      setInsuranceDocUrl(initialData.insuranceDocUrl || '');
      setMvpiDocUrl(initialData.mvpiDocUrl || '');
      setOperationCardDocUrl(initialData.operationCardDocUrl || '');
    } else {
      setPlateNumber('');
      setMake('تويوتا');
      setModel('ياريس');
      setYear(2024);
      setColor('أبيض');
      setVin('');
      setVehicleType('سيدان مدمجة');
      setStatus('available');
      setCurrentDriverId('');
      setShiftModeEnabled(false);
      setDayDriverId('');
      setNightDriverId('');
      setInsuranceCompany('شركة التعاونية للتأمين');
      setInsuranceExpiryDate('2027-01-01');
      setIstemaraExpiryDate('2027-01-01');
      setCurrentOdometer(0);
      setFuelType('gasoline_91');
      setNotes('');

      setPhotoUrl('');
      setIstemaraDocUrl('');
      setInsuranceDocUrl('');
      setMvpiDocUrl('');
      setOperationCardDocUrl('');
    }
    setActiveFormTab('info');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setArchiveError('');
    const vehiclePayload: Partial<Vehicle> = {
      plateNumber,
      make,
      model,
      year: Number(year),
      color,
      vin,
      vehicleType,
      status,
      currentDriverId: shiftModeEnabled ? (dayDriverId || currentDriverId) : currentDriverId,
      shiftModeEnabled,
      dayDriverId: shiftModeEnabled ? dayDriverId : undefined,
      nightDriverId: shiftModeEnabled ? nightDriverId : undefined,
      insuranceCompany,
      insuranceExpiryDate,
      istemaraExpiryDate,
      currentOdometer: Number(currentOdometer),
      fuelType,
      notes,
      photoUrl,
      istemaraDocUrl,
      insuranceDocUrl,
      mvpiDocUrl,
      operationCardDocUrl,
    };
    try {
      const savedId = await onSubmit(vehiclePayload);
      const vehicleId = (typeof savedId === 'string' && savedId) || initialData?.id;
      const hasAttachments = [
        istemaraDocUrl,
        insuranceDocUrl,
        mvpiDocUrl,
        operationCardDocUrl,
      ].some(Boolean);
      if (!vehicleId && hasAttachments) {
        throw new Error('تعذر تحديد معرف المركبة لأرشفة المستندات.');
      }
      if (vehicleId) await archiveVehicleDocuments(vehicleId);
      onClose();
    } catch (err) {
      console.error('Vehicle save or document archive failed:', err);
      setArchiveError(
        err instanceof Error
          ? `تعذر حفظ المركبة أو أرشفة المستندات: ${err.message}`
          : 'تعذر حفظ المركبة أو أرشفة المستندات. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setLoading(false);
    }
  };

  const archiveVehicleDocuments = async (vehicleId: string) => {
    const attachments = [
      { key: 'istemara', title: 'رخصة السير / الاستمارة', url: istemaraDocUrl, expiry: istemaraExpiryDate },
      { key: 'insurance', title: 'وثيقة التأمين', url: insuranceDocUrl, expiry: insuranceExpiryDate },
      { key: 'vehicle_check', title: 'الفحص الدوري', url: mvpiDocUrl, expiry: '' },
      { key: 'operation_card', title: 'كرت التشغيل', url: operationCardDocUrl, expiry: '' },
    ];
    const today = new Date().toISOString().split('T')[0];

    for (const att of attachments) {
      if (!att.url) continue;
      const id = `doc_veh_${vehicleId}_${att.key}`;
      const payload = {
        id,
        title: `${att.title} - ${plateNumber}`,
        category: 'vehicles',
        docType: att.key,
        documentType: att.key,
        ownerType: 'vehicle',
        ownerId: vehicleId,
        referenceNumber: plateNumber,
        entityType: 'vehicle',
        entityId: vehicleId,
        fileUrl: att.url,
        issueDate: today,
        expiryDate: att.expiry || '',
        status: 'active',
        uploadedById: 'sys',
        department: 'إدارة الحركة والأسطول',
        notes: `أرشفة آلية لمركبة لوحة: ${plateNumber}`,
      };
      const encodedId = encodeURIComponent(id);
      const existing = await apiFetch(`/api/documents/${encodedId}`);
      let response: Response;
      if (existing.ok) {
        response = await apiFetch(`/api/documents/${encodedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (existing.status === 404) {
        response = await apiFetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = existing;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string; details?: string } | null;
        throw new Error(result?.details || result?.error || `HTTP ${response.status}`);
      }
    }
    window.dispatchEvent(new Event('documents-archive-updated'));
  };

  const attachedDocsCount = [photoUrl, istemaraDocUrl, insuranceDocUrl, mvpiDocUrl, operationCardDocUrl].filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'تعديل بيانات ومستندات المركبة' : 'إضافة مركبة جديدة للأسطول'}
      subtitle="المواصفات، اللوحة، التأمين، الصور والمستندات الرسمية"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Modal Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveFormTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFormTab === 'info'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>المواصفات والبيانات الأساسية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab('media')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFormTab === 'media'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>صور ووثائق المركبة ({attachedDocsCount})</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeFormTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم اللوحة *</label>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="مثال: أ ب ج 1 2 3 4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الشركة المصنعة *</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="تويوتا، هيونداي، نيسان..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الموديل والطراز *</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="ياريس، إلنترا، صني..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">سنة الصنع *</label>
                <input
                  type="number"
                  required
                  min={2015}
                  max={2030}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اللون</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهيكل VIN *</label>
                <input
                  type="text"
                  required
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="17 حرف ورقم"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع المركبة</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="سيدان مدمجة، فان بضائع..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الوقود</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="gasoline_91">بنزين 91 (أخضر)</option>
                  <option value="gasoline_95">بنزين 95 (أحمر)</option>
                  <option value="diesel">ديزل</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">حالة المركبة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="available">متاحة (Available)</option>
                  <option value="assigned">مسندة (Assigned)</option>
                  <option value="in_operation">قيد التشغيل (In Operation)</option>
                  <option value="maintenance">في الصيانة (Maintenance)</option>
                  <option value="accident">حادث (Accident)</option>
                  <option value="inactive">غير نشطة (Inactive)</option>
                </select>
              </div>
              <div className="sm:col-span-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftModeEnabled}
                        onChange={(e) => setShiftModeEnabled(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>تفعيل نظام الورديات المزدوجة (مندوبين اثنين × 11 ساعة لكل وردية)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      يسمح بتشغيل المركبة مع كابتنين اثنين مع تحديد وردية صباحية وأخرى مسائية وربط المخالفات بالوردية
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${shiftModeEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {shiftModeEnabled ? 'مفعل (Dual Shifts 11h)' : 'سائق فردي'}
                  </span>
                </div>

                {shiftModeEnabled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                        <span>☀️ مندوب الوردية الصباحية (11 ساعة: 07:00 ص - 06:00 م)</span>
                      </label>
                      <select
                        value={dayDriverId}
                        onChange={(e) => setDayDriverId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                      >
                        <option value="">-- اختر كابتن الوردية الصباحية --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} ({d.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                        <span>🌙 مندوب الوردية المسائية (11 ساعة: 07:00 م - 06:00 ص)</span>
                      </label>
                      <select
                        value={nightDriverId}
                        onChange={(e) => setNightDriverId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                      >
                        <option value="">-- اختر كابتن الوردية المسائية --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} ({d.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">السائق المسند الوحيد</label>
                    <select
                      value={currentDriverId}
                      onChange={(e) => setCurrentDriverId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                    >
                      <option value="">بدون سائق مسند</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.fullName} ({d.phone})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">شركة التأمين</label>
                <input
                  type="text"
                  value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتهاء التأمين *</label>
                <input
                  type="date"
                  required
                  value={insuranceExpiryDate}
                  onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتهاء الاستمارة *</label>
                <input
                  type="date"
                  required
                  value={istemaraExpiryDate}
                  onChange={(e) => setIstemaraExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">قراءة العداد (كم) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية ملاحظات فنية أو تشغيلية خاصة بالمركبة..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
          </div>
        )}

        {/* TAB 2: PHOTOS & DOCUMENTS */}
        {activeFormTab === 'media' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                يتم ربط وثائق المركبة (الاستمارة، التأمين، الفحص الدوري، كرت التشغيل) تلقائياً بـ <strong>إدارة المستندات والأرشيف المركزي</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicle Photo */}
              <FileUploadZone
                label="الصورة الأساسية للمركبة (Vehicle Photo)"
                sublabel="صورة واضحة تبين هيكل المركبة ورقم اللوحة (JPEG, PNG)"
                value={photoUrl}
                onChange={(val) => setPhotoUrl(val)}
                accept="image/png,image/jpeg,image/webp"
                isImageOnly={true}
                previewHeight="h-44"
              />

              {/* Istemara */}
              <FileUploadZone
                label="صورة استمارة السير (Istemara Registration)"
                sublabel="مسح ضوئي لبطاقة رخصة سير المركبة"
                value={istemaraDocUrl}
                onChange={(val) => setIstemaraDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Insurance Doc */}
              <FileUploadZone
                label="وثيقة التأمين الشامل أو ضد الغير (Insurance Policy)"
                sublabel="شهادة التأمين الصادرة من الشركة المعتمدة"
                value={insuranceDocUrl}
                onChange={(val) => setInsuranceDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Periodic Inspection (MVPI) */}
              <FileUploadZone
                label="شهادة الفحص الفني الدوري (MVPI Inspection)"
                sublabel="تقرير اجتياز محطة الفحص الفني الدوري"
                value={mvpiDocUrl}
                onChange={(val) => setMvpiDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Operation Card */}
              <div className="sm:col-span-2">
                <FileUploadZone
                  label="بطاقة التشغيل / الهيئة العامة للنقل (Operation Card)"
                  sublabel="كرت تشغيل توجيه المركبات المعتمد من هيئة النقل"
                  value={operationCardDocUrl}
                  onChange={(val) => setOperationCardDocUrl(val)}
                  previewHeight="h-36"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {activeFormTab === 'info' ? (
              <button
                type="button"
                onClick={() => setActiveFormTab('media')}
                className="text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إرفاق صور ومستندات المركبة ({attachedDocsCount})</span>
                <span>←</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className="text-slate-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>→</span>
                <span>العودة لبيانات المواصفات</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {archiveError && (
              <p role="alert" className="max-w-xl text-right text-xs font-semibold text-rose-600">
                {archiveError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {loading ? t('loading') : 'حفظ المركبة ومستنداتها'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
