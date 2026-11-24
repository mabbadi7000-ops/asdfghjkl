import React, { useState, useEffect } from 'react';
import {
  Truck,
  User,
  Fuel,
  Wrench,
  AlertOctagon,
  ShieldAlert,
  CreditCard,
  FolderArchive,
  Calendar,
  Gauge,
  PlusCircle,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileText,
  Navigation,
  Flame,
  Zap,
  Clock,
  Sun,
  Moon,
  ArrowRightLeft,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import {
  Vehicle,
  Driver,
  FuelRecord,
  MaintenanceRecord,
  AccidentRecord,
  ViolationRecord,
  ExpenseRecord,
  DocumentRecord,
  DocumentType,
  VehicleShift,
} from '../../types';
import {
  fetchCollection,
  createDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  updateDocument,
  subscribeToCollection,
  appendSessionToken,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { downloadFile, isImageData } from '../../utils/fileUtils';
import { calculateVehicleTelemetry } from '../../services/predictiveMaintenanceService';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { t, tx, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts' | 'telemetry' | 'documents' | 'fuel' | 'maintenance' | 'accidents' | 'violations' | 'expenses'>('overview');

  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [dayDriver, setDayDriver] = useState<Driver | null>(null);
  const [nightDriver, setNightDriver] = useState<Driver | null>(null);
  const [fuelHistory, setFuelHistory] = useState<FuelRecord[]>([]);
  const [maintHistory, setMaintHistory] = useState<MaintenanceRecord[]>([]);
  const [accidentHistory, setAccidentHistory] = useState<AccidentRecord[]>([]);
  const [violationHistory, setViolationHistory] = useState<ViolationRecord[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<ExpenseRecord[]>([]);
  const [shiftHistory, setShiftHistory] = useState<VehicleShift[]>([]);
  const [docHistory, setDocHistory] = useState<DocumentRecord[]>([]);

  // Preview & Add Doc states
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  // New Document Form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('istemara');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [newDocIssueDate, setNewDocIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDocFileUrl, setNewDocFileUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  useEffect(() => {
    if (!vehicle) return;

    async function loadVehicleData() {
      const drivers = await fetchCollection<Driver>('drivers');
      if (vehicle?.currentDriverId) {
        const d = drivers.find((item) => item.id === vehicle.currentDriverId);
        setCurrentDriver(d || null);
      } else {
        setCurrentDriver(null);
      }

      if (vehicle?.dayDriverId) {
        setDayDriver(drivers.find((item) => item.id === vehicle.dayDriverId) || null);
      } else {
        setDayDriver(null);
      }

      if (vehicle?.nightDriverId) {
        setNightDriver(drivers.find((item) => item.id === vehicle.nightDriverId) || null);
      } else {
        setNightDriver(null);
      }

      const fuel = await fetchCollection<FuelRecord>('fuel_records');
      setFuelHistory(fuel.filter((f) => f.vehicleId === vehicle?.id));

      const maint = await fetchCollection<MaintenanceRecord>('maintenance');
      setMaintHistory(maint.filter((m) => m.vehicleId === vehicle?.id));

      const acc = await fetchCollection<AccidentRecord>('accidents');
      setAccidentHistory(acc.filter((a) => a.vehicleId === vehicle?.id));

      const vio = await fetchCollection<ViolationRecord>('violations');
      setViolationHistory(vio.filter((v) => v.vehicleId === vehicle?.id));

      const exp = await fetchCollection<ExpenseRecord>('expenses');
      setExpenseHistory(exp.filter((e) => e.relatedId === vehicle?.id));

      const allShifts = await fetchCollection<VehicleShift>('vehicle_shifts');
      setShiftHistory(allShifts.filter((s) => s.vehicleId === vehicle?.id));
    }

    loadVehicleData();

    // Subscribe to vehicle documents in real-time
    const unsub = subscribeToCollection<DocumentRecord>('documents', (docs) => {
      setDocHistory(docs.filter((d) => d.ownerId === vehicle?.id));
    });

    return () => unsub();
  }, [vehicle]);

  if (!vehicle) return null;

  const nowTime = new Date().getTime();
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 999;
    return Math.ceil((new Date(dateStr).getTime() - nowTime) / (1000 * 60 * 60 * 24));
  };

  const telemetry = calculateVehicleTelemetry(vehicle, fuelHistory, currentDriver?.fullName);
  const totalFuelCost = fuelHistory.reduce((acc, f) => acc + (f.totalCost || 0), 0);
  const totalMaintCost = maintHistory.reduce((acc, m) => acc + (m.actualCost || m.estimatedCost || 0), 0);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle) return;

    try {
      setIsSubmittingDoc(true);
      const docId = await createDocument<Omit<DocumentRecord, 'id'>>('documents', {
        title: newDocTitle,
        docType: newDocType,
        ownerType: 'vehicle',
        ownerId: vehicle.id,
        fileUrl: newDocFileUrl,
        issueDate: newDocIssueDate,
        expiryDate: newDocExpiryDate,
        uploadedById: currentUser?.id || 'sys',
        department: 'إدارة الحركة',
        notes: newDocNotes,
      });

      // Update vehicle model if primary document
      const vehicleUpdate: Partial<Vehicle> = {};
      if (newDocType === 'istemara') {
        if (newDocFileUrl) vehicleUpdate.istemaraDocUrl = newDocFileUrl;
        if (newDocExpiryDate) vehicleUpdate.istemaraExpiryDate = newDocExpiryDate;
      } else if (newDocType === 'insurance') {
        if (newDocFileUrl) vehicleUpdate.insuranceDocUrl = newDocFileUrl;
        if (newDocExpiryDate) vehicleUpdate.insuranceExpiryDate = newDocExpiryDate;
      } else if (newDocType === 'vehicle_check' && newDocFileUrl) {
        vehicleUpdate.mvpiDocUrl = newDocFileUrl;
      } else if (newDocType === 'operation_card' && newDocFileUrl) {
        vehicleUpdate.operationCardDocUrl = newDocFileUrl;
      } else if (newDocType === 'vehicle_photo' && newDocFileUrl) {
        vehicleUpdate.photoUrl = newDocFileUrl;
      }

      if (Object.keys(vehicleUpdate).length > 0) {
        await updateDocument<Vehicle>('vehicles', vehicle.id, vehicleUpdate);
      }

      await logAuditAction(
        currentUser,
        'UPLOAD_DOCUMENT',
        'documents',
        docId,
        `إرفاق وثيقة "${newDocTitle}" للمركبة ${vehicle.plateNumber}`
      );

      setNewDocTitle('');
      setNewDocFileUrl('');
      setNewDocExpiryDate('');
      setNewDocNotes('');
      setIsAddDocOpen(false);
    } catch (err) {
      console.error('Error adding vehicle document:', err);
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDocConfirm = async (reason: string) => {
    if (!docToDelete || !currentUser || !vehicle) return;
    await softDeleteDocumentWithPassword(
      'documents',
      docToDelete.id,
      `وثيقة مركبة: "${docToDelete.title}" (${vehicle.make} - ${vehicle.plateNumber})`,
      docToDelete,
      currentUser,
      reason,
      `لوحة المركبة: ${vehicle.plateNumber} • نوع الوثيقة: ${docToDelete.docType}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_DOCUMENT',
      'documents',
      docToDelete.id,
      `حذف ونقل وثيقة "${docToDelete.title}" للمركبة ${vehicle.plateNumber} لسلة المحذوفات (${reason})`
    );
    setDocToDelete(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`الملف الشامل للمركبة: ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})`}
        subtitle={`سنة الصنع: ${vehicle.year} • العداد: ${vehicle.currentOdometer.toLocaleString()} كم`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Vehicle Profile Banner with Photo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs">
            <div className="relative group shrink-0">
              {vehicle.photoUrl ? (
                <img
                  src={appendSessionToken(vehicle.photoUrl)}
                  alt={vehicle.plateNumber}
                  className="w-24 h-20 rounded-2xl object-cover border-2 border-emerald-400/80 shadow-md"
                />
              ) : (
                <div className="w-24 h-20 rounded-2xl bg-slate-700 border-2 border-slate-600 flex flex-col items-center justify-center text-slate-300">
                  <Truck className="w-8 h-8 stroke-1" />
                  <span className="text-[10px] text-slate-400 mt-1">بدون صورة</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-start space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-black text-white">{vehicle.make} {vehicle.model} ({vehicle.year})</h3>
                <span className="px-2.5 py-0.5 text-xs font-black rounded-lg bg-emerald-500 text-white font-mono">
                  {vehicle.plateNumber}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-700 text-slate-200">
                  {vehicle.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-mono">
                رقم الهيكل VIN: {vehicle.vin} | اللون: {vehicle.color} | نوع الوقود: {vehicle.fuelType}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-300">
                <span>السائق المسند: <strong className="text-white">{currentDriver ? currentDriver.fullName : 'بدون سائق'}</strong></span>
                <span>انتهاء الاستمارة: <strong className="text-white font-mono">{vehicle.istemaraExpiryDate}</strong></span>
                <span>المستندات المؤرشفة: <strong className="text-emerald-400 font-bold">{docHistory.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: 'overview', label: tx('المواصفات والتراخيص', 'Specs & Licenses'), icon: Truck },
              { id: 'shifts', label: tx(`الورديات (${shiftHistory.length})`, `Shifts (${shiftHistory.length})`), icon: Clock },
              { id: 'telemetry', label: tx('التتبع وحالة الأصول', 'Smart Telemetry & Wear'), icon: Navigation },
              { id: 'documents', label: tx(`المستندات والصور (${docHistory.length})`, `Documents (${docHistory.length})`), icon: FolderArchive },
              { id: 'fuel', label: tx(`الوقود (${fuelHistory.length})`, `Fuel (${fuelHistory.length})`), icon: Fuel },
              { id: 'maintenance', label: tx(`الصيانة (${maintHistory.length})`, `Maintenance (${maintHistory.length})`), icon: Wrench },
              { id: 'accidents', label: tx(`الحوادث (${accidentHistory.length})`, `Accidents (${accidentHistory.length})`), icon: AlertOctagon },
              { id: 'violations', label: tx(`المخالفات (${violationHistory.length})`, `Violations (${violationHistory.length})`), icon: ShieldAlert },
              { id: 'expenses', label: tx(`المصروفات (${expenseHistory.length})`, `Expenses (${expenseHistory.length})`), icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab: Dual Shifts (11h) */}
          {activeTab === 'shifts' && (
            <div className="space-y-4">
              {/* Dual Shift Status Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        نظام تشغيل الورديات المزدوجة (11 ساعة × مندوبين)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {vehicle.shiftModeEnabled ? 'المركبة تعمل بنظام الورديات المزدوجة المتناوبة' : 'نظام السائق الفردي الأساسي'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${vehicle.shiftModeEnabled ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
                    {vehicle.shiftModeEnabled ? 'ورديات 11h مفعلة' : 'فردي'}
                  </span>
                </div>

                {vehicle.shiftModeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-amber-500/30">
                      <div className="flex items-center justify-between text-amber-400 text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5" />
                          <span>الوردية الصباحية (11 ساعة)</span>
                        </span>
                        <span className="text-[10px] font-mono">07:00 ص - 06:00 م</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {dayDriver ? dayDriver.fullName : 'لم يتم تحديد مندوب صباحي'}
                      </p>
                      {dayDriver?.phone && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{dayDriver.phone}</p>
                      )}
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-xl border border-indigo-500/30">
                      <div className="flex items-center justify-between text-indigo-400 text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5" />
                          <span>الوردية المسائية (11 ساعة)</span>
                        </span>
                        <span className="text-[10px] font-mono">07:00 م - 06:00 ص</span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {nightDriver ? nightDriver.fullName : 'لم يتم تحديد مندوب مسائي'}
                      </p>
                      {nightDriver?.phone && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{nightDriver.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Shift History Log */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700">سجل الورديات والتسليم الميداني ({shiftHistory.length})</h5>
                {shiftHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>لا توجد ورديات مسجلة لهذه المركبة حتى الآن.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {shiftHistory.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {s.shiftType === 'day_shift' ? '☀️ وردية صباحية (11h)' : s.shiftType === 'night_shift' ? '🌙 وردية مسائية (11h)' : 'وردية مخصصة'}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {s.shiftDate} ({s.startTime} ⬅️ {s.endTime})
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-2">
                            <span>المندوب: <strong>{s.driverId}</strong></span>
                            {s.handoverToDriverId && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                                <span>سلّم إلى: {s.handoverToDriverId}</span>
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {s.status === 'active' ? 'قيد التشغيل' : 'مسلّمة'}
                          </span>
                          {s.startOdometer && (
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              عداد: {s.startOdometer} كم
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Smart Telemetry & Asset Wear */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-slate-950">
                      {telemetry.engineStatus === 'running' ? tx('متحركة', 'Running') : telemetry.engineStatus === 'idle' ? tx('متوقفة (تشغيل)', 'Idle') : tx('مطفأة', 'Off')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{telemetry.currentLocation.city}</span>
                  </div>
                  <div className="text-emerald-400 font-mono font-bold text-xs">
                    {tx('مؤشر صحة الأصل:', 'Asset Health:')} {telemetry.overallHealthScore}%
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-sans">{tx('المسافة اليومية', 'Daily Distance')}</span>
                    <strong className="text-white text-sm">{telemetry.dailyDistanceKm} {t('km')}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-sans">{tx('معدل الاستهلاك', 'Fuel Rate')}</span>
                    <strong className="text-emerald-400 text-sm">{telemetry.avgFuelConsumptionPer100Km} L/100km</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-sans">{tx('تكلفة الوقود/كم', 'Fuel Cost/KM')}</span>
                    <strong className="text-white text-sm">{telemetry.fuelCostPerKm} {t('sar')}/km</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-sans">{tx('السرعة اللحظية', 'Speed')}</span>
                    <strong className="text-emerald-400 text-sm">{telemetry.currentSpeed} km/h</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{tx('صلاحية زيت المحرك (دورة 5k كم)', 'Engine Oil Life (5k cycle)')}</span>
                    <span className="font-mono text-emerald-400 font-bold">{telemetry.oilLifePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${telemetry.oilLifePercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">رقم اللوحة</span>
                  <strong className="text-slate-800 text-sm font-black">{vehicle.plateNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">رقم الهيكل VIN</span>
                  <strong className="text-slate-800 font-mono text-xs">{vehicle.vin}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">اللون</span>
                  <strong className="text-slate-800">{vehicle.color}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">نوع المركبة</span>
                  <strong className="text-slate-800">{vehicle.vehicleType}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">شركة التأمين</span>
                  <strong className="text-slate-800">{vehicle.insuranceCompany || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">انتهاء التأمين</span>
                  <strong className="text-slate-800 font-mono">{vehicle.insuranceExpiryDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">انتهاء الاستمارة</span>
                  <strong className="text-slate-800 font-mono">{vehicle.istemaraExpiryDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">العداد الحالي</span>
                  <strong className="text-slate-800 font-mono text-emerald-600 font-bold">
                    {vehicle.currentOdometer.toLocaleString()} كم
                  </strong>
                </div>
              </div>

              {/* Financial & Operational Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
                  <span className="text-blue-600 block text-[10px] font-bold">إجمالي تكاليف الوقود</span>
                  <strong className="text-blue-950 text-sm font-black">{totalFuelCost.toLocaleString()} ر.س</strong>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs">
                  <span className="text-amber-600 block text-[10px] font-bold">إجمالي تكاليف الصيانة</span>
                  <strong className="text-amber-950 text-sm font-black">{totalMaintCost.toLocaleString()} ر.س</strong>
                </div>
                <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs">
                  <span className="text-purple-600 block text-[10px] font-bold">السائق الحالي</span>
                  <strong className="text-purple-950 block truncate font-bold">
                    {currentDriver ? currentDriver.fullName : 'غير مسندة'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Documents & Photos */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Header with Add Document Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    وثائق وصور المركبة ({docHistory.length})
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    مربوطة مباشرة بالأرشيف المركزي وقواعد البيانات السحابية
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة وثيقة / صورة جديدة</span>
                </button>
              </div>

              {/* Add Document Inline Modal */}
              {isAddDocOpen && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-emerald-600" />
                      <span>إرفاق وثيقة أو صورة جديدة للمركبة ({vehicle.plateNumber})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddDocOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                    >
                      إلغاء
                    </button>
                  </div>

                  <form onSubmit={handleAddDocument} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان الوثيقة *</label>
                        <input
                          type="text"
                          required
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="مثال: وثيقة تأمين شامل 2026 - التعاونية"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الوثيقة *</label>
                        <select
                          value={newDocType}
                          onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                        >
                          <option value="istemara">استمارة رخصة السير (Istemara)</option>
                          <option value="insurance">وثيقة تأمين (Insurance Policy)</option>
                          <option value="vehicle_check">فحص فني دوري (MVPI Inspection)</option>
                          <option value="operation_card">بطاقة تشغيل هيئة النقل (Operation Card)</option>
                          <option value="vehicle_photo">صورة المركبة (Vehicle Photo)</option>
                          <option value="other">أخرى (فاتورة صيانة، تفويض...)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الإصدار</label>
                        <input
                          type="date"
                          value={newDocIssueDate}
                          onChange={(e) => setNewDocIssueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الانتهاء (إن وجد)</label>
                        <input
                          type="date"
                          value={newDocExpiryDate}
                          onChange={(e) => setNewDocExpiryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-hidden"
                        />
                      </div>
                    </div>

                    <FileUploadZone
                      label="الملف أو الصورة الممسوحة ضوئياً"
                      value={newDocFileUrl}
                      onChange={(url) => setNewDocFileUrl(url)}
                      previewHeight="h-36"
                    />

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
                      <input
                        type="text"
                        value={newDocNotes}
                        onChange={(e) => setNewDocNotes(e.target.value)}
                        placeholder="رقم الوثيقة، اسم شركة التأمين..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-hidden"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddDocOpen(false)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingDoc}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {isSubmittingDoc ? 'جاري الحفظ...' : 'حفظ وأرشفة الوثيقة'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Documents List */}
              {docHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <FolderArchive className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-1" />
                  <p className="text-xs font-bold text-slate-700">لا توجد وثائق مؤرشفة لهذه المركبة حتى الآن</p>
                  <p className="text-[11px] text-slate-400 mt-1">انقر على "إضافة وثيقة / صورة جديدة" لإرفاق الوثائق الرسمية</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto">
                  {docHistory.map((doc) => {
                    const daysDiff = getDaysDiff(doc.expiryDate);
                    const isImg = isImageData(doc.fileUrl);

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col justify-between gap-3 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail / Icon */}
                          <div
                            onClick={() => setPreviewDoc(doc)}
                            className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90"
                          >
                            {doc.fileUrl && isImg ? (
                              <img
                                src={appendSessionToken(doc.fileUrl)}
                                alt={doc.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText className="w-6 h-6 text-emerald-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                              {doc.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 capitalize block mt-0.5">
                              {doc.docType.replace('_', ' ')}
                            </span>

                            {doc.expiryDate && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {doc.expiryDate}
                                </span>
                                {daysDiff <= 0 ? (
                                  <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-md text-[9px] font-black">
                                    منتهي
                                  </span>
                                ) : daysDiff <= 15 ? (
                                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-md text-[9px] font-bold">
                                    {daysDiff} يوم!
                                  </span>
                                ) : daysDiff <= 30 ? (
                                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md text-[9px] font-bold">
                                    {daysDiff} يوم
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-bold">
                                    ساري
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-[11px] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {doc.fileUrl && (
                              <button
                                type="button"
                                onClick={() => downloadFile(doc.fileUrl!, doc.title)}
                                className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                title="تحميل"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDocToDelete(doc)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Fuel */}
          {activeTab === 'fuel' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fuelHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد تعبئات وقود مسجلة</p>
              ) : (
                fuelHistory.map((f) => (
                  <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{f.gasStation}</p>
                      <p className="text-slate-500 text-[10px]">{f.date} • {f.liters} لتر ({f.fuelType})</p>
                    </div>
                    <span className="font-bold text-slate-800">{f.totalCost} ر.س</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Maintenance */}
          {activeTab === 'maintenance' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {maintHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">سجل الصيانة نظيف - لا توجد صيانات</p>
              ) : (
                maintHistory.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{m.workshopName}</p>
                      <p className="text-slate-500 text-[10px]">{m.date} • {m.description}</p>
                    </div>
                    <span className="font-bold text-slate-800">{m.actualCost || m.estimatedCost} ر.س</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 5: Accidents */}
          {activeTab === 'accidents' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accidentHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">سجل نظيف - لا توجد حوادث مسجلة</p>
              ) : (
                accidentHistory.map((a) => (
                  <div key={a.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{a.location}</p>
                      <p className="text-slate-500 text-[10px]">{a.date} {a.time} • {a.description}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800">
                      {a.severity}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 6: Violations */}
          {activeTab === 'violations' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {violationHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد مخالفات مرورية مسجلة</p>
              ) : (
                violationHistory.map((v) => (
                  <div key={v.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{v.violationType}</span>
                        {v.autoMatchedFromShift && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            ربط آلي بالوردية ✓
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[10px]">
                        رقم: {v.violationNumber} • {v.date} {v.time ? `(${v.time})` : ''}
                        {v.shiftType ? ` • ${v.shiftType === 'day_shift' ? 'الوردية الصباحية (11h)' : 'الوردية المسائية (11h)'}` : ''}
                      </p>
                      <p className="text-amber-900 font-bold text-[11px] flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-700" />
                        <span>الكابتن المسؤول: {v.driverId}</span>
                      </p>
                    </div>
                    <div className="text-end">
                      <span className="font-black text-rose-700 block font-mono">{v.amount} ر.س</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {v.status === 'paid' ? 'مسددة' : 'غير مسددة'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 7: Expenses */}
          {activeTab === 'expenses' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {expenseHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد مصروفات إضافية مسجلة</p>
              ) : (
                expenseHistory.map((e) => (
                  <div key={e.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{e.description}</p>
                      <p className="text-slate-500 text-[10px]">الفئة: {e.category} • {e.date}</p>
                    </div>
                    <span className="font-bold text-slate-800">{e.amount} ر.س</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Document Full Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        ownerLabel={`المركبة: ${vehicle.make} (${vehicle.plateNumber})`}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Delete Document Confirmation */}
      <DeleteWithPasswordModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDocConfirm}
        itemTitle={docToDelete ? `وثيقة "${docToDelete.title}" للمركبة ${vehicle?.plateNumber || ''}` : ''}
        itemType="وثيقة مركبة"
        warningNote="سيتم حفظ بيانات الوثيقة ورابطها في سلة المحذوفات المركزية للمدير العام."
      />
    </>
  );
};
