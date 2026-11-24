import React, { useState, useEffect } from 'react';
import {
  User,
  Truck,
  CheckSquare,
  Clock,
  ShieldAlert,
  FolderArchive,
  Star,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  PlusCircle,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Banknote,
  Wallet,
  CreditCard,
  Receipt,
  KeyRound,
  Sparkles,
  Layers,
  Fuel,
  Sun,
  Moon,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { DriverAvatar } from './DriverAvatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import {
  Driver,
  Vehicle,
  TaskRecord,
  AttendanceRecord,
  ViolationRecord,
  DocumentRecord,
  DocumentType,
  CashSettlementRecord,
  DriverAdvanceRecord,
  DriverPayrollRecord,
  RentedAccount,
  FuelChip,
  FuelRecord,
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
import { syncDriverIdlePlatformsToFreelancerPool } from '../../services/freelancerSyncService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { downloadFile, isImageData } from '../../utils/fileUtils';

interface DriverDetailModalProps {
  driver: Driver | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  driver,
  isOpen,
  onClose,
}) => {
  const { t, tx, language } = useLanguage();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'documents'
    | 'freelance_accounts'
    | 'vehicle'
    | 'fuel_and_shifts'
    | 'finance'
    | 'tasks'
    | 'attendance'
    | 'violations'
  >('overview');

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driverTasks, setDriverTasks] = useState<TaskRecord[]>([]);
  const [driverAttendance, setDriverAttendance] = useState<AttendanceRecord[]>([]);
  const [driverViolations, setDriverViolations] = useState<ViolationRecord[]>([]);
  const [driverDocs, setDriverDocs] = useState<DocumentRecord[]>([]);
  const [driverSettlements, setDriverSettlements] = useState<CashSettlementRecord[]>([]);
  const [driverAdvances, setDriverAdvances] = useState<DriverAdvanceRecord[]>([]);
  const [driverPayrolls, setDriverPayrolls] = useState<DriverPayrollRecord[]>([]);
  const [driverRentedAccounts, setDriverRentedAccounts] = useState<RentedAccount[]>([]);
  const [driverFuelCard, setDriverFuelCard] = useState<FuelChip | null>(null);
  const [driverFuelRecords, setDriverFuelRecords] = useState<FuelRecord[]>([]);
  const [driverShifts, setDriverShifts] = useState<VehicleShift[]>([]);
  const [isSyncingPool, setIsSyncingPool] = useState(false);

  // Preview & Add Doc states
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  // New Document Form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('driver_license');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [newDocIssueDate, setNewDocIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDocFileUrl, setNewDocFileUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  useEffect(() => {
    if (!driver) return;

    async function loadRelated() {
      if (driver?.assignedVehicleId) {
        const vehicles = await fetchCollection<Vehicle>('vehicles');
        const v = vehicles.find((item) => item.id === driver.assignedVehicleId);
        setVehicle(v || null);
      } else {
        setVehicle(null);
      }

      const tasks = await fetchCollection<TaskRecord>('tasks');
      setDriverTasks(tasks.filter((t) => t.assignedToId === driver?.id || t.assignedToId === driver?.iqamaNumber));

      const att = await fetchCollection<AttendanceRecord>('attendance');
      setDriverAttendance(att.filter((a) => a.userId === driver?.id || a.userId === driver?.iqamaNumber));

      const violations = await fetchCollection<ViolationRecord>('violations');
      setDriverViolations(violations.filter((v) => v.driverId === driver?.id));

      const stls = await fetchCollection<CashSettlementRecord>('cash_settlements');
      setDriverSettlements(stls.filter((s) => s.driverId === driver?.id));

      const advs = await fetchCollection<DriverAdvanceRecord>('driver_advances');
      setDriverAdvances(advs.filter((a) => a.driverId === driver?.id));

      const pays = await fetchCollection<DriverPayrollRecord>('driver_payrolls');
      setDriverPayrolls(pays.filter((p) => p.driverId === driver?.id));

      const accs = await fetchCollection<RentedAccount>('rented_accounts');
      setDriverRentedAccounts(
        accs.filter((a) => a.originDriverId === driver?.id || a.originDriverIqama === driver?.iqamaNumber)
      );

      const [chips, fuelRecs, allShifts] = await Promise.all([
        fetchCollection<FuelChip>('fuel_chips'),
        fetchCollection<FuelRecord>('fuel_records'),
        fetchCollection<VehicleShift>('vehicle_shifts'),
      ]);
      setDriverFuelCard(chips.find((c) => c.driverId === driver?.id) || null);
      setDriverFuelRecords(fuelRecs.filter((r) => r.driverId === driver?.id));
      setDriverShifts(allShifts.filter((s) => s.driverId === driver?.id));
    }

    loadRelated();

    // Subscribe to driver documents & rented accounts in real-time
    const unsubDocs = subscribeToCollection<DocumentRecord>('documents', (docs) => {
      setDriverDocs(docs.filter((d) => d.ownerId === driver?.id));
    });

    const unsubAccs = subscribeToCollection<RentedAccount>('rented_accounts', (accs) => {
      setDriverRentedAccounts(
        accs.filter((a) => a.originDriverId === driver?.id || a.originDriverIqama === driver?.iqamaNumber)
      );
    });

    return () => {
      unsubDocs();
      unsubAccs();
    };
  }, [driver]);

  const handleManualSyncFreelance = async () => {
    if (!driver) return;
    setIsSyncingPool(true);
    try {
      await syncDriverIdlePlatformsToFreelancerPool(driver);
    } finally {
      setIsSyncingPool(false);
    }
  };

  if (!driver) return null;

  const nowTime = new Date().getTime();
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 999;
    return Math.ceil((new Date(dateStr).getTime() - nowTime) / (1000 * 60 * 60 * 24));
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle) return;

    try {
      setIsSubmittingDoc(true);
      const docId = await createDocument<Omit<DocumentRecord, 'id'>>('documents', {
        title: newDocTitle,
        docType: newDocType,
        ownerType: 'driver',
        ownerId: driver.id,
        fileUrl: newDocFileUrl,
        issueDate: newDocIssueDate,
        expiryDate: newDocExpiryDate,
        uploadedById: currentUser?.id || 'sys',
        department: 'الموارد البشرية',
        notes: newDocNotes,
      });

      // If document is a primary type, also reflect on driver profile
      const driverUpdate: Partial<Driver> = {};
      if (newDocType === 'driver_license') {
        if (newDocFileUrl) driverUpdate.licenseDocUrl = newDocFileUrl;
        if (newDocExpiryDate) driverUpdate.licenseExpiryDate = newDocExpiryDate;
      } else if (newDocType === 'iqama') {
        if (newDocFileUrl) driverUpdate.iqamaDocUrl = newDocFileUrl;
        if (newDocExpiryDate) driverUpdate.iqamaExpiryDate = newDocExpiryDate;
      } else if (newDocType === 'medical_check' && newDocFileUrl) {
        driverUpdate.medicalDocUrl = newDocFileUrl;
      } else if (newDocType === 'contract' && newDocFileUrl) {
        driverUpdate.contractDocUrl = newDocFileUrl;
      } else if (newDocType === 'driver_card' && newDocFileUrl) {
        driverUpdate.driverCardDocUrl = newDocFileUrl;
      } else if (newDocType === 'operation_card' && newDocFileUrl) {
        driverUpdate.operationCardDocUrl = newDocFileUrl;
      } else if (newDocType === 'personal_photo' && newDocFileUrl) {
        driverUpdate.photoUrl = newDocFileUrl;
      }

      if (Object.keys(driverUpdate).length > 0) {
        await updateDocument<Driver>('drivers', driver.id, driverUpdate);
      }

      await logAuditAction(
        currentUser,
        'UPLOAD_DOCUMENT',
        'documents',
        docId,
        `إرفاق وثيقة "${newDocTitle}" للكابتن ${driver.fullName}`
      );

      // Reset form
      setNewDocTitle('');
      setNewDocFileUrl('');
      setNewDocExpiryDate('');
      setNewDocNotes('');
      setIsAddDocOpen(false);
    } catch (err) {
      console.error('Error adding document:', err);
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDocConfirm = async (reason: string) => {
    if (!docToDelete || !currentUser || !driver) return;
    await softDeleteDocumentWithPassword(
      'documents',
      docToDelete.id,
      `وثيقة كابتن: "${docToDelete.title}" (${driver.fullName})`,
      docToDelete,
      currentUser,
      reason,
      `رقم الإقامة: ${driver.iqamaNumber} • نوع الوثيقة: ${docToDelete.docType}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_DOCUMENT',
      'documents',
      docToDelete.id,
      `حذف ونقل وثيقة "${docToDelete.title}" للكابتن ${driver.fullName} لسلة المحذوفات (${reason})`
    );
    setDocToDelete(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`الملف الشامل للكابتن: ${driver.fullName}`}
        subtitle={`رقم الإقامة: ${driver.iqamaNumber} • ${driver.nationality}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Driver Mini Profile Header with Photo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs">
            <div className="relative group shrink-0">
              <DriverAvatar
                driver={driver}
                className="w-20 h-20"
                shapeClassName="rounded-2xl"
                textClassName="text-2xl"
              />
            </div>

            <div className="flex-1 text-center sm:text-start space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-black text-white">{driver.fullName}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                  driver.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {driver.status === 'active' ? tx('نشط بالخدمة', 'Active on Duty') : driver.status}
                </span>
                {vehicle && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-indigo-500 text-white flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    <span>{vehicle.make} ({vehicle.plateNumber})</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 font-mono">
                {tx('رقم الإقامة:', 'Iqama:')} {driver.iqamaNumber} | {tx('الجوال:', 'Phone:')} {driver.phone}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-300">
                <span>{tx('تاريخ الانتهاء:', 'Expiry:')} <strong className="text-white font-mono">{driver.iqamaExpiryDate}</strong></span>
                <span>{tx('الرخصة:', 'License:')} <strong className="text-white">{driver.licenseType}</strong> ({driver.licenseExpiryDate})</span>
                <span>{tx('المستندات المؤرشفة:', 'Archived Docs:')} <strong className="text-emerald-400 font-bold">{driverDocs.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside modal */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: 'overview', label: tx('البيانات الأساسية', 'Basic Info'), icon: User },
              { id: 'freelance_accounts', label: tx(`حسابات الفريلانسر المستخرجة (${driverRentedAccounts.length})`, `Freelance Accounts (${driverRentedAccounts.length})`), icon: KeyRound },
              { id: 'documents', label: tx(`المستندات والصور (${driverDocs.length})`, `Documents (${driverDocs.length})`), icon: FolderArchive },
              { id: 'vehicle', label: tx('المركبة المسندة', 'Assigned Vehicle'), icon: Truck },
              { id: 'fuel_and_shifts', label: tx(`الوقود والورديات (${driverFuelRecords.length + driverShifts.length})`, `Fuel & Shifts (${driverFuelRecords.length + driverShifts.length})`), icon: Fuel },
              { id: 'finance', label: tx(`المالية والرواتب (${driverPayrolls.length + driverSettlements.length})`, `Finance & Payroll (${driverPayrolls.length + driverSettlements.length})`), icon: Wallet },
              { id: 'tasks', label: tx(`المهام (${driverTasks.length})`, `Tasks (${driverTasks.length})`), icon: CheckSquare },
              { id: 'attendance', label: tx(`الحضور (${driverAttendance.length})`, `Attendance (${driverAttendance.length})`), icon: Clock },
              { id: 'violations', label: tx(`المخالفات (${driverViolations.length})`, `Violations (${driverViolations.length})`), icon: ShieldAlert },
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

          {/* Tab Content: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('الجوال', 'Phone')}</span>
                  <span className="font-bold text-slate-800">{driver.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('تاريخ انتهاء الإقامة', 'Iqama Expiry Date')}</span>
                  <span className="font-bold text-slate-800 font-mono">{driver.iqamaExpiryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('رقم رخصة القيادة', 'License Number')}</span>
                  <span className="font-bold text-slate-800 font-mono">{driver.licenseNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('نوع الرخصة', 'License Type')}</span>
                  <span className="font-bold text-slate-800">{driver.licenseType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('تاريخ انتهاء الرخصة', 'License Expiry')}</span>
                  <span className="font-bold text-slate-800 font-mono">{driver.licenseExpiryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('العنوان السكني', 'Residential Address')}</span>
                  <span className="font-bold text-slate-800">{driver.address || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('تاريخ بداية العمل', 'Start Date')}</span>
                  <span className="font-bold text-slate-800 font-mono">{driver.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('التقييم التشغيلي', 'Operational Rating')}</span>
                  <span className="font-bold text-emerald-600">★ {driver.rating || '4.9'} / 5.0</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('إجمالي التوصيلات', 'Total Deliveries')}</span>
                  <span className="font-bold text-slate-800">{driver.totalDeliveries || 0} {tx('طلب', 'orders')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('كرت السائق (TGA)', 'Driver Card')}</span>
                  {driver.driverCardDocUrl ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ متوفر ومؤرشف
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      غير مرفق
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{tx('كرت التشغيل', 'Operation Card')}</span>
                  {driver.operationCardDocUrl ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ متوفر ومؤرشف
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      غير مرفق
                    </span>
                  )}
                </div>
              </div>

              {driver.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                  <span className="font-bold block mb-0.5">ملاحظات:</span>
                  <span>{driver.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Freelance Accounts Pool */}
          {activeTab === 'freelance_accounts' && (
            <div className="space-y-4">
              {/* Info Header Banner */}
              <div className="p-4 bg-linear-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <span>حسابات المنصات المتبقية في مخزون الفريلانسر</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {driverRentedAccounts.length} حسابات
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      المنصة المشغل عليها المندوب أساسياً: <strong>{driver.primaryPlatform || driver.platformId || 'جاهز'}</strong>. باقي الحسابات المسجلة بهويته تم إدراجها بمخزون الفريلانسر للتأجير.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualSyncFreelance}
                  disabled={isSyncingPool}
                  className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isSyncingPool ? 'جارٍ الربط...' : 'ربط الحسابات بعقود نشطة'}</span>
                </button>
              </div>

              {/* Primary Active App Card */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      المنصة الأساسية المسندة: {driver.primaryPlatform || driver.platformId || 'جاهز (Jahez)'}
                    </p>
                    <p className="text-[10px] text-emerald-700">هذا الحساب مخصص لتشغيل الكابتن نفسه ولا يتم تأجيره بالخارج</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs">
                  تشغيل مباشر
                </span>
              </div>

              {/* Grid of Idle Accounts in Freelancer Pool */}
              {driverRentedAccounts.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <KeyRound className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">لا توجد حسابات فريلانسر مسجلة حالياً</p>
                  <p className="text-[11px] text-slate-400">انقر على زر "تحديث وتوليد الحسابات الشاغرة" لتوليد باقي المنصات تلقائياً لمخزون التأجير</p>
                  <button
                    type="button"
                    onClick={handleManualSyncFreelance}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                  >
                    ربط الحسابات المسجلة بعقود المنصات النشطة
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {driverRentedAccounts.map((acc) => {
                    const statusText =
                      acc.status === 'available'
                        ? 'متاح للتأجير'
                        : acc.status === 'rented_direct' || acc.status === 'rented'
                        ? `مؤجر للمندوب: ${acc.currentDriverName || 'مندوب خارجي'}`
                        : acc.status === 'assigned_to_supervisor'
                        ? `مسلّم لحزمة المشرف: ${acc.currentSupervisorName || 'مشرف ميداني'}`
                        : acc.status;

                    const statusColor =
                      acc.status === 'available'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : acc.status === 'rented_direct' || acc.status === 'rented'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : acc.status === 'assigned_to_supervisor'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-xs font-black text-slate-900">{acc.platformName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9px]">كود الحساب</span>
                            <span className="font-mono font-bold text-slate-800">{acc.accountCode}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">الإيجار الشهري</span>
                            <span className="font-bold text-emerald-700 font-mono">{acc.monthlyRate} ر.س</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">اسم المستخدم للتطبيق</span>
                            <span className="font-mono text-slate-600 truncate block">{acc.appUsername}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">إجمالي الإيرادات المحققة</span>
                            <span className="font-bold text-slate-900 font-mono">{acc.totalRentalRevenue || 0} ر.س</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Documents & Photos */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Header with Add Document Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    وثائق ومستندات الكابتن ({driverDocs.length})
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
                      <span>إرفاق وثيقة أو صورة جديدة للكابتن</span>
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
                          placeholder="مثال: رخصة القيادة المجددة 2026"
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
                          <option value="driver_license">رخصة قيادة (Driver License)</option>
                          <option value="iqama">إقامة نظامية / هوية (Iqama)</option>
                          <option value="driver_card">كرت السائق (Driver Card - TGA)</option>
                          <option value="operation_card">كرت التشغيل للمندوب (Operation Card)</option>
                          <option value="personal_photo">صورة شخصية (Personal Photo)</option>
                          <option value="medical_check">فحص طبي (Medical Check)</option>
                          <option value="contract">عقد عمل / تشغيل (Contract)</option>
                          <option value="other">أخرى (مستند إضافي / تفويض)</option>
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
                        placeholder="رقم المرجع، جهة الإصدار..."
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
              {driverDocs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <FolderArchive className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-1" />
                  <p className="text-xs font-bold text-slate-700">لا توجد وثائق مؤرشفة لهذا الكابتن حتى الآن</p>
                  <p className="text-[11px] text-slate-400 mt-1">انقر على "إضافة وثيقة / صورة جديدة" لإرفاق الوثائق الرسمية</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto">
                  {driverDocs.map((doc) => {
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

          {/* Tab Content: Vehicle */}
          {activeTab === 'vehicle' && (
            <div className="space-y-4">
              {vehicle ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{vehicle.make} {vehicle.model} ({vehicle.year})</h4>
                      <p className="text-slate-500 text-[10px] font-mono">VIN: {vehicle.vin}</p>
                    </div>
                    <span className="px-2.5 py-1 font-bold text-xs bg-emerald-100 text-emerald-800 rounded-xl">
                      لوحة: {vehicle.plateNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">العداد</span>
                      <strong className="text-slate-800">{vehicle.currentOdometer.toLocaleString()} كم</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">التأمين</span>
                      <strong className="text-slate-800">{vehicle.insuranceCompany}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">انتهاء التأمين</span>
                      <strong className="text-slate-800 font-mono">{vehicle.insuranceExpiryDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">انتهاء الاستمارة</span>
                      <strong className="text-slate-800 font-mono">{vehicle.istemaraExpiryDate}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد مركبة مسندة لهذا الكابتن حالياً</p>
              )}
            </div>
          )}

          {/* Tab Content: Fuel & Shifts (الوقود والورديات) */}
          {activeTab === 'fuel_and_shifts' && (
            <div className="space-y-4">
              {/* Dedicated Fuel Card Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {tx('بطاقة الوقود المخصصة للمندوب', 'Dedicated Fuel Card')}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {driverFuelCard
                          ? `نظام ${driverFuelCard.system.toUpperCase()} • رقم البطاقة: ${driverFuelCard.chipNumber}`
                          : tx('لا توجد بطاقة وقود مسجلة لهذا المندوب حالياً', 'No fuel card registered')}
                      </p>
                    </div>
                  </div>

                  {driverFuelCard && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      driverFuelCard.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {driverFuelCard.status === 'active' ? 'مفعلة وتعمل' : driverFuelCard.status}
                    </span>
                  )}
                </div>

                {driverFuelCard ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-100 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block">حد الحصة اليومي</span>
                      <strong className="text-emerald-700 font-mono text-sm">
                        {driverFuelCard.dailyQuota} ر.س / يوم
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block">المبلغ الشهري المخصص</span>
                      <strong className="text-blue-900 font-mono text-sm">
                        {driverFuelCard.monthlyQuota.toLocaleString()} ر.س
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block">المستهلك هذا الشهر</span>
                      <strong className="text-slate-800 font-mono text-sm">
                        {(driverFuelCard.currentMonthSpent || 0).toLocaleString()} ر.س
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block">الرصيد المتبقي</span>
                      <strong className="text-emerald-800 font-mono text-sm">
                        {Math.max(0, driverFuelCard.monthlyQuota - (driverFuelCard.currentMonthSpent || 0)).toLocaleString()} ر.س
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 rounded-xl border border-emerald-100 text-xs text-slate-600">
                    يمكن للمشرف أو المدير العام إصدار بطاقة وقود مخصصة لهذا المندوب من تبويب <strong>"إدارة الوقود"</strong> لتحديد حصته اليومية والشهرية.
                  </div>
                )}
              </div>

              {/* Fuel Dispenses History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{tx('سجل تعبئة وصرف حصص الوقود', 'Fuel Dispense History')} ({driverFuelRecords.length})</span>
                  </h5>
                  <span className="text-[11px] text-slate-500 font-mono">
                    إجمالي المنصرف: {driverFuelRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0).toLocaleString()} ر.س
                  </span>
                </div>

                {driverFuelRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                    لا توجد فواتير أو عمليات صرف وقود مسجلة لهذا المندوب
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {driverFuelRecords.map((rec) => (
                      <div key={rec.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rec.totalCost} ر.س</span>
                            <span className="text-[10px] text-slate-500 font-mono">({rec.liters} لتر)</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                              {rec.gasStation}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {rec.date} • عداد: {rec.odometer?.toLocaleString()} كم
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {rec.chipSystem || 'شريحة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle 11-Hour Shifts History */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{tx('سجل الورديات الميدانية (11 ساعة)', 'Vehicle 11h Shifts History')} ({driverShifts.length})</span>
                  </h5>
                </div>

                {driverShifts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                    لا توجد ورديات 11 ساعة مسجلة لهذا المندوب حتى الآن
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {driverShifts.map((s) => (
                      <div key={s.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {s.shiftType === 'night_shift' ? (
                            <Moon className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-500" />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {s.shiftType === 'night_shift' ? 'الوردية المسائية (11 ساعة)' : 'الوردية الصباحية (11 ساعة)'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              تاريخ: {s.shiftDate} ({s.startTime} - {s.endTime})
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {s.status === 'active' ? 'وردية نشطة' : 'مكتملة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Finance & Payroll & Settlements */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
                    <span>{tx('توريدات الكاش', 'Cash Remittances')}</span>
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1 text-base font-black text-emerald-700">
                    {driverSettlements.reduce((sum, s) => sum + (s.collectedAmount || 0), 0).toLocaleString()} {t('sar')}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    {tx(`من ${driverSettlements.length} عمليات تصفية`, `From ${driverSettlements.length} settlements`)}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold">
                    <span>{tx('عجز الكاش', 'Cash Deficit')}</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="mt-1 text-base font-black text-rose-700">
                    {Math.abs(driverSettlements.filter(s => s.difference < 0).reduce((sum, s) => sum + s.difference, 0)).toLocaleString()} {t('sar')}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">
                    {tx('يستقطع آلياً من الراتب', 'Auto-deducted from payroll')}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
                    <span>{tx('متبقي السلف', 'Active Loans Balance')}</span>
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-1 text-base font-black text-amber-700">
                    {driverAdvances.filter(a => a.status === 'active' || a.status === 'partially_paid').reduce((sum, a) => sum + (a.remainingAmount || 0), 0).toLocaleString()} {t('sar')}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">
                    {tx(`من ${driverAdvances.length} سلفة مسجلة`, `From ${driverAdvances.length} advances`)}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center justify-between text-indigo-800 text-[11px] font-bold">
                    <span>{tx('آخر مسير راتب', 'Latest Payroll')}</span>
                    <Wallet className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="mt-1 text-base font-black text-indigo-700">
                    {driverPayrolls[0] ? `${driverPayrolls[0].netSalary.toLocaleString()} ${t('sar')}` : '—'}
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">
                    {driverPayrolls[0] ? tx(`شهر ${driverPayrolls[0].month}`, `Month ${driverPayrolls[0].month}`) : tx('لا يوجد مسير', 'No payroll yet')}
                  </div>
                </div>
              </div>

              {/* Cash Settlements Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>{tx(`تصفية عهد الكاش المستلم من تطبيقات التوصيل (${driverSettlements.length})`, `Cash Settlements from Delivery Apps (${driverSettlements.length})`)}</span>
                  </h4>
                </div>
                {driverSettlements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{tx('لا توجد عمليات تصفية كاش مسجلة لهذا الكابتن', 'No cash settlements recorded for this driver')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {driverSettlements.map((s) => (
                      <div key={s.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{s.platformName || tx('تطبيق التوصيل', 'Delivery App')}</span>
                            <span className="font-mono text-[10px] text-slate-500">{s.settlementNumber}</span>
                            <span className="text-[10px] text-slate-400">({s.date})</span>
                          </div>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            {tx(`الطلبات: ${s.ordersCount} | المتوقع: ${s.expectedAmount} ر.س | المحصل: ${s.collectedAmount} ر.س`, `Orders: ${s.ordersCount} | Expected: ${s.expectedAmount} SAR | Collected: ${s.collectedAmount} SAR`)}
                          </span>
                        </div>
                        <div className="text-end">
                          <span className={`font-bold block ${s.difference < 0 ? 'text-rose-600' : s.difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {s.difference === 0 ? tx('مطابق تماماً', 'Matched 0.00') : `${s.difference > 0 ? '+' : ''}${s.difference} ${t('sar')}`}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : s.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {s.status === 'approved' ? tx('معتمد', 'Approved') : s.status === 'pending' ? tx('قيد المراجعة', 'Pending') : s.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advances Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>{tx(`السلف المالية والأقساط (${driverAdvances.length})`, `Financial Advances & Loans (${driverAdvances.length})`)}</span>
                  </h4>
                </div>
                {driverAdvances.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{tx('لا توجد سلف مالية مسجلة لهذا الكابتن', 'No financial advances recorded for this driver')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {driverAdvances.map((adv) => (
                      <div key={adv.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{adv.advanceNumber}</span>
                            <span className="text-[10px] text-slate-400">({adv.requestDate})</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                              adv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : adv.status === 'partially_paid' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {adv.status === 'paid' ? tx('مسددة بالكامل', 'Fully Paid') : adv.status === 'partially_paid' ? tx('مسددة جزئياً', 'Partially Paid') : tx('نشطة', 'Active')}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            {tx(`السبب: ${adv.reason} • القسط: ${adv.monthlyInstallment} ر.س / شهر (${adv.installmentsCount} أقساط)`, `Reason: ${adv.reason} • Installment: ${adv.monthlyInstallment} SAR/mo (${adv.installmentsCount} mos)`)}
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="text-slate-500 text-[11px] block">{tx('المبلغ:', 'Amount:')} <strong>{adv.amount} {t('sar')}</strong></span>
                          <span className="text-amber-600 font-bold text-[11px]">{tx('متبقي:', 'Due:')} {adv.remainingAmount} {t('sar')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payroll History Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span>{tx(`مسيرات الرواتب الشهرية (${driverPayrolls.length})`, `Monthly Payrolls (${driverPayrolls.length})`)}</span>
                  </h4>
                </div>
                {driverPayrolls.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{tx('لا توجد مسيرات رواتب مسجلة لهذا الكابتن', 'No payrolls recorded for this driver')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {driverPayrolls.map((p) => (
                      <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{tx(`شهر ${p.month}`, `Month ${p.month}`)}</span>
                            <span className="font-mono text-[10px] text-slate-500">{p.payrollNumber}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                              p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : p.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {p.status === 'paid' ? tx('مدفوع', 'Paid') : p.status === 'approved' ? tx('معتمد', 'Approved') : p.status}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            {tx(
                              `الإجمالي: ${p.grossEarnings} ر.س | الاستقطاعات: ${p.totalDeductions} ر.س`,
                              `Gross: ${p.grossEarnings} SAR | Deductions: ${p.totalDeductions} SAR`
                            )}
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="text-[10px] text-slate-400 block">{tx('صافي الراتب المستحق', 'Net Salary Due')}</span>
                          <span className="text-sm font-black text-emerald-600">{p.netSalary.toLocaleString()} {t('sar')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {driverTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{tx('لا توجد مهام مسجلة لهذا الكابتن', 'No tasks recorded for this driver')}</p>
              ) : (
                driverTasks.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{t.title}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{t.description}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: Attendance */}
          {activeTab === 'attendance' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {driverAttendance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{tx('لا توجد سجلات حضور مسجلة', 'No attendance records recorded')}</p>
              ) : (
                driverAttendance.map((a) => (
                  <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{a.date}</span>
                      <span className="text-slate-500 text-[10px] block">
                        {tx('دخول:', 'Check-in:')} {a.checkInTime || '—'} • {tx('خروج:', 'Check-out:')} {a.checkOutTime || '—'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      a.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.status === 'present' ? tx('حاضر', 'Present') : a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: Violations */}
          {activeTab === 'violations' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {driverViolations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{tx('سجل المخالفات نظيف - لا توجد مخالفات', 'Clean record - No violations recorded')}</p>
              ) : (
                driverViolations.map((v) => (
                  <div key={v.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{v.violationType}</p>
                      <p className="text-slate-500 text-[10px]">{tx('رقم المخالفة:', 'Violation #:')} {v.violationNumber} • {v.date}</p>
                    </div>
                    <div className="text-end">
                      <span className="font-bold text-rose-600 block">{v.amount} {t('sar')}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{v.status}</span>
                    </div>
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
        ownerLabel={tx(`الكابتن: ${driver.fullName}`, `Courier: ${driver.fullName}`)}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Delete Document Confirmation */}
      <DeleteWithPasswordModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDocConfirm}
        itemTitle={docToDelete ? `وثيقة "${docToDelete.title}" للكابتن ${driver?.fullName || ''}` : ''}
        itemType="وثيقة كابتن"
        warningNote="سيتم حفظ بيانات الوثيقة ورابط الملف في سلة المحذوفات للمدير العام."
      />
    </>
  );
};
