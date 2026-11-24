import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { FuelRecord, Vehicle, Driver, FuelChip, FuelChipSystem, VehicleShift, VehicleShiftType } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { loadCompanySettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  CreditCard,
  User,
  Truck,
  Clock,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  Gauge,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface FuelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<FuelRecord>) => Promise<void>;
  preselectedDriverId?: string;
  preselectedVehicleId?: string;
  existingFuelRecords?: FuelRecord[];
}

export const FuelFormModal: React.FC<FuelFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedDriverId,
  preselectedVehicleId,
  existingFuelRecords = [],
}) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const settings = loadCompanySettings();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelChips, setFuelChips] = useState<FuelChip[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [allRecords, setAllRecords] = useState<FuelRecord[]>([]);

  // Form states
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTimeStr = `${todayStr} ${now.toTimeString().slice(0, 5)}`;

  const [date, setDate] = useState(currentTimeStr);
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [shiftType, setShiftType] = useState<VehicleShiftType>('day_shift');
  const [chipSystem, setChipSystem] = useState<FuelChipSystem>('fleet_plus');
  const [chipNumber, setChipNumber] = useState('');
  const [chipId, setChipId] = useState<string | undefined>(undefined);
  const [dailyQuotaAllowed, setDailyQuotaAllowed] = useState<number>(40);

  const [gasStation, setGasStation] = useState('محطة فلييت بلس المعتمدة');
  const [stationCity, setStationCity] = useState('الرياض');
  const [fuelType, setFuelType] = useState('بنزين 91');
  const [pricePerLiter, setPricePerLiter] = useState<number>(2.18);
  const [totalCost, setTotalCost] = useState<number>(40);
  const [liters, setLiters] = useState<number>(18.35);
  const [odometer, setOdometer] = useState<number>(45000);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const [dList, vList, cList, sList, rList] = await Promise.all([
        fetchCollection<Driver>('drivers'),
        fetchCollection<Vehicle>('vehicles'),
        fetchCollection<FuelChip>('fuel_chips'),
        fetchCollection<VehicleShift>('vehicle_shifts'),
        fetchCollection<FuelRecord>('fuel_records'),
      ]);

      setDrivers(dList);
      setVehicles(vList);
      setFuelChips(cList);
      setShifts(sList);
      setAllRecords(rList);

      const targetDrvId = preselectedDriverId || (dList.length > 0 ? dList[0].id : '');
      if (targetDrvId) {
        handleDriverSelect(targetDrvId, dList, vList, cList, sList, rList);
      }

      setInvoiceNumber(`INV-FLT-${Math.floor(100000 + Math.random() * 900000)}`);
    }
    loadMeta();
  }, [isOpen, preselectedDriverId, preselectedVehicleId]);

  // When driver is selected, auto-resolve card, vehicle, shift, and today's quota claim status
  const handleDriverSelect = (
    drvId: string,
    dList = drivers,
    vList = vehicles,
    cList = fuelChips,
    sList = shifts,
    rList = allRecords
  ) => {
    setDriverId(drvId);
    const drv = dList.find((d) => d.id === drvId);

    // 1. Resolve Driver's Fuel Card / Chip
    const matchedCard = cList.find((c) => c.driverId === drvId && c.status === 'active');
    if (matchedCard) {
      setChipId(matchedCard.id);
      setChipSystem(matchedCard.system);
      setChipNumber(matchedCard.chipNumber);
      const quota = matchedCard.dailyQuota || 40;
      setDailyQuotaAllowed(quota);
      setTotalCost(quota);
      setLiters(Number((quota / pricePerLiter).toFixed(2)));
      setDefaultStationBySystem(matchedCard.system);
    } else {
      setChipId(undefined);
      setChipNumber('لا توجد بطاقة مسجلة');
      setDailyQuotaAllowed(40);
    }

    // 2. Resolve Driver's Vehicle
    let matchedVeh: Vehicle | undefined;
    if (matchedCard?.vehicleId) {
      matchedVeh = vList.find((v) => v.id === matchedCard.vehicleId);
    } else if (drv?.assignedVehicleId) {
      matchedVeh = vList.find((v) => v.id === drv.assignedVehicleId);
    } else {
      matchedVeh = vList.find(
        (v) =>
          v.currentDriverId === drvId ||
          v.dayDriverId === drvId ||
          v.nightDriverId === drvId
      );
    }

    if (matchedVeh) {
      setVehicleId(matchedVeh.id);
      if (matchedVeh.currentOdometer) setOdometer(matchedVeh.currentOdometer);
      if (matchedVeh.fuelType) {
        setFuelType(
          matchedVeh.fuelType === 'gasoline_95'
            ? 'بنزين 95'
            : matchedVeh.fuelType === 'diesel'
            ? 'ديزل'
            : 'بنزين 91'
        );
      }
      if (matchedVeh.nightDriverId === drvId) {
        setShiftType('night_shift');
      } else {
        setShiftType('day_shift');
      }
    }

    // 3. Resolve Driver's Shift
    const activeShift = sList.find((s) => s.driverId === drvId && s.status === 'active');
    if (activeShift) {
      setShiftType(activeShift.shiftType);
      if (!matchedVeh && activeShift.vehicleId) {
        setVehicleId(activeShift.vehicleId);
      }
    }
  };

  const setDefaultStationBySystem = (sys: FuelChipSystem) => {
    switch (sys) {
      case 'fleet_plus':
        setGasStation('محطة فلييت بلس المعتمدة');
        break;
      case 'waee':
        setGasStation('محطة واعي - الدريس حي الياسمين');
        break;
      case 'sasco':
        setGasStation('محطة ساسكو أسطول نخلة - طريق الملك سلمان');
        break;
      case 'aldrees':
        setGasStation('محطة الدريس الذكية - طريق الملك فهد');
        break;
      case 'petromin':
        setGasStation('محطة بترومين إكسبريس - مخرج 5');
        break;
      case 'naft':
        setGasStation('محطة نفط الذكية - طريق خريص');
        break;
      default:
        setGasStation('محطة وقود معتمدة');
    }
  };

  // Sync Total Cost and Liters
  const handleCostChange = (cost: number) => {
    setTotalCost(cost);
    if (pricePerLiter > 0) {
      setLiters(Number((cost / pricePerLiter).toFixed(2)));
    }
  };

  const handleLitersChange = (l: number) => {
    setLiters(l);
    setTotalCost(Number((l * pricePerLiter).toFixed(2)));
  };

  const handlePriceChange = (price: number) => {
    setPricePerLiter(price);
    if (price > 0 && totalCost > 0) {
      setLiters(Number((totalCost / price).toFixed(2)));
    }
  };

  // Live checks for Today's quota consumption by this driver
  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const matchedChip = fuelChips.find((c) => c.driverId === driverId);

  const todayRecords = (existingFuelRecords.length > 0 ? existingFuelRecords : allRecords).filter(
    (r) => r.driverId === driverId && (r.date || '').startsWith(todayStr)
  );

  const spentTodaySoFar = todayRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const alreadyClaimedToday = todayRecords.length > 0;
  const remainingTodayQuota = Math.max(0, dailyQuotaAllowed - spentTodaySoFar);

  // Quota status computation
  let quotaStatus: 'fully_claimed' | 'partially_claimed' | 'quota_exceeded' = 'fully_claimed';
  if (totalCost + spentTodaySoFar > dailyQuotaAllowed) {
    quotaStatus = 'quota_exceeded';
  } else if (totalCost + spentTodaySoFar < dailyQuotaAllowed) {
    quotaStatus = 'partially_claimed';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !vehicleId) return;

    setLoading(true);
    try {
      const fraudCode = `SEC-FUEL-${Math.floor(100000 + Math.random() * 900000)}`;
      await onSubmit({
        date,
        driverId,
        driverName: selectedDriver?.fullName || '',
        vehicleId,
        vehiclePlate: selectedVehicle?.plateNumber || '',
        shiftType,
        chipId,
        chipSystem,
        chipNumber,
        dailyQuotaAllowed,
        quotaStatus,
        transactionNumber: `TXN-FLT-${Math.floor(1000000 + Math.random() * 9000000)}`,
        invoiceNumber,
        gasStation,
        stationCity,
        fuelType,
        liters: Number(liters),
        pricePerLiter: Number(pricePerLiter),
        totalCost: Number(totalCost),
        odometer: Number(odometer),
        receiptUrl:
          receiptUrl ||
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
        isAbnormal: liters > 55 || totalCost > dailyQuotaAllowed * 1.5,
        createdById: currentUser?.id || 'sys',
        createdByName: currentUser?.fullName || 'مسؤول الحركة والوقود',
        createdByRole: currentUser?.role || 'supervisor',
        fraudVerificationCode: fraudCode,
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
      title="تسجيل تعبئة وصرف حصة وقود لمندوب"
      subtitle="ربط العملية بالمندوب وورديته (11 ساعة) وبطاقته المعتمدة وتحديث رصيد الحصة اليومية آلياً"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-fraud banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription="يتم تسجيل صرف الحصة وتوثيقها باسم المسؤول المالي لضبط التوزيع ومنع صرف حصص مكررة للمندوب."
        />

        {/* Live Today's Quota Check Status Banner */}
        <div
          className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            alreadyClaimedToday
              ? 'bg-amber-50/90 border-amber-300 text-amber-900'
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                alreadyClaimedToday ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {alreadyClaimedToday ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-sm">
                {alreadyClaimedToday
                  ? `تنبيه: المندوب استلم حصته اليوم (${spentTodaySoFar} ر.س)!`
                  : 'المندوب مؤهل لاستلام حصة الوقود اليومية كاملة'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                الحصة اليومية المعتمدة: <strong>{dailyQuotaAllowed} ر.س</strong> • المصروف اليوم:{' '}
                <strong>{spentTodaySoFar} ر.س</strong> • المتبقي اليوم:{' '}
                <strong>{remainingTodayQuota} ر.س</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                alreadyClaimedToday
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {alreadyClaimedToday ? 'حصة مستلمة مسبقاً' : 'بانتظار التعبئة اليوم'}
            </span>
          </div>
        </div>

        {/* Driver Selection & Auto-linked Information */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Primary: Driver Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>المندوب المستلم للحصة *</span>
              </label>
              <select
                value={driverId}
                onChange={(e) => handleDriverSelect(e.target.value)}
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

            {/* Auto-resolved Vehicle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>المركبة المسندة للمندوب *</span>
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
                    {v.make} {v.model} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-resolved Shift */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>الوردية المرتبطة (11 ساعة) *</span>
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as VehicleShiftType)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
              >
                <option value="day_shift">☀️ الصباحية (11 ساعة: 07:00 - 18:00)</option>
                <option value="night_shift">🌙 المسائية (11 ساعة: 19:00 - 06:00)</option>
                <option value="custom_shift">⏱️ وردية مخصصة (11 ساعة)</option>
              </select>
            </div>
          </div>

          {/* Linked Card Snapshot */}
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800">
                بطاقة الوقود المخصصة للمندوب:
              </span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {chipNumber || 'غير متوفرة'}
              </span>
              <span className="text-[10px] text-slate-500">
                (نظام {chipSystem.toUpperCase()})
              </span>
            </div>

            <div className="text-[11px] text-slate-600">
              الحصة اليومية المقررة:{' '}
              <strong className="text-slate-900 font-mono">{dailyQuotaAllowed} ر.س</strong>
              {matchedChip && (
                <span className="ms-2 text-slate-400">
                  • الرصيد الشهري المتبقي:{' '}
                  <strong className="text-emerald-700 font-mono">
                    {Math.max(0, matchedChip.monthlyQuota - (matchedChip.currentMonthSpent || 0))} ر.س
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Refuel Transaction Details */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-emerald-600" />
            <span>بيانات وقيمة التعبئة وصرف الحصة</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Amount / Total Cost */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                المبلغ المصروف (ر.س) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="1000"
                  required
                  value={totalCost}
                  onChange={(e) => handleCostChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-black font-mono text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-hidden text-center"
                />
                <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">
                  SAR
                </span>
              </div>
            </div>

            {/* Liters */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                كمية الوقود (لتر)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={liters}
                  onChange={(e) => handleLitersChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden text-center"
                />
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">L</span>
              </div>
            </div>

            {/* Price Per Liter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سعر اللتر (ر.س/لتر)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={pricePerLiter}
                onChange={(e) => handlePriceChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-hidden text-center"
              />
            </div>

            {/* Current Odometer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>قراءة العداد (كم) *</span>
              </label>
              <input
                type="number"
                required
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ ووقت التعبئة *
              </label>
              <input
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            {/* Gas Station */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم المحطة / الفرع *
              </label>
              <input
                type="text"
                required
                value={gasStation}
                onChange={(e) => setGasStation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            {/* Invoice / Receipt Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رقم الإيصال / الفاتورة
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات إضافية على عملية التعبئة
          </label>
          <input
            type="text"
            placeholder="مثال: تعبئة الحصة اليومية المعتمدة قبل انطلاق الوردية الصباحية"
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
            disabled={loading || !driverId || !vehicleId}
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            {loading ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>توثيق وصرف حصة الوقود</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
