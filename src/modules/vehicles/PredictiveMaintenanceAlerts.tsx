import React, { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
  Gauge,
  PlusCircle,
  Truck,
  Filter,
  Flame,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  Vehicle,
  MaintenanceRecord,
  PredictiveMaintenanceAlert,
  AlertUrgency,
  NotificationRecord,
} from '../../types';
import {
  calculatePredictiveAlerts,
  dispatchProactiveAlertNotifications,
  DEFAULT_MAINTENANCE_RULES,
} from '../../services/predictiveMaintenanceService';
import { createDocument, fetchCollection } from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface PredictiveMaintenanceAlertsProps {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  onNavigateToMaintenance?: () => void;
  onRefreshData?: () => void;
}

export const PredictiveMaintenanceAlerts: React.FC<PredictiveMaintenanceAlertsProps> = ({
  vehicles,
  maintenanceRecords,
  onNavigateToMaintenance,
  onRefreshData,
}) => {
  const { currentUser } = useAuth();
  const { t, tx, language } = useLanguage();

  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'critical' | 'approaching' | 'safe'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  // Quick Work Order Modal State
  const [selectedAlertForMaint, setSelectedAlertForMaint] = useState<PredictiveMaintenanceAlert | null>(null);
  const [workshopName, setWorkshopName] = useState('مركز صيانة بترومين إكسبرس');
  const [estimatedCost, setEstimatedCost] = useState<number>(200);
  const [maintNotes, setMaintNotes] = useState('');
  const [isCreatingMaint, setIsCreatingMaint] = useState(false);

  // Calculate all alerts dynamically
  const alerts = useMemo(() => {
    return calculatePredictiveAlerts(vehicles, maintenanceRecords, DEFAULT_MAINTENANCE_RULES);
  }, [vehicles, maintenanceRecords]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchUrgency = urgencyFilter === 'all' || alert.urgency === urgencyFilter;
      const matchType = serviceTypeFilter === 'all' || alert.serviceType === serviceTypeFilter;
      const matchSearch =
        alert.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.serviceNameEn.toLowerCase().includes(searchQuery.toLowerCase());

      return matchUrgency && matchType && matchSearch;
    });
  }, [alerts, urgencyFilter, serviceTypeFilter, searchQuery]);

  // Counts by urgency
  const overdueCount = alerts.filter((a) => a.urgency === 'overdue').length;
  const criticalCount = alerts.filter((a) => a.urgency === 'critical').length;
  const approachingCount = alerts.filter((a) => a.urgency === 'approaching').length;
  const safeCount = alerts.filter((a) => a.urgency === 'safe').length;

  // Dispatch proactive notification alerts
  const handleDispatchNotifications = async () => {
    setIsDispatching(true);
    setDispatchResult(null);

    const existingNotifs = await fetchCollection<NotificationRecord>('notifications');
    const sentCount = await dispatchProactiveAlertNotifications(alerts, existingNotifs);

    await logAuditAction(
      currentUser,
      'DISPATCH_MAINTENANCE_ALERTS',
      'vehicles',
      'system',
      `إرسال ${sentCount} تنبيه صيانة استباقي للمشرفين والإدارة`
    );

    setIsDispatching(false);
    setDispatchResult(
      tx(
        `تم إرسال ${sentCount} إشعار استباقي جديد بنجاح إلى سجل التنبيهات`,
        `Successfully dispatched ${sentCount} new proactive alerts to notifications`
      )
    );
    setTimeout(() => setDispatchResult(null), 5000);
  };

  // Open Work Order modal
  const handleOpenWorkOrderModal = (alert: PredictiveMaintenanceAlert) => {
    setSelectedAlertForMaint(alert);
    setEstimatedCost(alert.estimatedCost);
    setWorkshopName('مركز صيانة بترومين المعتمد');
    setMaintNotes(alert.recommendedAction);
  };

  // Submit Work Order
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForMaint) return;

    setIsCreatingMaint(true);

    const vehicle = vehicles.find((v) => v.id === selectedAlertForMaint.vehicleId);

    // 1. Create Maintenance Record
    const maintId = await createDocument<Omit<MaintenanceRecord, 'id'>>('maintenance', {
      vehicleId: selectedAlertForMaint.vehicleId,
      driverId: vehicle?.currentDriverId || '',
      date: new Date().toISOString().slice(0, 10),
      maintenanceType: selectedAlertForMaint.serviceType,
      description: `${selectedAlertForMaint.serviceName} - تم إنشاؤها آلياً عبر نظام التتبع الذكي لمسافة العداد (${selectedAlertForMaint.currentOdometer} كم)`,
      priority: selectedAlertForMaint.urgency === 'overdue' ? 'urgent' : selectedAlertForMaint.urgency === 'critical' ? 'high' : 'medium',
      estimatedCost: Number(estimatedCost),
      actualCost: 0,
      workshopName,
      status: 'requested',
      odometerAtService: selectedAlertForMaint.currentOdometer,
      nextServiceOdometer: selectedAlertForMaint.nextServiceOdometer,
      notes: maintNotes,
      createdAt: new Date().toISOString(),
    });

    // 2. Audit Log
    await logAuditAction(
      currentUser,
      'CREATE_MAINTENANCE_ORDER',
      'maintenance',
      maintId,
      `إنشاء أمر صيانة دورية استباقية (${selectedAlertForMaint.serviceName}) للمركبة ${selectedAlertForMaint.plateNumber}`
    );

    setIsCreatingMaint(false);
    setSelectedAlertForMaint(null);
    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Proactive Alert Dispatcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black tracking-tight">
              {tx('نظام التنبيهات الاستباقية للصيانة الدورية', 'Proactive Fleet Predictive Maintenance System')}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {tx(
              'يقوم النظام بتحليل عدادات المسافة المقطوعة فعلياً للمركبات وحساب المسافة المتبقية ومعدل الاستهلاك اليومي لإرسال تنبيهات تلقائية قبل حدوث الأعطال.',
              'Automatically analyzes verified vehicle mileage, remaining distance, and daily velocity to predict service schedules and prevent downtime.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDispatchNotifications}
            disabled={isDispatching}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-bounce' : ''}`} />
            <span>{isDispatching ? tx('جاري الإرسال...', 'Dispatching...') : tx('بث التنبيهات للمشرفين', 'Dispatch Alerts')}</span>
          </button>
        </div>
      </div>

      {dispatchResult && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{dispatchResult}</span>
        </div>
      )}

      {/* KPI Cards: Alert Status Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setUrgencyFilter('overdue')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'overdue' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500' : 'bg-white border-slate-200 hover:border-rose-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-600 mb-1">
            <span>{tx('متأخرة / تجاوزت المسافة', 'Overdue Service')}</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">{overdueCount}</div>
          <div className="text-[10px] text-rose-600 mt-1 font-medium">{tx('تتطلب إيقاف وتوجيه فوري للورشة', 'Requires immediate workshop booking')}</div>
        </div>

        <div
          onClick={() => setUrgencyFilter('critical')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'critical' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500' : 'bg-white border-slate-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 mb-1">
            <span>{tx('حرجة / اقتربت جداً (<500 كم)', 'Critical (<500 KM)')}</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{criticalCount}</div>
          <div className="text-[10px] text-amber-600 mt-1 font-medium">{tx('يجب حجز الموعد خلال 48 ساعة', 'Book service within 48 hours')}</div>
        </div>

        <div
          onClick={() => setUrgencyFilter('approaching')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'approaching' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-600 mb-1">
            <span>{tx('ضمن نطاق التنبيه المسبق', 'Approaching Schedule')}</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{approachingCount}</div>
          <div className="text-[10px] text-blue-600 mt-1 font-medium">{tx('متبقي أقل من المسافة التحذيرية', 'Within warning interval')}</div>
        </div>

        <div
          onClick={() => setUrgencyFilter('safe')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'safe' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 mb-1">
            <span>{tx('سليمة / ضمن النطاق الآمن', 'Healthy & Safe')}</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{safeCount}</div>
          <div className="text-[10px] text-emerald-600 mt-1 font-medium">{tx('المسافة كافية والصيانة منتظمة', 'Good status, sufficient KM')}</div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx('بحث برقم اللوحة، الموديل، نوع الصيانة...', 'Search by plate, model, service type...')}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden"
            >
              <option value="all">{tx('كافة بنود الصيانة الدورية', 'All Service Types')}</option>
              <option value="oil_change">{tx('تغيير زيت وفلتر (5,000 كم)', 'Oil & Filter (5k KM)')}</option>
              <option value="tires">{tx('تدوير الإطارات (20,000 كم)', 'Tires Rotation (20k KM)')}</option>
              <option value="brakes">{tx('فحمات الفرامل (30,000 كم)', 'Brakes Service (30k KM)')}</option>
              <option value="periodic">{tx('صيانة شاملة وقير (40k/80k)', 'Periodic & Transmission')}</option>
            </select>
          </div>
        </div>

        {/* Urgency tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          {[
            { id: 'all', label: tx(`كافة التنبيهات (${alerts.length})`, `All Alerts (${alerts.length})`) },
            { id: 'overdue', label: tx(`المتأخرة فوراً (${overdueCount})`, `Overdue (${overdueCount})`) },
            { id: 'critical', label: tx(`الحرجة (${criticalCount})`, `Critical (${criticalCount})`) },
            { id: 'approaching', label: tx(`القادمة قريباً (${approachingCount})`, `Approaching (${approachingCount})`) },
            { id: 'safe', label: tx(`السليمة (${safeCount})`, `Healthy (${safeCount})`) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setUrgencyFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                urgencyFilter === tab.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <h4 className="text-sm font-bold text-slate-800">{tx('لا توجد تنبيهات صيانة تطابق المعايير', 'No maintenance alerts match filters')}</h4>
            <p className="text-xs text-slate-400 mt-1">{tx('أسطول المركبات ضمن النطاق التشغيلي الآمن', 'Fleet is operating within safe limits')}</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isOverdue = alert.urgency === 'overdue';
            const isCritical = alert.urgency === 'critical';
            const isApproaching = alert.urgency === 'approaching';

            const progressPercent = Math.min(
              100,
              Math.max(
                0,
                Math.round(((alert.currentOdometer - alert.lastServiceOdometer) / (alert.nextServiceOdometer - alert.lastServiceOdometer || 1)) * 100)
              )
            );

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-3xl border transition-all shadow-xs text-xs space-y-4 ${
                  isOverdue
                    ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/50'
                    : isCritical
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/50'
                    : isApproaching
                    ? 'bg-blue-50/30 border-blue-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Card Top: Vehicle & Urgency Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        isOverdue
                          ? 'bg-rose-500 text-white'
                          : isCritical
                          ? 'bg-amber-500 text-white'
                          : isApproaching
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm font-mono text-slate-900 tracking-wider">
                          {alert.plateNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {alert.vehicleModel}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 mt-0.5">
                        {language === 'ar' ? alert.serviceName : alert.serviceNameEn}
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 ${
                      isOverdue
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isCritical
                        ? 'bg-amber-600 text-white'
                        : isApproaching
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOverdue
                      ? tx(`تأخير: ${Math.abs(alert.remainingKm).toLocaleString()} كم`, `Overdue: ${Math.abs(alert.remainingKm).toLocaleString()} KM`)
                      : isCritical
                      ? tx(`حرج: متبقي ${alert.remainingKm.toLocaleString()} كم`, `Critical: ${alert.remainingKm.toLocaleString()} KM left`)
                      : isApproaching
                      ? tx(`متبقي ${alert.remainingKm.toLocaleString()} كم`, `${alert.remainingKm.toLocaleString()} KM left`)
                      : tx('سليمة', 'Healthy')}
                  </span>
                </div>

                {/* Mileage Progress Bar */}
                <div className="space-y-1.5 p-3 bg-white/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {tx('العداد الحالي:', 'Current:')} <strong className="text-slate-900">{alert.currentOdometer.toLocaleString()} {t('km')}</strong>
                    </span>
                    <span className="text-slate-500 font-mono">
                      {tx('الموعد المستهدف:', 'Target:')} <strong className="text-indigo-600">{alert.nextServiceOdometer.toLocaleString()} {t('km')}</strong>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverdue
                          ? 'bg-rose-600'
                          : isCritical
                          ? 'bg-amber-500'
                          : isApproaching
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>{tx(`آخر صيانة: ${alert.lastServiceOdometer.toLocaleString()} كم`, `Last: ${alert.lastServiceOdometer.toLocaleString()} KM`)}</span>
                    <span>
                      {alert.remainingKm > 0
                        ? tx(`الموعد المتوقع: خلال ~${alert.estimatedDaysRemaining} يوم`, `Est. Date: in ~${alert.estimatedDaysRemaining} days`)
                        : tx('تجاوزت الحد المسموح به', 'Exceeded limit')}
                    </span>
                  </div>
                </div>

                {/* Recommended Action / Diagnosis */}
                <div
                  className={`p-3 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                    isOverdue
                      ? 'bg-rose-100/70 border-rose-200 text-rose-900'
                      : isCritical
                      ? 'bg-amber-100/70 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                  <div>
                    <span className="font-bold block">{tx('التوصية الاستباقية:', 'Proactive Recommendation:')}</span>
                    <span>{language === 'ar' ? alert.recommendedAction : alert.recommendedActionEn}</span>
                  </div>
                </div>

                {/* Card Action Button: Convert to Work Order */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-mono text-slate-500 text-[11px]">
                    {tx('التكلفة التقديرية:', 'Est. Cost:')} <strong className="text-slate-900 font-bold">{alert.estimatedCost} {t('sar')}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenWorkOrderModal(alert)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isOverdue || isCritical
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{tx('إصدار أمر صيانة فوري', 'Create Work Order')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Work Order Modal */}
      {selectedAlertForMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {tx('إصدار أمر صيانة دورية استباقي', 'Create Proactive Work Order')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedAlertForMaint.plateNumber} • {selectedAlertForMaint.serviceName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlertForMaint(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">{tx('العداد الحالي للمركبة', 'Vehicle Odometer')}</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{selectedAlertForMaint.currentOdometer.toLocaleString()} {t('km')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{tx('الموعد الدوري المستهدف', 'Target Service KM')}</span>
                  <span className="font-mono font-bold text-indigo-600 text-sm">{selectedAlertForMaint.nextServiceOdometer.toLocaleString()} {t('km')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tx('مركز الصيانة / الورشة المعتمدة *', 'Certified Workshop *')}
                </label>
                <input
                  type="text"
                  required
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  placeholder="مركز بترومين إكسبرس، ون ستوب، ورشة الشركة المركزية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tx('التكلفة التقديرية للصيانة (SAR) *', 'Estimated Cost (SAR) *')}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tx('ملاحظات وتوجيهات أمر الصيانة', 'Work Order Instructions')}
                </label>
                <textarea
                  rows={2}
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                  placeholder="ملاحظات للكابتن أو فني الورشة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForMaint(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMaint}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCreatingMaint ? t('loading') : tx('تأكيد وإصدار أمر الصيانة', 'Confirm & Issue Work Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
