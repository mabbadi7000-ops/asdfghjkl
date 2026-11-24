import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Fuel,
  Users,
  Truck,
  DollarSign,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { StatCard } from '../../components/common/StatCard';
import { fetchCollection } from '../../services/dataService';

export const AnalyticsDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    driversCount: 0,
    activeDrivers: 0,
    vehiclesCount: 0,
    inOpVehicles: 0,
    maintenanceVehicles: 0,
    totalFuelCost: 0,
    totalFuelLiters: 0,
    totalMaintenanceCost: 0,
    totalExpenses: 0,
    accidentsCount: 0,
    violationsCount: 0,
    platformDistribution: {} as Record<string, number>,
  });
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const [drivers, vehicles, fuel, maintenance, expenses, accidents, violations] =
          await Promise.all([
            fetchCollection<any>('drivers'),
            fetchCollection<any>('vehicles'),
            fetchCollection<any>('fuel_records'),
            fetchCollection<any>('maintenance_records'),
            fetchCollection<any>('expenses'),
            fetchCollection<any>('accidents'),
            fetchCollection<any>('violations'),
          ]);

        const totalFuelCost = fuel.reduce((acc, f: any) => acc + (f.totalCost || 0), 0);
        const totalFuelLiters = fuel.reduce((acc, f: any) => acc + (f.liters || 0), 0);
        const totalMaintCost = maintenance.reduce((acc, m: any) => acc + (m.actualCost || m.estimatedCost || 0), 0);
        const totalExpCost = expenses.reduce((acc, e: any) => acc + (e.amount || 0), 0);

        const platMap: Record<string, number> = {};
        drivers.forEach((drv: any) => {
          if (drv.platformId) {
            platMap[drv.platformId] = (platMap[drv.platformId] || 0) + 1;
          }
        });

        setStats({
          driversCount: drivers.length,
          activeDrivers: drivers.filter((d: any) => d.status === 'active').length,
          vehiclesCount: vehicles.length,
          inOpVehicles: vehicles.filter((v: any) => v.status === 'in_operation').length,
          maintenanceVehicles: vehicles.filter((v: any) => v.status === 'maintenance').length,
          totalFuelCost,
          totalFuelLiters,
          totalMaintenanceCost: totalMaintCost,
          totalExpenses: totalExpCost + totalFuelCost + totalMaintCost,
          accidentsCount: accidents.length,
          violationsCount: violations.length,
          platformDistribution: platMap,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const utilizationRate = stats.vehiclesCount
    ? Math.round((stats.inOpVehicles / stats.vehiclesCount) * 100)
    : 0;
  const driverActivityRate = stats.driversCount
    ? Math.round((stats.activeDrivers / stats.driversCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            {t('analytics')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'مؤشرات الأداء التشغيلي والمالي، استهلاك الأسطول وتفاصيل التكاليف'
              : 'Operational and financial KPIs, fleet utilization, and cost breakdowns'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {language === 'ar' ? 'شهري' : 'Monthly'}
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'quarter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {language === 'ar' ? 'ربع سنوي' : 'Quarterly'}
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'year' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {language === 'ar' ? 'سنوي' : 'Yearly'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={language === 'ar' ? 'معدل تشغيل الأسطول' : 'Fleet Utilization Rate'}
          value={`${utilizationRate}%`}
          subtitle={`${stats.inOpVehicles} ${language === 'ar' ? 'نشطة من' : 'active of'} ${stats.vehiclesCount}`}
          icon={Truck}
          colorScheme="emerald"
        />
        <StatCard
          title={language === 'ar' ? 'نسبة نشاط المناديب' : 'Driver Active Rate'}
          value={`${driverActivityRate}%`}
          subtitle={`${stats.activeDrivers} ${language === 'ar' ? 'نشط من' : 'active of'} ${stats.driversCount}`}
          icon={Users}
          colorScheme="blue"
        />
        <StatCard
          title={t('fuelCost')}
          value={`${stats.totalFuelCost.toLocaleString()} ${t('sar')}`}
          subtitle={`${stats.totalFuelLiters.toLocaleString()} لتر`}
          icon={Fuel}
          colorScheme="amber"
        />
        <StatCard
          title={language === 'ar' ? 'إجمالي التكاليف التشغيلية' : 'Total Operating Costs'}
          value={`${stats.totalExpenses.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? 'وقود + صيانة + مصروفات' : 'Fuel + Maintenance + Expenses'}
          icon={DollarSign}
          colorScheme="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>{language === 'ar' ? 'توزيع حالات المركبات' : 'Vehicle Status Breakdown'}</span>
            <span className="text-xs text-slate-500 font-normal">{stats.vehiclesCount} مركبة</span>
          </h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">{language === 'ar' ? 'في الخدمة والتشغيل' : 'In Operation'}</span>
                <span className="text-emerald-600">{stats.inOpVehicles} ({utilizationRate}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${utilizationRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">{language === 'ar' ? 'في الورش والصيانة' : 'In Maintenance'}</span>
                <span className="text-amber-600">
                  {stats.maintenanceVehicles} (
                  {stats.vehiclesCount ? Math.round((stats.maintenanceVehicles / stats.vehiclesCount) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.vehiclesCount ? (stats.maintenanceVehicles / stats.vehiclesCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">{language === 'ar' ? 'جاهزة ومتاحة' : 'Available'}</span>
                <span className="text-blue-600">
                  {Math.max(0, stats.vehiclesCount - stats.inOpVehicles - stats.maintenanceVehicles)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.vehiclesCount
                        ? (Math.max(0, stats.vehiclesCount - stats.inOpVehicles - stats.maintenanceVehicles) /
                            stats.vehiclesCount) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>{language === 'ar' ? 'توزيع المناديب حسب المنصات' : 'Driver Distribution by Delivery Platform'}</span>
            <span className="text-xs text-slate-500 font-normal">{stats.driversCount} مندوب</span>
          </h3>
          <div className="space-y-3 pt-2">
            {Object.entries(stats.platformDistribution).map(([plat, count]) => {
              const pct = stats.driversCount ? Math.round((count / stats.driversCount) * 100) : 0;
              return (
                <div key={plat}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">{plat}</span>
                    <span className="text-slate-900">{count} مندوب ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.platformDistribution).length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                {language === 'ar' ? 'لم يتم ربط مناديب بمنصات بعد' : 'No platform assignments recorded'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
