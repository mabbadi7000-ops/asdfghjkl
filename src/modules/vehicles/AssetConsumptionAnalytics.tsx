import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Flame,
  Gauge,
  DollarSign,
  AlertTriangle,
  Truck,
  Zap,
  Activity,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Vehicle, FuelRecord, MaintenanceRecord, MileageLog } from '../../types';
import { calculateVehicleTelemetry } from '../../services/predictiveMaintenanceService';
import { subscribeToCollection } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';

interface AssetConsumptionAnalyticsProps {
  vehicles: Vehicle[];
  fuelRecords: FuelRecord[];
  maintenanceRecords: MaintenanceRecord[];
}

export const AssetConsumptionAnalytics: React.FC<AssetConsumptionAnalyticsProps> = ({
  vehicles,
  fuelRecords,
  maintenanceRecords,
}) => {
  const { t, tx, language } = useLanguage();
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);

  useEffect(() => {
    const unsub = subscribeToCollection<MileageLog>('mileage_logs', setMileageLogs);
    return () => unsub();
  }, []);

  // Compute telemetry metrics for each vehicle
  const telemetryData = useMemo(() => {
    return vehicles.map((v) => {
      const vFuels = fuelRecords.filter((f) => f.vehicleId === v.id);
      const vMaints = maintenanceRecords.filter((m) => m.vehicleId === v.id);
      const totalFuelCost = vFuels.reduce((sum, f) => sum + (f.totalCost || 0), 0);
      const totalMaintCost = vMaints.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost || 0), 0);
      const totalOperatingCost = totalFuelCost + totalMaintCost;

      const telemetry = calculateVehicleTelemetry(v, fuelRecords);

      // Estimated operational Cost per KM (Fuel + Maintenance / Odometer)
      const costPerKm = v.currentOdometer > 0
        ? Number(((totalOperatingCost / v.currentOdometer) || telemetry.fuelCostPerKm).toFixed(2))
        : telemetry.fuelCostPerKm;

      return {
        vehicle: v,
        telemetry,
        totalFuelCost,
        totalMaintCost,
        totalOperatingCost,
        costPerKm,
      };
    });
  }, [vehicles, fuelRecords, maintenanceRecords]);

  // Overall aggregate fleet consumption
  const totalFleetKm = vehicles.reduce((sum, v) => sum + (v.currentOdometer || 0), 0);
  const totalFleetFuelCost = fuelRecords.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const totalFleetMaintCost = maintenanceRecords.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost || 0), 0);
  const totalFleetOpCost = totalFleetFuelCost + totalFleetMaintCost;
  const avgCostPerKm = totalFleetKm > 0 ? (totalFleetOpCost / totalFleetKm).toFixed(2) : '0.45';

  // High-mileage / high-risk vehicles sorted by odometer
  const topMileageVehicles = [...telemetryData].sort((a, b) => b.vehicle.currentOdometer - a.vehicle.currentOdometer).slice(0, 5);

  const mileageLogColumns: Column<MileageLog>[] = [
    {
      header: language === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
      accessor: 'date',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs text-slate-700">{log.date}</span>
      ),
    },
    {
      header: language === 'ar' ? 'المركبة واللوحة' : 'Vehicle Plate',
      accessor: 'plateNumber',
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-500" />
          <span className="font-black font-mono text-xs text-slate-900">{log.plateNumber || log.vehicleId}</span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'قراءة العداد المسجلة' : 'Recorded Odometer',
      accessor: 'odometer',
      sortable: true,
      render: (log) => (
        <span className="font-mono font-bold text-xs text-slate-900">
          {log.odometer.toLocaleString()} {t('km')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'المسافة المقطوعة' : 'Distance Traveled',
      accessor: 'distanceTraveled',
      sortable: true,
      render: (log) => (
        <span className="font-mono font-bold text-xs text-emerald-600">
          +{log.distanceTraveled} {t('km')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'المسجّل والمصدر' : 'Recorded By & Source',
      accessor: 'recordedBy',
      render: (log) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">{log.recordedBy}</span>
          <span className="text-[10px] text-slate-400">
            {log.source === 'telematics_iot' ? tx('تتبع ذكي IoT', 'IoT Telematics') : log.source === 'fuel_entry' ? tx('تعبئة وقود', 'Fuel Entry') : tx('مدخل يدوي', 'Manual Entry')}
          </span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'الملاحظات' : 'Notes',
      accessor: 'notes',
      render: (log) => (
        <span className="text-slate-500 text-xs">{log.notes || '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Asset Health & Consumption KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('إجمالي المسافات المقطوعة', 'Total Fleet Mileage')}</span>
            <Gauge className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalFleetKm.toLocaleString()} <span className="text-xs text-slate-500">{t('km')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx('المسافة التراكمية لجميع مركبات الأسطول', 'Cumulative distance of all vehicles')}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('متوسط التكلفة التشغيلية / كم', 'Avg Cost / KM (CPK)')}</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono">
            {avgCostPerKm} <span className="text-xs text-slate-500">{t('sar')} / {t('km')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx('تشمل تكاليف الوقود والصيانة الدورية', 'Includes fuel & periodic maintenance')}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('إجمالي نفقات الوقود الموثقة', 'Total Fuel Expense')}</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {totalFleetFuelCost.toLocaleString()} <span className="text-xs text-slate-500">{t('sar')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx(`${fuelRecords.length} عملية تعبئة مسجلة بالشرائح`, `${fuelRecords.length} fuel chip transactions`)}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>{tx('إجمالي تكاليف الصيانة الدورية', 'Total Maintenance Cost')}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">
            {totalFleetMaintCost.toLocaleString()} <span className="text-xs text-slate-500">{t('sar')}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tx(`${maintenanceRecords.length} أمر صيانة منفذ وموثق`, `${maintenanceRecords.length} maintenance orders`)}
          </div>
        </div>
      </div>

      {/* Top 5 High-Utilization & Wear Analysis Cards */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{tx('المركبات الأعلى استهلاكاً للمسافة والإهلاك (Top 5 Vehicles)', 'Top 5 Highest Mileage & Asset Wear Vehicles')}</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {tx('تحليل تكلفة الكيلومتر ومؤشر صحة الأجزاء الحيوية لكل أصل', 'Kilometer cost and component health index per asset')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {topMileageVehicles.map(({ vehicle, telemetry, costPerKm }) => (
            <div
              key={vehicle.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-slate-900 text-xs">{vehicle.plateNumber}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  {telemetry.overallHealthScore}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{vehicle.make} {vehicle.model} ({vehicle.year})</p>

              <div className="pt-1 border-t border-slate-200/60 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans text-slate-400 text-[10px]">{tx('العداد:', 'Odo:')}</span>
                  <strong className="text-slate-900">{vehicle.currentOdometer.toLocaleString()} {t('km')}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans text-slate-400 text-[10px]">{tx('المسافة/يوم:', 'Daily:')}</span>
                  <strong className="text-blue-600">{telemetry.dailyDistanceKm} {t('km')}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans text-slate-400 text-[10px]">{tx('التكلفة/كم:', 'CPK:')}</span>
                  <strong className="text-indigo-600">{costPerKm} {t('sar')}/km</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Mileage Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-600" />
            <span>{tx('سجل قراءات العدادات الفعلية ومسافات الرحلات', 'Actual Mileage & Odometer Verification Log')}</span>
          </h3>
        </div>

        <Table
          data={mileageLogs}
          columns={mileageLogColumns}
          keyExtractor={(item) => item.id}
          searchPlaceholder={tx('بحث في سجلات العدادات...', 'Search mileage logs...')}
          searchFilter={(item, query) =>
            (item.plateNumber || '').toLowerCase().includes(query.toLowerCase()) ||
            (item.recordedBy || '').toLowerCase().includes(query.toLowerCase()) ||
            (item.notes || '').toLowerCase().includes(query.toLowerCase()) ||
            (item.date || '').toLowerCase().includes(query.toLowerCase())
          }
          emptyTitle={tx('لا توجد سجلات مسافات مقطوعة حالياً', 'No mileage logs recorded yet')}
          emptyDescription={tx('قم بتسجيل قراءات العدادات عبر شاشة التتبع الذكي', 'Record verified odometer readings via Smart Tracking')}
        />
      </div>
    </div>
  );
};
