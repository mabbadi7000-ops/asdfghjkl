import React, { useState, useMemo } from 'react';
import {
  Navigation,
  Activity,
  Gauge,
  Zap,
  MapPin,
  TrendingUp,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BatteryCharging,
  Sliders,
  Radio,
  Clock,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { Vehicle, Driver, FuelRecord, VehicleTelemetry } from '../../types';
import { calculateVehicleTelemetry } from '../../services/predictiveMaintenanceService';
import { updateDocument, createDocument } from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SmartVehicleTrackingProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelRecords: FuelRecord[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onRefreshTelemetry?: () => void;
}

export const SmartVehicleTracking: React.FC<SmartVehicleTrackingProps> = ({
  vehicles,
  drivers,
  fuelRecords,
  onSelectVehicle,
  onRefreshTelemetry,
}) => {
  const { currentUser } = useAuth();
  const { t, tx, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'idle' | 'off'>('all');
  const [activeTelemetryId, setActiveTelemetryId] = useState<string | null>(null);

  // Quick Odometer Update Modal State
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [selectedVehicleForOdo, setSelectedVehicleForOdo] = useState<Vehicle | null>(null);
  const [newOdometerValue, setNewOdometerValue] = useState<number>(0);
  const [odoNotes, setOdoNotes] = useState('');
  const [isUpdatingOdo, setIsUpdatingOdo] = useState(false);
  const [isSyncingTelemetry, setIsSyncingTelemetry] = useState(false);

  // Compute telemetry for each vehicle
  const telemetryList = useMemo(() => {
    return vehicles.map((v) => {
      const driver = drivers.find((d) => d.id === v.currentDriverId);
      return {
        vehicle: v,
        telemetry: calculateVehicleTelemetry(v, fuelRecords, driver?.fullName),
      };
    });
  }, [vehicles, drivers, fuelRecords]);

  // Filtered list
  const filteredList = useMemo(() => {
    return telemetryList.filter(({ vehicle, telemetry }) => {
      const matchSearch =
        vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        telemetry.driverName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCity = selectedCity === 'all' || telemetry.currentLocation.city === selectedCity;
      const matchStatus = statusFilter === 'all' || telemetry.engineStatus === statusFilter;

      return matchSearch && matchCity && matchStatus;
    });
  }, [telemetryList, searchQuery, selectedCity, statusFilter]);

  // Selected telemetry item for cockpit view
  const activeItem = useMemo(() => {
    if (activeTelemetryId) {
      return telemetryList.find((item) => item.vehicle.id === activeTelemetryId) || telemetryList[0];
    }
    return filteredList[0] || telemetryList[0];
  }, [activeTelemetryId, telemetryList, filteredList]);

  // Handle Quick Odometer update
  const handleOpenOdometerModal = (v: Vehicle) => {
    setSelectedVehicleForOdo(v);
    setNewOdometerValue(v.currentOdometer + 150);
    setOdoNotes('');
    setIsOdometerModalOpen(true);
  };

  const handleSaveOdometer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForOdo) return;

    setIsUpdatingOdo(true);
    const distanceDelta = Math.max(0, newOdometerValue - selectedVehicleForOdo.currentOdometer);

    // 1. Update vehicle odometer
    await updateDocument<Vehicle>('vehicles', selectedVehicleForOdo.id, {
      currentOdometer: Number(newOdometerValue),
    });

    // 2. Add mileage log
    await createDocument('mileage_logs', {
      vehicleId: selectedVehicleForOdo.id,
      plateNumber: selectedVehicleForOdo.plateNumber,
      driverId: selectedVehicleForOdo.currentDriverId || '',
      date: new Date().toISOString().slice(0, 10),
      odometer: Number(newOdometerValue),
      distanceTraveled: distanceDelta,
      recordedBy: currentUser?.fullName || 'مشرف العمليات',
      source: 'manual',
      notes: odoNotes || 'تحديث عداد يدوي مدقق',
      createdAt: new Date().toISOString(),
    });

    // 3. Log audit
    await logAuditAction(
      currentUser,
      'UPDATE_ODOMETER',
      'vehicles',
      selectedVehicleForOdo.id,
      `تحديث قراءة العداد الفعلي للمركبة ${selectedVehicleForOdo.plateNumber} إلى ${newOdometerValue} كم (+${distanceDelta} كم)`
    );

    setIsUpdatingOdo(false);
    setIsOdometerModalOpen(false);
  };

  // Simulate instant IoT Telematics Sync
  const handleTriggerTelemetrySync = () => {
    setIsSyncingTelemetry(true);
    setTimeout(() => {
      setIsSyncingTelemetry(false);
      if (onRefreshTelemetry) onRefreshTelemetry();
    }, 800);
  };

  // Total Fleet Distance Stats
  const totalFleetOdometer = vehicles.reduce((sum, v) => sum + (v.currentOdometer || 0), 0);
  const totalFleetDailyKm = telemetryList.reduce((sum, t) => sum + t.telemetry.dailyDistanceKm, 0);
  const activeMovingVehicles = telemetryList.filter((t) => t.telemetry.currentSpeed > 0).length;
  const avgFleetHealth = Math.round(
    telemetryList.reduce((sum, t) => sum + t.telemetry.overallHealthScore, 0) / (telemetryList.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm border border-slate-700">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
            <span>{tx('المركبات النشطة لحظياً', 'Live Active Fleet')}</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black">{activeMovingVehicles} <span className="text-xs font-normal text-slate-400">/ {vehicles.length} {tx('مركبة', 'vehicles')}</span></div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <Activity className="w-3 h-3" />
            <span>{tx('بث فوري عبر نظام التتبع الذكي GPS', 'Live GPS telemetry stream')}</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('إجمالي المسافة المقطوعة اليوم', 'Total Distance Today')}</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalFleetDailyKm.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t('km')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx(`معدل ${(totalFleetDailyKm / (vehicles.length || 1)).toFixed(0)} كم / مركبة يومياً`, `Avg ${(totalFleetDailyKm / (vehicles.length || 1)).toFixed(0)} KM / vehicle daily`)}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('متوسط مؤشر صحة الأصول', 'Fleet Health Index')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {avgFleetHealth}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx('تقييم كفاءة المحرك، الزيوت، والإطارات', 'Engine, fluids, & wear score')}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('تراكم عدادات الأسطول', 'Fleet Cumulative KM')}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {(totalFleetOdometer / 1000).toFixed(1)}k <span className="text-xs font-bold text-slate-500">{t('km')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx('مجموع العدادات الموثقة بقاعدة البيانات', 'Total verified database odometer')}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Vehicle Telemetry Cockpit | Right Live Fleet Tracker & Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Active Vehicle Live Cockpit (1 Column on desktop) */}
        {activeItem && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 space-y-5">
              {/* Cockpit Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider">
                      {activeItem.telemetry.engineStatus === 'running' ? tx('متحركة', 'Running') : activeItem.telemetry.engineStatus === 'idle' ? tx('متوقفة (محرك يعمل)', 'Idle') : tx('مطفأة', 'Off')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeItem.telemetry.currentLocation.city}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1 tracking-wider font-mono">
                    {activeItem.vehicle.plateNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeItem.vehicle.make} {activeItem.vehicle.model} ({activeItem.vehicle.year})
                  </p>
                </div>

                <div className="text-end">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono">
                    <span className="text-lg font-black text-emerald-400 leading-none">
                      {activeItem.telemetry.currentSpeed}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans">{t('km')} / {tx('س', 'h')}</span>
                  </div>
                </div>
              </div>

              {/* Live Location Marker Box */}
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{tx('الموقع الجغرافي اللحظي:', 'Live GPS Location:')}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {activeItem.telemetry.currentLocation.lat.toFixed(4)}, {activeItem.telemetry.currentLocation.lng.toFixed(4)}
                  </span>
                </div>
                <p className="text-white font-medium line-clamp-1">
                  {activeItem.telemetry.currentLocation.address} ({activeItem.telemetry.currentLocation.city})
                </p>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/60 font-mono">
                  <span>{tx('الكابتن المخصص:', 'Assigned Driver:')} <strong className="text-slate-200 font-sans">{activeItem.telemetry.driverName}</strong></span>
                  <span>{tx('آخر اتصال:', 'Last Ping:')} 2 {tx('ثوانٍ', 'sec ago')}</span>
                </div>
              </div>

              {/* Asset Wear & Component Life Gauges */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{tx('مؤشرات استهلاك الأجزاء الحيوية', 'Vital Component Health')}</span>
                  <span className="text-emerald-400 font-mono">{activeItem.telemetry.overallHealthScore}% {tx('كفاءة', 'Health')}</span>
                </div>

                {/* Engine Oil Life */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{tx('صلاحية زيت المحرك', 'Engine Oil Life')}</span>
                    </span>
                    <span className={`font-mono font-bold ${activeItem.telemetry.oilLifePercent < 20 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {activeItem.telemetry.oilLifePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        activeItem.telemetry.oilLifePercent < 20
                          ? 'bg-rose-500'
                          : activeItem.telemetry.oilLifePercent < 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${activeItem.telemetry.oilLifePercent}%` }}
                    />
                  </div>
                </div>

                {/* Brake Pads */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span>{tx('سماكة أقمشة الفرامل', 'Brake Pad Thickness')}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">{activeItem.telemetry.brakePadLifePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${activeItem.telemetry.brakePadLifePercent}%` }}
                    />
                  </div>
                </div>

                {/* Tires */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-purple-400" />
                      <span>{tx('عمر مداس الإطارات', 'Tire Tread Life')}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">{activeItem.telemetry.tireLifePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${activeItem.telemetry.tireLifePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Distance & Fuel Efficiency Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">{tx('مسافة اليوم المقطوعة', 'Distance Today')}</span>
                  <span className="font-bold text-white font-mono">{activeItem.telemetry.dailyDistanceKm} {t('km')}</span>
                </div>
                <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">{tx('معدل الاستهلاك', 'Fuel Rate')}</span>
                  <span className="font-bold text-emerald-400 font-mono">{activeItem.telemetry.avgFuelConsumptionPer100Km} L/100km</span>
                </div>
                <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">{tx('تكلفة الوقود / كم', 'Fuel Cost / KM')}</span>
                  <span className="font-bold text-white font-mono">{activeItem.telemetry.fuelCostPerKm} {t('sar')}/km</span>
                </div>
                <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">{tx('العداد الحالي الفعلي', 'Current Odometer')}</span>
                  <span className="font-bold text-white font-mono">{activeItem.vehicle.currentOdometer.toLocaleString()} {t('km')}</span>
                </div>
              </div>

              {/* Action Button inside Cockpit */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenOdometerModal(activeItem.vehicle)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Gauge className="w-4 h-4" />
                  <span>{tx('تسجيل وتحديث قراءة العداد الفعلية', 'Update Actual Odometer Reading')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right / Fleet Live Telemetry Grid (2 Columns on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={tx('بحث برقم اللوحة، الموديل، الكابتن...', 'Search by plate, model, driver...')}
                  className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTriggerTelemetrySync}
                  disabled={isSyncingTelemetry}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title={tx('مزامنة أجهزة التتبع الذكي IoT', 'Sync IoT Telematics')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTelemetry ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isSyncingTelemetry ? tx('جاري المزامنة...', 'Syncing...') : tx('مزامنة الـ GPS', 'Sync GPS')}</span>
                </button>
              </div>
            </div>

            {/* Quick Status / City Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 me-1">{tx('حالة المحرك:', 'Status:')}</span>
                {[
                  { id: 'all', label: tx('الكل', 'All') },
                  { id: 'running', label: tx('متحركة', 'Running') },
                  { id: 'idle', label: tx('متوقفة / قيد التشغيل', 'Idle') },
                  { id: 'off', label: tx('مطفأة', 'Off') },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      statusFilter === s.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400">{tx('المدينة:', 'City:')}</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                >
                  <option value="all">{tx('كافة المدن', 'All Cities')}</option>
                  <option value="الرياض">{tx('الرياض', 'Riyadh')}</option>
                  <option value="جدة">{tx('جدة', 'Jeddah')}</option>
                  <option value="الدمام">{tx('الدمام', 'Dammam')}</option>
                  <option value="مكة المكرمة">{tx('مكة المكرمة', 'Makkah')}</option>
                  <option value="المدينة المنورة">{tx('المدينة المنورة', 'Madinah')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Telemetry Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto pe-1">
            {filteredList.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <Navigation className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">{tx('لا توجد مركبات مطابقة لمعايير البحث', 'No vehicles match search criteria')}</p>
              </div>
            ) : (
              filteredList.map(({ vehicle, telemetry }) => {
                const isSelected = activeItem?.vehicle.id === vehicle.id;
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => setActiveTelemetryId(vehicle.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-3 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Card Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-black text-xs font-mono tracking-wider ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {vehicle.plateNumber}
                          </p>
                          <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                            {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                      </div>

                      <div className="text-end">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            telemetry.engineStatus === 'running'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : telemetry.engineStatus === 'idle'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {telemetry.engineStatus === 'running' ? `${telemetry.currentSpeed} ${t('km')}/h` : telemetry.engineStatus === 'idle' ? tx('متوقفة', 'Idle') : tx('مطفأة', 'Off')}
                        </span>
                      </div>
                    </div>

                    {/* Location & Driver */}
                    <div className={`p-2 rounded-xl text-[11px] ${isSelected ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <div className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-medium">{telemetry.currentLocation.address}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-700/20">
                        <span>{tx('الكابتن:', 'Driver:')} <strong className={isSelected ? 'text-slate-200' : 'text-slate-700'}>{telemetry.driverName}</strong></span>
                        <span className="font-mono">{telemetry.currentLocation.city}</span>
                      </div>
                    </div>

                    {/* KM & Health metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                        <span className="text-slate-400 block">{tx('مسافة اليوم', 'Today')}</span>
                        <span className="font-mono font-bold">{telemetry.dailyDistanceKm} {t('km')}</span>
                      </div>
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                        <span className="text-slate-400 block">{tx('العداد الحالي', 'Odometer')}</span>
                        <span className="font-mono font-bold">{(vehicle.currentOdometer / 1000).toFixed(1)}k</span>
                      </div>
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                        <span className="text-slate-400 block">{tx('مؤشر الكفاءة', 'Health')}</span>
                        <span className="font-mono font-black text-emerald-500">{telemetry.overallHealthScore}%</span>
                      </div>
                    </div>

                    {/* Bottom Quick Action */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOdometerModal(vehicle);
                        }}
                        className={`text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                          isSelected ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        <Gauge className="w-3 h-3" />
                        <span>{tx('تحديث العداد الفعلي', 'Update Odometer')}</span>
                      </button>

                      {onSelectVehicle && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVehicle(vehicle);
                          }}
                          className={`text-[11px] font-semibold transition-colors cursor-pointer ${
                            isSelected ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {tx('ملف المركبة ←', 'View File →')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Odometer Logging Modal */}
      {isOdometerModalOpen && selectedVehicleForOdo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {tx('تحديث قراءة عداد المسافة الفعلية', 'Update Actual Vehicle Odometer')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedVehicleForOdo.plateNumber} • {selectedVehicleForOdo.make} {selectedVehicleForOdo.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOdometerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOdometer} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] block">{tx('القراءة السابقة المسجلة', 'Previous Recorded')}</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {selectedVehicleForOdo.currentOdometer.toLocaleString()} {t('km')}
                  </span>
                </div>
                <div className="text-end">
                  <span className="text-slate-400 text-[10px] block">{tx('فارق المسافة المقطوعة', 'Distance Delta')}</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">
                    +{Math.max(0, newOdometerValue - selectedVehicleForOdo.currentOdometer).toLocaleString()} {t('km')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tx('القراءة الحالية الجديدة للعداد (KM) *', 'New Actual Odometer (KM) *')}
                </label>
                <input
                  type="number"
                  required
                  min={selectedVehicleForOdo.currentOdometer}
                  value={newOdometerValue}
                  onChange={(e) => setNewOdometerValue(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tx('مصدر وملاحظات القراءة', 'Source & Notes')}
                </label>
                <input
                  type="text"
                  value={odoNotes}
                  onChange={(e) => setOdoNotes(e.target.value)}
                  placeholder={tx('مثال: فحص دوري ميداني / قراءة من لوحة العدادات', 'e.g. Field inspection / dashboard reading')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOdometerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingOdo || newOdometerValue < selectedVehicleForOdo.currentOdometer}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUpdatingOdo ? t('loading') : tx('حفظ وتحديث القراءة', 'Save & Update Odometer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
