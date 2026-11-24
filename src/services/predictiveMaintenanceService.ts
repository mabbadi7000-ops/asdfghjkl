import {
  Vehicle,
  MaintenanceRecord,
  FuelRecord,
  MaintenanceScheduleRule,
  PredictiveMaintenanceAlert,
  VehicleTelemetry,
  MileageLog,
  AlertUrgency,
  NotificationRecord,
} from '../types';
import { createDocument, fetchCollection } from './dataService';

// Default Saudi OEM Fleet Maintenance Rules
export const DEFAULT_MAINTENANCE_RULES: MaintenanceScheduleRule[] = [
  {
    id: 'oil_5k',
    name: 'تغيير زيت المحرك والفلتر الدوري (5,000 كم)',
    nameEn: 'Engine Oil & Filter Service (5,000 KM)',
    maintenanceType: 'oil_change',
    intervalKm: 5000,
    warningThresholdKm: 500, // 500 km before
    estimatedCost: 180,
    description: 'استبدال زيت المحرك التخليقي وفلتر الزيت وفحص سوائل المحرك',
    descriptionEn: 'Replace synthetic motor oil, oil filter, and inspect engine fluids',
  },
  {
    id: 'tires_20k',
    name: 'تدوير الإطارات وميزان الأذرعة (20,000 كم)',
    nameEn: 'Tire Rotation & Wheel Alignment (20,000 KM)',
    maintenanceType: 'tires',
    intervalKm: 20000,
    warningThresholdKm: 1200,
    estimatedCost: 250,
    description: 'تدوير الإطارات لتقليل التآكل وفحص ضغط الهواء وميزان الليزر',
    descriptionEn: 'Rotate tires to equalize tread wear, verify pressure, and align wheels',
  },
  {
    id: 'brakes_30k',
    name: 'فحص وتغيير أقمشة الفرامل (30,000 كم)',
    nameEn: 'Brake Pads & Rotors Service (30,000 KM)',
    maintenanceType: 'brakes',
    intervalKm: 30000,
    warningThresholdKm: 1500,
    estimatedCost: 420,
    description: 'فحص سماكة فحمات الفرامل الأمامية والخلفية وتغيير زيت الفرامل',
    descriptionEn: 'Inspect front/rear brake pad thickness and replace brake fluid',
  },
  {
    id: 'periodic_40k',
    name: 'صيانة دورية شاملة (40,000 كم)',
    nameEn: 'Comprehensive Major Service (40,000 KM)',
    maintenanceType: 'periodic',
    intervalKm: 40000,
    warningThresholdKm: 2000,
    estimatedCost: 850,
    description: 'تغيير فلاتر الهواء والمكيف وشمعات الاحتراق وفحص السيور ونظام التعليق',
    descriptionEn: 'Replace air & cabin filters, spark plugs, drive belts, and suspension inspection',
  },
  {
    id: 'transmission_80k',
    name: 'تغيير زيت ناقل الحركة القير (80,000 كم)',
    nameEn: 'Transmission Fluid & Filter (80,000 KM)',
    maintenanceType: 'periodic',
    intervalKm: 80000,
    warningThresholdKm: 3000,
    estimatedCost: 650,
    description: 'تغيير سائل ناقل الحركة الأوتوماتيكي وفلتر القير وفحص الدفرنس',
    descriptionEn: 'Replace automatic transmission fluid, filter, and inspect differential',
  },
];

// Major Saudi cities sample coordinates for simulated GPS tracking
const SAUDI_LOCATIONS = [
  { city: 'الرياض', cityEn: 'Riyadh', address: 'طريق الملك فهد، حي الملقا', lat: 24.7892, lng: 46.6231 },
  { city: 'الرياض', cityEn: 'Riyadh', address: 'طريق الدائري الشمالي، حي الصحافة', lat: 24.8015, lng: 46.6492 },
  { city: 'الرياض', cityEn: 'Riyadh', address: 'شارع التخصصي، حي المعذر', lat: 24.6948, lng: 46.6712 },
  { city: 'جدة', cityEn: 'Jeddah', address: 'طريق الملك عبدالعزيز، حي الشاطئ', lat: 21.5849, lng: 39.1245 },
  { city: 'جدة', cityEn: 'Jeddah', address: 'شارع التحلية، حي الروضة', lat: 21.5542, lng: 39.1678 },
  { city: 'الدمام', cityEn: 'Dammam', address: 'طريق الملك فيصل، حي الشاطئ', lat: 26.4385, lng: 50.1172 },
  { city: 'مكة المكرمة', cityEn: 'Makkah', address: 'طريق العزيزية العام، حي العزيزية', lat: 21.4133, lng: 39.8644 },
  { city: 'المدينة المنورة', cityEn: 'Madinah', address: 'طريق سلطانة، حي القبلتين', lat: 24.4712, lng: 39.5982 },
];

