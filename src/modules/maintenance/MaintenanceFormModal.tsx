import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus, PriorityLevel, Vehicle } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<MaintenanceRecord>) => Promise<void>;
  initialData?: MaintenanceRecord | null;
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('oil_change');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [estimatedCost, setEstimatedCost] = useState<number>(300);
  const [actualCost, setActualCost] = useState<number>(0);
  const [workshopName, setWorkshopName] = useState('مركز الصيانة المعتمد');
  const [status, setStatus] = useState<MaintenanceStatus>('requested');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadVehicles() {
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
      if (v.length > 0 && !vehicleId && !initialData) {
        setVehicleId(v[0].id);
      }
    }
    loadVehicles();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setVehicleId(initialData.vehicleId || '');
      setDate(initialData.date || new Date().toISOString().slice(0, 10));
      setMaintenanceType(initialData.maintenanceType || 'oil_change');
      setDescription(initialData.description || '');
      setPriority(initialData.priority || 'medium');
      setEstimatedCost(initialData.estimatedCost || 0);
      setActualCost(initialData.actualCost || 0);
      setWorkshopName(initialData.workshopName || '');
      setStatus(initialData.status || 'requested');
      setEntryDate(initialData.entryDate || '');
      setExitDate(initialData.exitDate || '');
      setNotes(initialData.notes || '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setMaintenanceType('oil_change');
      setDescription('');
      setPriority('medium');
      setEstimatedCost(300);
      setActualCost(0);
      setWorkshopName('مركز أوتو كير المتقدم');
      setStatus('requested');
      setEntryDate('');
      setExitDate('');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      vehicleId,
      date,
      maintenanceType,
      description,
      priority,
      estimatedCost: Number(estimatedCost),
      actualCost: actualCost ? Number(actualCost) : undefined,
      workshopName,
      status,
      entryDate,
      exitDate,
      notes,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'تعديل أمر الصيانة' : 'إنشاء أمر صيانة / إصلاح'}
      subtitle="بيانات الورشة، الأعطال، التكلفة المتوقعة والفعلية"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة *</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الصيانة *</label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="periodic">صيانة دورية (Periodic)</option>
              <option value="oil_change">تغيير زيت وفلاتر (Oil Change)</option>
              <option value="tires">إطارات وترصيص (Tires)</option>
              <option value="brakes">فرامل وهوبات (Brakes)</option>
              <option value="engine">محرك وجيربوكس (Engine)</option>
              <option value="electrical">كهرباء وبطارية (Electrical)</option>
              <option value="ac">تكييف وتبريد (AC)</option>
              <option value="emergency_repair">إصلاح طارئ (Emergency)</option>
              <option value="other">أخرى (Other)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الطلب *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الورشة / المركز *</label>
            <input
              type="text"
              required
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              placeholder="اسم الورشة أو الوكيل"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الأولوية</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">مرتفعة</option>
              <option value="urgent">عاجل جداً</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">حالة الطلب</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="requested">طلب جديد (Requested)</option>
              <option value="approved">معتمد (Approved)</option>
              <option value="in_progress">قيد التنفيذ (In Progress)</option>
              <option value="completed">مكتمل (Completed)</option>
              <option value="cancelled">ملغي (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">التكلفة التقديرية (ر.س) *</label>
            <input
              type="number"
              required
              min={0}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">التكلفة الفعلية (الفاتورة)</label>
            <input
              type="number"
              min={0}
              value={actualCost}
              onChange={(e) => setActualCost(Number(e.target.value))}
              placeholder="عند انتهاء الصيانة"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">وصف العطل أو الصيانة المطلوبة *</label>
          <textarea
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تفاصيل العطل وقطع الغيار المطلوبة..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {loading ? t('loading') : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
