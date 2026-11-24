import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  CreditCard,
  FileCheck,
  Briefcase,
  Camera,
  FolderPlus,
  ShieldCheck,
  Calendar,
  KeyRound,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  IdCard,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { Driver, DriverStatus, Vehicle, PlatformContract, RentedAccountPlatform } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (driverData: Partial<Driver>) => Promise<void>;
  initialData?: Driver | null;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t, tx, language } = useLanguage();
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'freelancer_pool' | 'media'>('info');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  // Basic Info
  const [fullName, setFullName] = useState('');
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('سعودي');
  const [birthDate, setBirthDate] = useState('1995-01-01');
  const [iqamaExpiryDate, setIqamaExpiryDate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('خصوصي');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [address, setAddress] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [primaryPlatform, setPrimaryPlatform] = useState<string>('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [status, setStatus] = useState<DriverStatus>('active');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Compensation & Banking (الاستحقاقات والبيانات البنكية)
  const [basicSalary, setBasicSalary] = useState<number>(3000);
  const [orderCommissionRate, setOrderCommissionRate] = useState<number>(3.5);
  const [bankIban, setBankIban] = useState<string>('SA');
  const [bankName, setBankName] = useState<string>('مصرف الراجحي');

  // Freelancer Accounts Pool Generation Settings

  // Media & Documents
  const [photoUrl, setPhotoUrl] = useState('');
  const [iqamaDocUrl, setIqamaDocUrl] = useState('');
  const [licenseDocUrl, setLicenseDocUrl] = useState('');
  const [medicalDocUrl, setMedicalDocUrl] = useState('');
  const [contractDocUrl, setContractDocUrl] = useState('');
  const [driverCardDocUrl, setDriverCardDocUrl] = useState('');
  const [operationCardDocUrl, setOperationCardDocUrl] = useState('');
  const [customDocs, setCustomDocs] = useState<
    Array<{ id: string; title: string; fileUrl: string; notes?: string }>
  >([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
      const p = await fetchCollection<PlatformContract>('platforms');
      setPlatforms(p);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setIqamaNumber(initialData.iqamaNumber || '');
      setPhone(initialData.phone || '');
      setNationality(initialData.nationality || 'سعودي');
      setBirthDate(initialData.birthDate || '1995-01-01');
      setIqamaExpiryDate(initialData.iqamaExpiryDate || '');
      setLicenseNumber(initialData.licenseNumber || '');
      setLicenseType(initialData.licenseType || 'خصوصي');
      setLicenseExpiryDate(initialData.licenseExpiryDate || '');
      setAddress(initialData.address || '');
      setPlatformId(initialData.platformId || '');
      setPrimaryPlatform(initialData.primaryPlatform || initialData.platformId || '');
      setAssignedVehicleId(initialData.assignedVehicleId || '');
      setStatus(initialData.status || 'active');
      setStartDate(initialData.startDate || new Date().toISOString().slice(0, 10));
      setNotes(initialData.notes || '');
      setBasicSalary(initialData.basicSalary !== undefined ? initialData.basicSalary : 3000);
      setOrderCommissionRate(initialData.orderCommissionRate !== undefined ? initialData.orderCommissionRate : 3.5);
      setBankIban(initialData.bankIban || 'SA');
      setBankName(initialData.bankName || 'مصرف الراجحي');

      setPhotoUrl(initialData.photoUrl || initialData.avatar || '');
      setIqamaDocUrl(initialData.iqamaDocUrl || '');
      setLicenseDocUrl(initialData.licenseDocUrl || '');
      setMedicalDocUrl(initialData.medicalDocUrl || '');
      setContractDocUrl(initialData.contractDocUrl || '');
      setDriverCardDocUrl(initialData.driverCardDocUrl || '');
      setOperationCardDocUrl(initialData.operationCardDocUrl || '');
      setCustomDocs(
        initialData.customDocs && Array.isArray(initialData.customDocs)
          ? [...initialData.customDocs]
          : []
      );
    } else {
      setFullName('');
      setIqamaNumber('');
      setPhone('+966 5');
      setNationality('سعودي');
      setBirthDate('1995-01-01');
      setIqamaExpiryDate('2027-06-30');
      setLicenseNumber('');
      setLicenseType('خصوصي');
      setLicenseExpiryDate('2028-06-30');
      setAddress('');
      setPlatformId('');
      setPrimaryPlatform('');
      setAssignedVehicleId('');
      setStatus('active');
      setStartDate(new Date().toISOString().slice(0, 10));
      setNotes('');

      setPhotoUrl('');
      setIqamaDocUrl('');
      setLicenseDocUrl('');
      setMedicalDocUrl('');
      setContractDocUrl('');
      setDriverCardDocUrl('');
      setOperationCardDocUrl('');
      setCustomDocs([]);
    }
    setActiveFormTab('info');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      fullName,
      iqamaNumber,
      phone,
      nationality,
      birthDate,
      iqamaExpiryDate,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      address,
      platformId,
      primaryPlatform,
      assignedVehicleId,
      status,
      startDate,
      notes,
      basicSalary: Number(basicSalary),
      orderCommissionRate: Number(orderCommissionRate),
      bankIban,
      bankName,
      photoUrl,
      avatar: photoUrl,
      iqamaDocUrl,
      licenseDocUrl,
      medicalDocUrl,
      contractDocUrl,
      driverCardDocUrl,
      operationCardDocUrl,
      customDocs,
    });
    setLoading(false);
    onClose();
  };

  const attachedDocsCount = [
    photoUrl,
    iqamaDocUrl,
    licenseDocUrl,
    medicalDocUrl,
    contractDocUrl,
    driverCardDocUrl,
    operationCardDocUrl,
    ...customDocs.map((c) => c.fileUrl),
  ].filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'تعديل بيانات الكابتن ومستنداته' : 'إضافة كابتن توصيل جديد'}
      subtitle="سجل الكابتن، المستندات الرسمية، الصور، المنصة والمركبة المسندة"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Modal Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveFormTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFormTab === 'info'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>البيانات الأساسية والنظامية</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveFormTab('freelancer_pool')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFormTab === 'freelancer_pool'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>مخزون الفريلانسر</span>
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
            <span>الصور والمستندات الرسمية ({attachedDocsCount})</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeFormTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: فيصل محمد العتيبي"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الإقامة / الهوية *</label>
                <input
                  type="text"
                  required
                  value={iqamaNumber}
                  onChange={(e) => setIqamaNumber(e.target.value)}
                  placeholder="10 أرقام"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الجنسية *</label>
                <input
                  type="text"
                  required
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ انتهاء الإقامة *</label>
                <input
                  type="date"
                  required
                  value={iqamaExpiryDate}
                  onChange={(e) => setIqamaExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم رخصة القيادة *</label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="رقم الرخصة أو الإقامة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الرخصة</label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="خصوصي">خصوصي (Private)</option>
                  <option value="عمومي نقل خفيف">عمومي نقل خفيف (Light Commercial)</option>
                  <option value="عمومي نقل ثقيل">عمومي نقل ثقيل (Heavy Commercial)</option>
                  <option value="دراجة نارية">دراجة نارية (Motorcycle)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ انتهاء الرخصة *</label>
                <input
                  type="date"
                  required
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان الوطني / السكن</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الرياض، حي السلي..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المنصة الأساسية المسندة للتشغيل المباشر *
                </label>
                <select
                  value={primaryPlatform}
                  onChange={(e) => {
                    setPrimaryPlatform(e.target.value);
                    setPlatformId(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden"
                >
                  <option value="">اختر منصة مسجلة...</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  المزامنة تربط الحسابات المسجلة بعقود نشطة فقط، ولا تنشئ حسابات تلقائياً
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة المسندة</label>
                <select
                  value={assignedVehicleId}
                  onChange={(e) => setAssignedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="">بدون مركبة حالياً</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">حالة السائق</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriverStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="inactive">غير نشط (Inactive)</option>
                  <option value="suspended">موقوف (Suspended)</option>
                  <option value="vacation">إجازة (Vacation)</option>
                  <option value="sick_leave">مرضي (Sick Leave)</option>
                  <option value="terminated">منتهي خدماته (Terminated)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ بداية العمل</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الراتب الأساسي (ر.س)</label>
                <input
                  type="number"
                  min={0}
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  placeholder="3000"
                  className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عمولة الطلب (ر.س/طلب)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={orderCommissionRate}
                  onChange={(e) => setOrderCommissionRate(Number(e.target.value))}
                  placeholder="3.5"
                  className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الآيبان البنكي (IBAN)</label>
                <input
                  type="text"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="SA..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم البنك</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مصرف الراجحي / الأهلي..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية ملاحظات خاصة بالسائق أو شروط تشغيله..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Registered freelancer accounts are linked from Freelancer Management. */}
        {activeFormTab === 'freelancer_pool' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            الحسابات المنشأة فعلياً تُدار في شاشة الفريلانسر، وتُربط هنا بعقد منصة نشط فقط.
          </div>
        )}

        {/* TAB 3: PHOTOS & DOCUMENTS */}
        {activeFormTab === 'media' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                يتم ربط وحفظ المستندات المرفقة تلقائياً في <strong>إدارة المستندات والأرشيف السحابي</strong>، مع تتبع مواعيد انتهائها وتنبيهات التجديد.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Personal Photo */}
              <FileUploadZone
                label="الصورة الشخصية للكابتن (Personal Photo)"
                sublabel="صورة واضحة للكابتن للتعريف وتطبيق المناديب (JPEG, PNG)"
                value={photoUrl}
                onChange={(val) => setPhotoUrl(val)}
                accept="image/png,image/jpeg,image/webp"
                isImageOnly={true}
                asDataUrl={true}
                previewHeight="h-44"
              />

              {/* Driving License */}
              <FileUploadZone
                label="صورة رخصة القيادة (Driving License Doc)"
                sublabel="مسح ضوئي لرخصة القيادة (سارية المفعول)"
                value={licenseDocUrl}
                onChange={(val) => setLicenseDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Iqama Doc */}
              <FileUploadZone
                label="صورة الإقامة / الهوية الوطنية (Iqama Doc)"
                sublabel="مسح ضوئي لبطاقة الإقامة أو الهوية الوطنية"
                value={iqamaDocUrl}
                onChange={(val) => setIqamaDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Driver Card (كرت السائق - هيئة النقل) */}
              <FileUploadZone
                label="وثيقة كرت السائق (Driver Card - TGA)"
                sublabel="بطاقة السائق المهنية الصادرة من الهيئة العامة للنقل"
                value={driverCardDocUrl}
                onChange={(val) => setDriverCardDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Operation Card (كرت التشغيل للمندوب) */}
              <FileUploadZone
                label="كرت التشغيل للمندوب (Courier Operation Card)"
                sublabel="بطاقة تصريح تشغيل المندوب الميداني سارية المفعول"
                value={operationCardDocUrl}
                onChange={(val) => setOperationCardDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Medical Exam */}
              <FileUploadZone
                label="شهادة الفحص الطبي (Medical Check)"
                sublabel="تقرير اللياقة الطبية أو فحص النظر المعتمد"
                value={medicalDocUrl}
                onChange={(val) => setMedicalDocUrl(val)}
                previewHeight="h-44"
              />

              {/* Contract */}
              <FileUploadZone
                label="عقد العمل / اتفاقية التشغيل (Contract Doc)"
                sublabel="نسخة العقد الموقعة أو تفويض منصة التوصيل"
                value={contractDocUrl}
                onChange={(val) => setContractDocUrl(val)}
                previewHeight="h-44"
              />
            </div>

            {/* Dynamic Custom Additional Documents Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-emerald-600" />
                    <span>المستندات الإضافية المخصصة (Custom Documents)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    يمكنك إضافة أي وثائق إضافية وتسميتها بحرية وربطها بالأرشيف السحابي
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCustomDocs((prev) => [
                      ...prev,
                      {
                        id: `cdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        title: '',
                        fileUrl: '',
                        notes: '',
                      },
                    ])
                  }
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مستند إضافي</span>
                </button>
              </div>

              {customDocs.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  لا توجد مستندات إضافية مخصصة حتى الآن. اضغط على «إضافة مستند إضافي» لإرفاق أي وثيقة أخرى وتسميتها.
                </div>
              ) : (
                <div className="space-y-3">
                  {customDocs.map((cd, idx) => (
                    <div
                      key={cd.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            اسم المستند الإضافي #{idx + 1} *
                          </label>
                          <input
                            type="text"
                            value={cd.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomDocs((prev) =>
                                prev.map((item) =>
                                  item.id === cd.id ? { ...item, title: val } : item
                                )
                              );
                            }}
                            placeholder="مثال: تفويض قيادة خارجي / براءة ذمة / إقرار استلام عهدة..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setCustomDocs((prev) => prev.filter((item) => item.id !== cd.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mt-4"
                          title="حذف هذا المستند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <FileUploadZone
                        label={`ملف المستند: ${cd.title || `مستند إضافي #${idx + 1}`}`}
                        sublabel="ارفع نسخة المستند (JPG, PNG, PDF)"
                        value={cd.fileUrl}
                        onChange={(val) => {
                          setCustomDocs((prev) =>
                            prev.map((item) =>
                              item.id === cd.id ? { ...item, fileUrl: val } : item
                            )
                          );
                        }}
                        previewHeight="h-32"
                      />
                    </div>
                  ))}
                </div>
              )}
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
                <span>الانتقال لإرفاق الصور والوثائق ({attachedDocsCount})</span>
                <span>←</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className="text-slate-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>→</span>
                <span>العودة للبيانات الأساسية</span>
              </button>
            )}
          </div>

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
              {loading ? t('loading') : 'حفظ الكابتن والمستندات'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