/**
 * Generate real-time telemetry state for a vehicle
 */
export function calculateVehicleTelemetry(
  vehicle: Vehicle,
  fuelRecords: FuelRecord[] = [],
  driverName?: string
): VehicleTelemetry {
  // Hash plate number for deterministic yet realistic telemetry metrics
  let hash = 0;
  for (let i = 0; i < vehicle.plateNumber.length; i++) {
    hash = (hash << 5) - hash + vehicle.plateNumber.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const locIndex = positiveHash % SAUDI_LOCATIONS.length;
  const loc = SAUDI_LOCATIONS[locIndex];

  // Daily distance based on operational status
  const isOperating = vehicle.status === 'in_operation' || vehicle.status === 'assigned';
  const dailyDistanceKm = isOperating ? 85 + (positiveHash % 140) : (positiveHash % 15);
  const weeklyDistanceKm = dailyDistanceKm * 6.2;
  const monthlyDistanceKm = dailyDistanceKm * 26;

  // Speed and engine
  const currentSpeed = isOperating ? (positiveHash % 2 === 0 ? 35 + (positiveHash % 55) : 0) : 0;
  const engineStatus: 'running' | 'idle' | 'off' = isOperating
    ? currentSpeed > 0
      ? 'running'
      : 'idle'
    : 'off';

  // Fuel consumption correlation
  const vehicleFuels = fuelRecords.filter((f) => f.vehicleId === vehicle.id);
  let avgLitersPer100Km = 7.4 + (positiveHash % 30) / 10;
  if (vehicleFuels.length > 0) {
    const totalLiters = vehicleFuels.reduce((sum, f) => sum + (f.liters || 0), 0);
    const totalSpent = vehicleFuels.reduce((sum, f) => sum + (f.totalCost || 0), 0);
    if (totalLiters > 0 && monthlyDistanceKm > 0) {
      avgLitersPer100Km = Number(((totalLiters / (monthlyDistanceKm / 100)) || 7.8).toFixed(1));
    }
  }

  // Cost per KM (Fuel price ~ 2.18 SAR/L for 91, or totalSpent/KM)
  const fuelCostPerKm = Number(((avgLitersPer100Km / 100) * 2.18).toFixed(2));

  // Asset Health Components (deteriorates as odometer grows past service intervals)
  const odometerMod5k = vehicle.currentOdometer % 5000;
  const oilLifePercent = Math.max(5, Math.min(100, Math.round(100 - (odometerMod5k / 5000) * 100)));

  const odometerMod30k = vehicle.currentOdometer % 30000;
  const brakePadLifePercent = Math.max(8, Math.min(100, Math.round(100 - (odometerMod30k / 30000) * 100)));

  const odometerMod20k = vehicle.currentOdometer % 20000;
  const tireLifePercent = Math.max(10, Math.min(100, Math.round(100 - (odometerMod20k / 20000) * 100)));

  const overallHealthScore = Math.round((oilLifePercent * 0.4 + brakePadLifePercent * 0.3 + tireLifePercent * 0.3));

  return {
    id: `tel-${vehicle.id}`,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    makeModel: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    driverName: driverName || 'كابتن توصيل',
    lastPingTime: new Date(Date.now() - (positiveHash % 120) * 1000).toISOString(),
    currentSpeed,
    engineStatus,
    currentLocation: {
      lat: loc.lat + (positiveHash % 100) * 0.0001,
      lng: loc.lng + (positiveHash % 100) * 0.0001,
      address: loc.address,
      city: loc.city,
    },
    dailyDistanceKm: Math.round(dailyDistanceKm),
    weeklyDistanceKm: Math.round(weeklyDistanceKm),
    monthlyDistanceKm: Math.round(monthlyDistanceKm),
    avgFuelConsumptionPer100Km: avgLitersPer100Km,
    fuelCostPerKm,
    batteryVoltage: Number((12.4 + (positiveHash % 8) / 10).toFixed(1)),
    coolantTemp: 84 + (positiveHash % 12),
    oilLifePercent,
    brakePadLifePercent,
    tireLifePercent,
    overallHealthScore,
    simulatedGpsActive: true,
  };
}

/**
 * Calculate all predictive maintenance alerts for the fleet
 */
export function calculatePredictiveAlerts(
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[] = [],
  customRules: MaintenanceScheduleRule[] = DEFAULT_MAINTENANCE_RULES
): PredictiveMaintenanceAlert[] {
  const alerts: PredictiveMaintenanceAlert[] = [];

  vehicles.forEach((vehicle) => {
    const vMaint = maintenanceRecords.filter((m) => m.vehicleId === vehicle.id);

    customRules.forEach((rule) => {
      // Find the latest completed maintenance of this type
      const matchingMaint = vMaint
        .filter((m) => m.maintenanceType === rule.maintenanceType && m.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let lastServiceOdometer = 0;
      let lastServiceDate = vehicle.operationStartDate || vehicle.purchaseDate;

      if (matchingMaint.length > 0) {
        const latest = matchingMaint[0];
        lastServiceOdometer = latest.odometerAtService || Math.floor(vehicle.currentOdometer / rule.intervalKm) * rule.intervalKm;
        lastServiceDate = latest.date;
      } else {
        // If never serviced in app, calculate base cycle
        const cycles = Math.floor(vehicle.currentOdometer / rule.intervalKm);
        lastServiceOdometer = cycles * rule.intervalKm;
      }

      const nextServiceOdometer = lastServiceOdometer + rule.intervalKm;
      const remainingKm = nextServiceOdometer - vehicle.currentOdometer;

      // Estimate days remaining based on daily avg of ~120 KM
      const dailyVelocity = 120;
      const estimatedDaysRemaining = Math.max(0, Math.round(remainingKm / dailyVelocity));

      let urgency: AlertUrgency = 'safe';
      let recommendedAction = `الحالة جيدة - الموعد القادم بعد ${remainingKm.toLocaleString()} كم`;
      let recommendedActionEn = `Healthy - Next service in ${remainingKm.toLocaleString()} KM`;

      if (remainingKm <= 0) {
        urgency = 'overdue';
        recommendedAction = `تجاوزت المسافة المحددة بـ ${Math.abs(remainingKm).toLocaleString()} كم! يجب حجز موعد صيانة عاجل فوراً`;
        recommendedActionEn = `Overdue by ${Math.abs(remainingKm).toLocaleString()} KM! Immediate workshop booking required`;
      } else if (remainingKm <= rule.warningThresholdKm / 2) {
        urgency = 'critical';
        recommendedAction = `متبقي ${remainingKm.toLocaleString()} كم فقط. يرجى التوجيه لمركز الصيانة المعتمد`;
        recommendedActionEn = `Only ${remainingKm.toLocaleString()} KM remaining. Route to certified workshop soon`;
      } else if (remainingKm <= rule.warningThresholdKm) {
        urgency = 'approaching';
        recommendedAction = `اقترب موعد الصيانة (متبقي ${remainingKm.toLocaleString()} كم / حوالي ${estimatedDaysRemaining} يوم)`;
        recommendedActionEn = `Service approaching (${remainingKm.toLocaleString()} KM remaining / ~${estimatedDaysRemaining} days)`;
      }

      alerts.push({
        id: `alert-${vehicle.id}-${rule.id}`,
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        vehicleModel: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
        serviceType: rule.maintenanceType,
        serviceName: rule.name,
        serviceNameEn: rule.nameEn,
        lastServiceOdometer,
        lastServiceDate,
        currentOdometer: vehicle.currentOdometer,
        nextServiceOdometer,
        remainingKm,
        estimatedDaysRemaining,
        urgency,
        recommendedAction,
        recommendedActionEn,
        estimatedCost: rule.estimatedCost,
        status: 'active',
      });
    });
  });

  // Sort by urgency: overdue -> critical -> approaching -> safe
  const priorityOrder: Record<AlertUrgency, number> = {
    overdue: 0,
    critical: 1,
    approaching: 2,
    safe: 3,
  };

  return alerts.sort((a, b) => priorityOrder[a.urgency] - priorityOrder[b.urgency]);
}

/**
 * Dispatch proactive notifications for overdue or critical maintenance
 */
export async function dispatchProactiveAlertNotifications(
  alerts: PredictiveMaintenanceAlert[],
  existingNotifications: NotificationRecord[] = []
): Promise<number> {
  const criticalOrOverdue = alerts.filter(
    (a) => (a.urgency === 'overdue' || a.urgency === 'critical') && a.status === 'active'
  );

  let createdCount = 0;

  for (const alert of criticalOrOverdue) {
    const identifier = `${alert.plateNumber}-${alert.serviceType}`;
    // Check if notification was already sent in last 24 hours
    const alreadyNotified = existingNotifications.some(
      (n) => n.message.includes(alert.plateNumber) && n.message.includes(alert.serviceName)
    );

    if (!alreadyNotified) {
      await createDocument<Omit<NotificationRecord, 'id'>>('notifications', {
        title: alert.urgency === 'overdue' ? `⚠️ صيانة عاجلة متأخرة: ${alert.plateNumber}` : `🔔 تنبيه صيانة استباقي: ${alert.plateNumber}`,
        message: `${alert.serviceName} للمركبة ${alert.plateNumber} (${alert.vehicleModel}). ${alert.recommendedAction}`,
        type: 'maintenance',
        targetRole: 'supervisor',
        priority: alert.urgency === 'overdue' ? 'urgent' : 'high',
        isRead: false,
        link: '/vehicles',
        createdAt: new Date().toISOString(),
      });
      createdCount++;
    }
  }

  return createdCount;
}
