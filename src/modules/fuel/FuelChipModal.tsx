import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { FuelChip, FuelChipSystem, Vehicle, Driver, VehicleShift, VehicleShiftType } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { loadCompanySettings } from '../../services/settingsService';
import { SHIFT_PRESETS } from '../../services/shiftService';
import { useLanguage } from '../../context/LanguageContext';
import {
  CreditCard,
  User,
  Truck,
  Clock,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Hash,
  Wallet,
  Gauge,
  KeyRound,
} from 'lucide-react';

interface FuelChipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chipData: Partial<FuelChip>) => Promise<void>;
  editingChip?: FuelChip | null;
  preselectedDriverId?: string;
}

export const FuelChipModal: React.FC<FuelChipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingChip,
  preselectedDriverId,
}) => {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [existingChips, setExistingChips] = useState<FuelChip[]>([]);

  // Company settings
  const settings = loadCompanySettings();
  const defaultPlatform = (settings.fuelContractPlatform as FuelChipSystem) || 'fleet_plus';
  const defaultDaily = settings.fuelContractDailyQuota || 40;
  const defaultDays = settings.fuelContractWorkDays || 30;
  const defaultAccount = settings.fuelContractAccount || 'FLEETPLUS-KSA-9901';

  // Form states
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [shiftType, setShiftType] = useState<VehicleShiftType>('day_shift');
  const [system, setSystem] = useState<FuelChipSystem>(defaultPlatform);
  const [chipNumber, setChipNumber] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [status, setStatus] = useState<FuelChip['status']>('active');

  // Quotas & Budget
  const [dailyQuota, setDailyQuota] = useState<number>(defaultDaily);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(defaultDays);
  const [monthlyQuota, setMonthlyQuota] = useState<number>(defaultDaily * defaultDays);
  const [dailyCap, setDailyCap] = useState<number>(Math.max(100, defaultDaily * 2));

  const [fuelType, setFuelType] = useState<'gasoline_91' | 'gasoline_95' | 'diesel'>('gasoline_91');
  const [accountNumber, setAccountNumber] = useState(defaultAccount);
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate unique card serial number
  const generateCardNumber = (platformSystem: FuelChipSystem) => {
    let prefix = 'FP';
    if (platformSystem === 'waee') prefix = 'WEE';
    else if (platformSystem === 'sasco') prefix = 'SAS';
    else if (platformSystem === 'aldrees') prefix = 'ADR';
    else if (platformSystem === 'petromin') prefix = 'PET';
    else if (platformSystem === 'naft') prefix = 'NFT';
    else if (platformSystem === 'fleet_plus') prefix = 'FP';
    else prefix = 'FLT';

    const randomSerial = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomSerial}`;
  };

  useEffect(() => {
    async function loadMeta() {
      const [vList, dList, sList, cList] = await Promise.all([
        fetchCollection<Vehicle>('vehicles'),
        fetchCollection<Driver>('drivers'),
        fetchCollection<VehicleShift>('vehicle_shifts'),
        fetchCollection<FuelChip>('fuel_chips'),
      ]);
      setVehicles(vList);
      setDrivers(dList);
      setShifts(sList);
      setExistingChips(cList);

      if (editingChip) {
        setDriverId(editingChip.driverId || '');
        setVehicleId(editingChip.vehicleId || '');
        setShiftType((editingChip.shiftType as VehicleShiftType) || 'day_shift');
        setSystem(editingChip.system);
        setChipNumber(editingChip.chipNumber);
        setCardPin(editingChip.cardPin || '');
        setStatus(editingChip.status);
        const dQuota = editingChip.dailyQuota || defaultDaily;
        const days = editingChip.daysPerMonth || defaultDays;
        setDailyQuota(dQuota);
        setDaysPerMonth(days);
        setMonthlyQuota(editingChip.monthlyQuota || dQuota * days);
        setDailyCap(editingChip.dailyCap || Math.max(100, dQuota * 2));
        setFuelType(editingChip.fuelType || 'gasoline_91');
        setAccountNumber(editingChip.accountNumber || defaultAccount);
        setIssuedDate(editingChip.issuedDate || new Date().toISOString().slice(0, 10));
        setExpiryDate(editingChip.expiryDate || '');
        setNotes(editingChip.notes || '');
      } else {
        const targetDrvId = preselectedDriverId || (dList.length > 0 ? dList[0].id : '');
        if (targetDrvId) {
          applyDriverAssociation(targetDrvId, dList, vList, sList);
        }
        setSystem(defaultPlatform);
        setChipNumber(generateCardNumber(defaultPlatform));
        setCardPin(String(Math.floor(1000 + Math.random() * 9000)));
        setStatus('active');
        setDailyQuota(defaultDaily);
        setDaysPerMonth(defaultDays);
        setMonthlyQuota(defaultDaily * defaultDays);
        setDailyCap(Math.max(100, defaultDaily * 2));
        setFuelType('gasoline_91');
        setAccountNumber(defaultAccount);
        setIssuedDate(new Date().toISOString().slice(0, 10));
        setNotes('');
      }
    }
    loadMeta();
  }, [isOpen, editingChip, preselectedDriverId]);

  // Link driver with their vehicle and shift automatically
  const applyDriverAssociation = (
    drvId: string,
    dList = drivers,
    vList = vehicles,
    sList = shifts
  ) => {
    setDriverId(drvId);
    const d = dList.find((item) => item.id === drvId);

    // 1. Resolve vehicle assigned to this driver
    let matchedVeh: Vehicle | undefined;
    if (d?.assignedVehicleId) {
      matchedVeh = vList.find((v) => v.id === d.assignedVehicleId);
    }
    if (!matchedVeh) {
      matchedVeh = vList.find(
        (v) =>
          v.currentDriverId === drvId ||
          v.dayDriverId === drvId ||
          v.nightDriverId === drvId
      );
    }
    if (matchedVeh) {
      setVehicleId(matchedVeh.id);
      if (matchedVeh.fuelType) {
        setFuelType(
          matchedVeh.fuelType === 'gasoline_95'
            ? 'gasoline_95'
            : matchedVeh.fuelType === 'diesel'
            ? 'diesel'
            : 'gasoline_91'
        );
      }
      // Determine shift type based on vehicle dual shift mode
      if (matchedVeh.nightDriverId === drvId) {
        setShiftType('night_shift');
      } else {
        setShiftType('day_shift');
      }
    }

    // 2. Resolve recent shift from vehicle_shifts
    const driverShift = sList.find((s) => s.driverId === drvId && s.status === 'active');
    if (driverShift) {
      setShiftType(driverShift.shiftType);
      if (!matchedVeh && driverShift.vehicleId) {
        setVehicleId(driverShift.vehicleId);
      }
    }
  };

  const handleDriverChange = (drvId: string) => {
    applyDriverAssociation(drvId);
  };

  const handleSystemChange = (sys: FuelChipSystem) => {
    setSystem(sys);
    if (!editingChip) {
      setChipNumber(generateCardNumber(sys));
    }
  };

  // Quotas sync
  const handleDailyQuotaChange = (val: number) => {
    setDailyQuota(val);
    setMonthlyQuota(Math.round(val * daysPerMonth));
  };

  const handleDaysChange = (days: number) => {
    setDaysPerMonth(days);
    setMonthlyQuota(Math.round(dailyQuota * days));
  };

  const handleMonthlyQuotaChange = (monthly: number) => {
    setMonthlyQuota(monthly);
    if (daysPerMonth > 0) {
      setDailyQuota(Math.round(monthly / daysPerMonth));
    }
  };

  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  // Check if this driver already has another registered card
  const duplicateCard = existingChips.find(
    (c) => c.driverId === driverId && (!editingChip || c.id !== editingChip.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;

    setLoading(true);
    try {
      await onSubmit({
        driverId,
        driverName: selectedDriver?.fullName || '',
        vehicleId,
        vehiclePlate: selectedVehicle?.plateNumber || '',
        shiftType,
        system,
        chipNumber,
        cardPin,
        status,
        dailyQuota: Number(dailyQuota),
        daysPerMonth: Number(daysPerMonth),
        monthlyQuota: Number(monthlyQuota),
        dailyCap: Number(dailyCap),
        currentMonthSpent: editingChip ? editingChip.currentMonthSpent : 0,
        fuelType,
        accountNumber,
        issuedDate,
        expiryDate,
        notes,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingChip
          ? 'تعديل بيانات بطاقة الوقود وحصة المندوب'
          : 'تسليم وإصدار بطاقة وقود مخصصة لمندوب'
      }
      subtitle="ربط بطاقة الوقود الذكية بالمندوب والمركبة وورديته (11 ساعة) مع تحديد الحصة اليومية والمبلغ الشهري"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Association Indicator Card */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">
                  {selectedDriver ? selectedDriver.fullName : 'يرجى اختيار المندوب'}
                </p>
                <div className="flex items-center gap-2 text-slate-600 text-[11px] mt-0.5">
                  <span>إقامة: {selectedDriver?.iqamaNumber || '-'}</span>
                  <span>•</span>
                  <span>هاتف: {selectedDriver?.phone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-100 shrink-0">
              <div className="text-end">
                <span className="text-[10px] text-slate-500 block">الوردية المرتبطة بالمركبة</span>
                <span className="font-bold text-xs text-indigo-900 flex items-center gap-1">
                  {shiftType === 'night_shift' ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>الوردية المسائية (11 ساعة: 19:00 - 06:00)</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>الوردية الصباحية (11 ساعة: 07:00 - 18:00)</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicateCard && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">تنبيه: هذا المندوب مسجل له بطاقة وقود سابقة!</p>
              <p className="text-[11px] text-amber-800">
                البطاقة رقم <strong>{duplicateCard.chipNumber}</strong> ({duplicateCard.system}) بحصة{' '}
                {duplicateCard.dailyQuota} ر.س/يوم. يمكنك تعديل البطاقة القائمة أو إصدار بطاقة بديلة.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Driver, Vehicle & Shift */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" />
            <span>بيانات المندوب والمركبة والوردية (الربط التلقائي في قاعدة البيانات)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Driver Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المندوب المستلم للبطاقة *
              </label>
              <select
                value={driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                <option value="">-- اختر المندوب --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.iqamaNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المركبة المسندة للمندوب *
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                <option value="">-- اختر المركبة --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} - ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                وردية العمل المخصصة للمندوب *
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as VehicleShiftType)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                <option value="day_shift">☀️ الوردية الصباحية (11 ساعة: 07:00 - 18:00)</option>
                <option value="night_shift">🌙 الوردية المسائية (11 ساعة: 19:00 - 06:00)</option>
                <option value="custom_shift">⏱️ وردية مخصصة (11 ساعة)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Chip System & Card Details */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>نظام الشريحة وبيانات البطاقة المسلمة</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              مزود الخدمة: {system.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* System Provider */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نظام ومزود الشريحة *
              </label>
              <select
                value={system}
                onChange={(e) => handleSystemChange(e.target.value as FuelChipSystem)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                <option value="fleet_plus">🔹 فلييت بلس (Fleet Plus)</option>
                <option value="waee">🟢 واعي (Waee RFID - الدريس وبترول)</option>
                <option value="sasco">🔷 ساسكو أسطول (SASCO Fleet RFID)</option>
                <option value="aldrees">🔶 الدريس الذكية (Aldrees Smart Chip)</option>
                <option value="petromin">🔴 بترومين أسطول (Petromin Fleet Tag)</option>
                <option value="naft">🟣 شريحة نفط (Naft RFID)</option>
                <option value="other">⚪ أخرى / مزود مخصص</option>
              </select>
            </div>

            {/* Chip / Card Serial Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  رقم البطاقة / الشريحة *
                </label>
                <button
                  type="button"
                  onClick={() => setChipNumber(generateCardNumber(system))}
                  className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>توليد رقم</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: FP-841920 أو WEE-20941"
                  value={chipNumber}
                  onChange={(e) => setChipNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>الرقم السري للبطاقة (PIN)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: 1234"
                maxLength={6}
                value={cardPin}
                onChange={(e) => setCardPin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fuel Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نوع الوقود المعتمد
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                <option value="gasoline_91">بنزين 91 (أخضر)</option>
                <option value="gasoline_95">بنزين 95 (أحمر)</option>
                <option value="diesel">ديزل (شاحنات / نقل)</option>
              </select>
            </div>

            {/* Issued Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ تسليم البطاقة للمندوب
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Card Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حالة البطاقة
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                <option value="active">🟢 مفعلة ونشطة للمندوب</option>
                <option value="suspended">🔴 موقوفة مؤقتاً</option>
                <option value="limit_reached">🟡 بلغت الحد الشهري</option>
                <option value="replacement_needed">🟣 تحتاج استبدال / مفقودة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Daily Quota & Monthly Budget Calculation */}
        <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/50 border border-amber-200/90 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-600" />
              <span>ميزانية الوقود وحصة المندوب اليومية والشهرية</span>
            </h4>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300">
              حساب آلي للميزانية
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Daily Quota in SAR */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                حد الحصة اليومي (ر.س/يوم) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="1"
                  required
                  value={dailyQuota}
                  onChange={(e) => handleDailyQuotaChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black font-mono text-emerald-800 focus:ring-2 focus:ring-amber-500 outline-hidden text-center"
                />
                <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">
                  SAR
                </span>
              </div>
            </div>

            {/* Days per month */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                أيام العمل في الشهر
              </label>
              <select
                value={daysPerMonth}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden cursor-pointer"
              >
                <option value={30}>30 يوماً (شهر كامل)</option>
                <option value={26}>26 يوماً (باستثناء الجمعة)</option>
                <option value={24}>24 يوماً (دوام 6 أيام أسبوعياً)</option>
                <option value={22}>22 يوماً (دوام رسمي)</option>
              </select>
            </div>

            {/* Monthly Quota Total in SAR */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                المبلغ الشهري المخصص (ر.س) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="10"
                  required
                  value={monthlyQuota}
                  onChange={(e) => handleMonthlyQuotaChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black font-mono text-blue-900 focus:ring-2 focus:ring-amber-500 outline-hidden text-center"
                />
                <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">
                  SAR
                </span>
              </div>
            </div>

            {/* Daily Cap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سقف الصرف اليومي الأقصى
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="2000"
                  step="10"
                  value={dailyCap}
                  onChange={(e) => setDailyCap(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-hidden text-center"
                />
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">SAR</span>
              </div>
            </div>
          </div>

          {/* Quota Formula Explanation */}
          <div className="flex items-center justify-between text-[11px] text-amber-900 bg-amber-100/60 px-3 py-1.5 rounded-xl border border-amber-200">
            <span>
              💡 معادلة الحساب: <strong>{dailyQuota} ر.س / يوم</strong> ×{' '}
              <strong>{daysPerMonth} يوم</strong> ={' '}
              <strong className="text-emerald-800">{monthlyQuota.toLocaleString()} ر.س شهرياً</strong>
            </span>
            <span className="text-[10px] text-amber-800">
              يتم منع صرف الوقود آلياً عند نفاد الحصة اليومية
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات تسليم البطاقة / تعليمات المندوب
          </label>
          <input
            type="text"
            placeholder="مثال: تم تسليم البطاقة للمندوب مع تعليمات التعبئة في محطات فلييت بلس وساسكو المعتمدة"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !driverId}
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            {loading ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingChip ? 'حفظ التعديلات' : 'إصدار وتسليم البطاقة'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
