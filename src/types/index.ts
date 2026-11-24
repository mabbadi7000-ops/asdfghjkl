export type UserRole = 'admin' | 'executive' | 'general_manager' | 'operations_manager' | 'supervisor';

export interface UserProfile {
  id: string;
  iqamaNumber: string;
  username?: string;
  fullName: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  branchId?: string;
  phone: string;
  status: 'active' | 'suspended' | 'inactive';
  isTemporaryPassword?: boolean;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficialLetter {
  id: string;
  referenceNumber: string;
  title: string;
  recipient: string;
  subject: string;
  contentHtml: string;
  category: 'salary_certificate' | 'driver_authorization' | 'platform_undertaking' | 'clearance' | 'general' | 'traffic' | 'insurance' | 'custody' | 'disciplinary';
  letterNumber?: string;
  letterMode?: 'direct' | 'custom';
  metadata?: Record<string, unknown> | string;
  recipientTitle?: string;
  content?: string;
  date?: string;
  templateId?: string;
  senderName?: string;
  senderRole?: string;
  driverId?: string;
  driverName?: string;
  platformId?: string;
  platformName?: string;
  hasStamp: boolean;
  hasSignature: boolean;
  signerName: string;
  signerTitle: string;
  status: 'draft' | 'issued' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'vacation' | 'sick_leave' | 'terminated';
export type DriverEmploymentType = 'on_sponsorship' | 'freelancer_rented' | 'supervisor_subrent';

export interface Driver {
  id: string;
  fullName: string;
  iqamaNumber: string;
  phone: string;
  nationality: string;
  birthDate?: string;
  iqamaExpiryDate: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiryDate: string;
  address?: string;
  photoUrl?: string;
  avatar?: string;
  iqamaDocUrl?: string;
  licenseDocUrl?: string;
  medicalDocUrl?: string;
  contractDocUrl?: string;
  driverCardDocUrl?: string; // كرت السائق (الهيئة العامة للنقل / بطاقة السائق)
  operationCardDocUrl?: string; // كرت التشغيل للمندوب
  customDocs?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    uploadedAt?: string;
    notes?: string;
  }>;
  platformId?: string;
  branchId?: string;
  supervisorId?: string;
  assignedVehicleId?: string;
  vehiclePlate?: string;
  dutyStatus?: 'on_duty' | 'off_duty';
  status: DriverStatus;
  employmentType?: DriverEmploymentType; // 'on_sponsorship' (على الكفالة) | 'freelancer_rented' (تأجير حساب فريلانسر) | 'supervisor_subrent' (تأجير فرعي من مشرف)
  primaryPlatform?: RentedAccountPlatform | string; // المنصة الأساسية المعين للعمل عليها
  autoGenerateFreelanceAccounts?: boolean; // توليد الحسابات المتبقية تلقائياً لمخزون الفريلانسر
  rentedAccountId?: string;
  rentedAccountCode?: string;
  supervisorPackageId?: string;
  startDate: string;
  endDate?: string;
  rating?: number;
  totalDeliveries?: number;
  basicSalary?: number; // الراتب الأساسي
  orderCommissionRate?: number; // عمولة الطلب المعتمدة (ر.س/طلب)
  targetOrdersCount?: number; // مستهدف الطلبات الشهري
  bankIban?: string; // الآيبان البنكي
  bankName?: string; // اسم البنك
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleStatus = 'available' | 'assigned' | 'in_operation' | 'maintenance' | 'accident' | 'inactive' | 'sold';

export type VehicleShiftType = 'day_shift' | 'night_shift' | 'custom_shift';
export type ShiftStatus = 'active' | 'completed' | 'scheduled' | 'cancelled';

export interface VehicleShift {
  id: string;
  vehicleId: string;
  driverId: string;
  shiftType: VehicleShiftType;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "07:00" or full ISO
  endTime: string; // e.g. "18:00" (11 hours)
  plannedHours: number; // typically 11
  startOdometer?: number;
  endOdometer?: number;
  status: ShiftStatus;
  handoverCheckNotes?: string;
  fuelLevel?: 'full' | 'half' | 'quarter' | 'empty';
  handoverToDriverId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  vehicleType: string;
  photoUrl?: string;
  frontPhotoUrl?: string;
  rearPhotoUrl?: string;
  sidePhotoUrl?: string;
  istemaraDocUrl?: string;
  insuranceDocUrl?: string;
  mvpiDocUrl?: string;
  operationCardDocUrl?: string;
  purchaseDate?: string;
  operationStartDate?: string;
  status: VehicleStatus;
  currentDriverId?: string;
  assignedDriverId?: string;
  currentDriver?: string;
  currentMileage?: number;
  lastFuelDate?: string;
  nextOilChangeMileage?: number;
  shiftModeEnabled?: boolean; // هل المركبة تعمل بنظام الورديات المزدوجة (11 ساعة لكل مندوب)
  currentShiftId?: string;
  dayDriverId?: string; // مندوب الوردية الصباحية (11 ساعة)
  nightDriverId?: string; // مندوب الوردية المسائية (11 ساعة)
  branchId?: string;
  insuranceCompany?: string;
  insuranceExpiryDate: string;
  istemaraExpiryDate: string;
  currentOdometer: number;
  fuelType: 'gasoline_91' | 'gasoline_95' | 'diesel' | 'hybrid' | 'electric';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FuelChipSystem = 'waee' | 'fleet_plus' | 'sasco' | 'aldrees' | 'petromin' | 'naft' | 'manual_cash' | 'other';

export interface FleetFuelContract {
  platform: FuelChipSystem;
  platformNameCustom?: string;
  accountNumber?: string;
  contractNumber?: string;
  defaultDailyQuotaPerDriver: number; // SAR/day
  workDaysPerMonth: number; // e.g. 26 or 30 days
  defaultFuelType: 'gasoline_91' | 'gasoline_95' | 'diesel';
  notes?: string;
  updatedAt?: string;
}

export interface FuelChip {
  id: string;
  chipNumber: string; // e.g. WEE-99120, FP-44120, SASCO-4412
  system: FuelChipSystem; // واعي | فلييت بلس | ساسكو | الدريس | بترومين | نفط | أخرى
  systemNameCustom?: string;
  driverId: string; // المندوب المستلم للبطاقة (الرابط الأساسي)
  driverName?: string;
  vehicleId: string; // المركبة المسندة للمندوب
  vehiclePlate?: string;
  shiftId?: string; // معرف الوردية المرتبطة (11 ساعة صباحية/مسائية)
  shiftType?: VehicleShiftType | string;
  status: 'active' | 'suspended' | 'limit_reached' | 'replacement_needed';
  dailyQuota: number; // حد الحصة اليومي بالريال (مثلاً 40 ر.س / يوم)
  daysPerMonth?: number; // أيام العمل في الشهر (26 أو 30 يوم)
  monthlyQuota: number; // المبلغ الشهري المخصص بالريال (مثلاً 1200 ر.س)
  dailyCap?: number; // سقف الصرف اليومي الأقصى (ر.س)
  currentMonthSpent: number; // إجمالي المستهلك خلال الشهر الحالي بالريال
  currentDaySpent?: number; // المستهلك اليوم بالريال
  remainingBalance?: number;
  balance?: number;
  lastUsageDate?: string;
  fuelType: 'gasoline_91' | 'gasoline_95' | 'diesel';
  accountNumber?: string;
  cardPin?: string; // الرقم السري للبطاقة
  issuedDate?: string; // تاريخ تسليم البطاقة للمندوب
  expiryDate?: string; // تاريخ انتهاء البطاقة
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FuelRecord {
  id: string;
  date: string; // YYYY-MM-DD HH:mm
  driverId: string; // المندوب المستلم للحصة
  driverName?: string;
  vehicleId: string; // المركبة
  vehiclePlate?: string;
  shiftId?: string; // معرف الوردية المربوطة
  shiftType?: VehicleShiftType | string; // وردية صباحية 11 ساعة أو مسائية 11 ساعة
  chipId?: string; // معرف البطاقة
  chipSystem?: FuelChipSystem;
  chipNumber?: string;
  transactionNumber?: string;
  invoiceNumber?: string; // رقم الفاتورة أو الإشعار
  gasStation: string;
  stationCity?: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number; // المبلغ المصروف بالريال
  totalAmount?: number;
  dailyQuotaAllowed?: number; // الحصة اليومية المعتمدة للمندوب
  quotaStatus?: 'fully_claimed' | 'partially_claimed' | 'quota_exceeded'; // حالة الحصة اليومية
  odometer: number;
  receiptUrl?: string;
  isAbnormal?: boolean;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  fraudVerificationCode?: string;
  createdAt?: string;
}

export type MaintenanceType = 'periodic' | 'oil_change' | 'tires' | 'brakes' | 'engine' | 'electrical' | 'ac' | 'emergency_repair' | 'other';
export type MaintenanceStatus = 'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  driverId?: string;
  driverName?: string;
  date: string;
  maintenanceType: MaintenanceType;
  description: string;
  priority: PriorityLevel;
  estimatedCost: number;
  actualCost?: number;
  cost?: number;
  workshopName: string;
  status: MaintenanceStatus;
  entryDate?: string;
  exitDate?: string;
  completionDate?: string;
  invoiceUrl?: string;
  notes?: string;
  odometerAtService?: number;
  nextServiceOdometer?: number;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedByRole?: string;
  fraudVerificationCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleTelemetry {
  id: string;
  vehicleId: string;
  plateNumber: string;
  makeModel: string;
  driverName?: string;
  lastPingTime: string;
  currentSpeed: number; // km/h
  engineStatus: 'running' | 'idle' | 'off';
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  dailyDistanceKm: number;
  weeklyDistanceKm: number;
  monthlyDistanceKm: number;
  avgFuelConsumptionPer100Km: number; // L/100KM
  fuelCostPerKm: number; // SAR/KM
  batteryVoltage?: number;
  coolantTemp?: number;
  oilLifePercent: number;
  brakePadLifePercent: number;
  tireLifePercent: number;
  overallHealthScore: number;
  simulatedGpsActive?: boolean;
}

export interface MaintenanceScheduleRule {
  id: string;
  name: string;
  nameEn: string;
  maintenanceType: MaintenanceType;
  intervalKm: number;
  warningThresholdKm: number;
  estimatedCost: number;
  description: string;
  descriptionEn: string;
}

export type AlertUrgency = 'safe' | 'approaching' | 'critical' | 'overdue';

export interface PredictiveMaintenanceAlert {
  id: string;
  vehicleId: string;
  plateNumber: string;
  vehicleModel: string;
  driverName?: string;
  serviceType: MaintenanceType;
  serviceName: string;
  serviceNameEn: string;
  lastServiceOdometer: number;
  lastServiceDate?: string;
  currentOdometer: number;
  nextServiceOdometer: number;
  remainingKm: number;
  estimatedDaysRemaining: number;
  urgency: AlertUrgency;
  recommendedAction: string;
  recommendedActionEn: string;
  estimatedCost: number;
  status: 'active' | 'scheduled' | 'dismissed';
}

export interface MileageLog {
  id: string;
  vehicleId: string;
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
  date: string;
  odometer: number;
  distanceTraveled: number;
  recordedBy: string;
  source: 'manual' | 'fuel_entry' | 'telematics_iot' | 'trip_end';
  notes?: string;
  createdAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'vacation' | 'sick' | 'emergency_leave';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
  delayMinutes?: number;
  supervisorId?: string;
  shiftId?: string; // الوردية المرتبطة
  shiftType?: VehicleShiftType; // نوع الوردية (صباحية، مسائية)
  vehicleId?: string; // المركبة المشغلة في الوردية
  leaveId?: string; // سجل الإجازة المرتبط
  notes?: string;
  createdAt?: string;
}

export type ContractStatus = 'active' | 'expired' | 'pending_renewal' | 'suspended';

export interface PlatformContract {
  id: string;
  platformId?: string;
  platformName?: string;
  contractNumber?: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  contractType: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  activeDriversCount: number;
  activeVehiclesCount: number;
  commissionRate?: number;
  targetOrders?: number;
  terms?: string;
  contractFileUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'pending' | 'completed' | 'rejected' | 'overdue';

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  assignedToId: string;
  priority: PriorityLevel;
  dueDate: string;
  status: TaskStatus;
  completedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReportType = 'daily_operations' | 'weekly_summary' | 'maintenance_audit' | 'incident_summary' | 'fuel_audit' | 'financial';
export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface ReportRecord {
  id: string;
  title: string;
  reportType: ReportType;
  date: string;
  period: string;
  department: string;
  authorId: string;
  summary: string;
  details: string;
  issues?: string;
  actionsTaken?: string;
  recommendations?: string;
  status: ReportStatus;
  reviewFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentType =
  | 'national_id'
  | 'iqama'
  | 'driver_license'
  | 'personal_photo'
  | 'medical_check'
  | 'istemara'
  | 'insurance'
  | 'vehicle_check'
  | 'vehicle_photo'
  | 'operation_card'
  | 'driver_card'
  | 'contract'
  | 'invoice'
  | 'platform_revenue_statement'
  | 'tax_invoice'
  | 'bank_statement'
  | 'settlement_receipt'
  | 'payroll_receipt'
  | 'advance_receipt'
  | 'company_registration'
  | 'commercial_register'
  | 'official_letter'
  | 'other';
export type DocumentOwnerType = 'driver' | 'vehicle' | 'company' | 'financial' | 'contract' | 'settlement' | 'payroll' | 'advance' | 'leave';

export interface DocumentRecord {
  id: string;
  title: string;
  docType: DocumentType;
  ownerType: DocumentOwnerType;
  ownerId: string;
  entityType?: DocumentOwnerType;
  entityId?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: string;
  issueDate?: string;
  expiryDate?: string;
  uploadedById: string;
  department?: string;
  platformRevenueId?: string; // رابط مباشر مع بيان إيرادات المنصة
  platformName?: string; // اسم المنصة (جاهز، هنقرستيشن...)
  amount?: number; // المبلغ المالي إن وجد
  notes?: string;
  createdAt?: string;
}

export type AccidentSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';
export type ClaimStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'closed';

export interface AccidentRecord {
  id: string;
  driverId: string;
  vehicleId: string;
  date: string;
  time: string;
  location: string;
  severity: AccidentSeverity;
  description: string;
  thirdPartyDetails?: string;
  estimatedCost: number;
  insuranceClaimStatus: ClaimStatus;
  actionsTaken?: string;
  photoUrls?: string;
  createdAt?: string;
}

export type ViolationStatus = 'unpaid' | 'paid' | 'under_appeal' | 'disputed';

export interface ViolationRecord {
  id: string;
  driverId: string;
  vehicleId: string;
  violationType: string;
  violationNumber: string;
  date: string;
  time?: string; // وقت حدوث المخالفة بصيغة HH:mm للمطابقة اللحظية مع الوردية
  shiftId?: string; // معرف الوردية التي وقعت خلالها المخالفة
  shiftType?: VehicleShiftType; // نوع الوردية (صباحية / مسائية)
  autoMatchedFromShift?: boolean; // هل تم الربط الآلي استناداً لتاريخ ووقت الوردية
  amount: number;
  status: ViolationStatus;
  deductedFromSalary?: boolean;
  recordedById?: string;
  recordedByName?: string;
  recordedByRole?: string;
  paidById?: string;
  paidByName?: string;
  paidByRole?: string;
  paidDate?: string;
  fraudVerificationCode?: string;
  notes?: string;
  createdAt?: string;
}

export type ExpenseCategory = 'fuel' | 'maintenance' | 'insurance' | 'fines' | 'salaries' | 'operations' | 'other';
export type ExpenseApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseRecord {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  relatedType?: 'vehicle' | 'driver' | 'branch' | 'general';
  relatedId?: string;
  vehicleId?: string;
  description: string;
  invoiceUrl?: string;
  createdById: string;
  createdByName?: string;
  createdByRole?: string;
  approvalStatus: ExpenseApprovalStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedByRole?: string;
  fraudVerificationCode?: string;
  createdAt?: string;
}

export type NotificationType = 'expiry' | 'maintenance' | 'task' | 'report' | 'accident' | 'violation' | 'system';

export interface NotificationRecord {
  id: string;
  recipientId?: string; // null means all / role broadcast
  targetRole?: UserRole;
  title: string;
  message: string;
  type: NotificationType;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  recordId: string;
  details: string;
  timestamp: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  managerName?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface CompanySettings {
  companyName: string;
  commercialRegistration: string;
  taxNumber: string;
  phone: string;
  email: string;
  address: string;
  defaultCurrency: string;
  fuelPricePerLiter91: number;
  fuelPricePerLiter95: number;
  fuelPriceDiesel: number;
  alertExpiryDays: number;
}

export type SettlementStatus = 'pending' | 'approved' | 'disputed' | 'rejected';
export type SettlementPaymentMethod =
  | 'cash_handover'
  | 'bank_transfer'
  | 'pos_network'
  | 'stc_pay'
  | 'deduction_from_salary';

export interface CashSettlementRecord {
  id: string;
  settlementNumber: string;
  date: string;
  driverId: string;
  driverName?: string;
  driverIqama?: string;
  platformId: string;
  platformName?: string;
  shiftPeriod?: string;
  periodFrom?: string;
  periodTo?: string;
  ordersCount: number;
  expectedAmount: number;
  collectedAmount: number;
  difference: number;
  paymentMethod: SettlementPaymentMethod;
  referenceNumber?: string;
  bankName?: string;
  receiptDocUrl?: string;
  receiptUrl?: string;
  receivedById: string;
  receivedByName?: string;
  receivedByRole?: string;
  status: SettlementStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  recordedById?: string;
  recordedByName?: string;
  recordedByRole?: string;
  fraudVerificationCode?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PayrollStatus = 'draft' | 'reviewed' | 'approved' | 'paid';

export interface DriverPayrollRecord {
  id: string;
  payrollNumber: string;
  month: string; // e.g. '2026-10'
  driverId: string;
  driverName: string;
  driverIqama: string;
  driverPhone?: string;
  platformName?: string;
  bankIban?: string;
  bankName?: string;

  // Earnings (الاستحقاقات والبدلات: الراتب الأساسي + عدد الطلبات × عمولة الطلب + المكافآت والحوافز)
  basicSalary: number;
  deliveriesCount: number;
  commissionRatePerOrder: number;
  deliveryCommissions: number;
  bonuses: number;
  grossEarnings: number;
  housingAllowance?: number; // ملغى بناء على طلب المستخدم - اختياري للتوافق مع السجلات السابقة
  transportAllowance?: number;

  // Connected Deductions
  advanceDeduction: number;
  cashShortageDeduction: number;
  violationDeduction: number;
  fuelExcessDeduction: number;
  absenceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netSalary: number;

  // Status & Payment
  status: PayrollStatus;
  paymentMethod?: 'wps_bank' | 'bank_transfer' | 'cash' | 'cheque';
  paymentDate?: string;
  paymentReference?: string;
  preparedById: string;
  preparedByName?: string;
  preparedByRole?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedByRole?: string;
  disbursedById?: string;
  disbursedByName?: string;
  disbursedByRole?: string;
  fraudVerificationCode?: string;
  notes?: string;
  payslipUrl?: string;
  paymentReceiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AdvanceStatus = 'active' | 'partially_paid' | 'paid' | 'cancelled';

export interface DriverAdvanceRecord {
  id: string;
  advanceNumber: string;
  driverId: string;
  driverName: string;
  driverIqama?: string;
  requestDate: string;
  amount: number;
  repaidAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  monthlyInstallment: number;
  reason: string;
  approvedById: string;
  approvedByName?: string;
  approvedByRole?: string;
  disbursedById?: string;
  disbursedByName?: string;
  disbursedByRole?: string;
  fraudVerificationCode?: string;
  status: AdvanceStatus;
  disbursedDate?: string;
  notes?: string;
  receiptDocUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ----------------------------------------------------
// FREELANCER & RENTED ACCOUNTS MANAGEMENT (إدارة الفريلانسر والحسابات المؤجرة)
// ----------------------------------------------------

export type RentedAccountPlatform =
  | 'jahez'
  | 'hungerstation'
  | 'toyou'
  | 'ninja'
  | 'keeta'
  | 'mrsool'
  | 'barq'
  | 'careem_box'
  | 'other';

export type RentedAccountStatus =
  | 'available' // متاح للتأجير
  | 'rented_direct' // مؤجر مباشرة لكابتن فريلانسر
  | 'rented'
  | 'assigned_to_supervisor' // مسلّم لحزمة مشرف ميداني
  | 'suspended' // موقوف مؤقتاً
  | 'under_review' // قيد التدقيق والفحص
  | 'banned_by_platform'; // محظور من منصة التوصيل

export type AccountBillingCycle = 'daily' | 'weekly' | 'monthly';

export interface RentedAccount {
  id: string;
  platform: RentedAccountPlatform;
  platformName: string;
  platformId?: string;
  platformContractId?: string;
  accountCode: string; // e.g. JH-99210
  appUsername: string; // login identifier on the platform
  registeredPhone: string;
  status: RentedAccountStatus;
  dailyRate: number; // e.g. 35 SAR
  weeklyRate: number; // e.g. 220 SAR
  monthlyRate: number; // e.g. 850 SAR
  securityDeposit: number; // e.g. 300 SAR
  
  // Origin Details (المندوب المكفول صاحب الحساب / الهوية المسجل بها الحساب)
  originDriverId?: string;
  originDriverName?: string;
  originDriverIqama?: string;
  originDriverPhone?: string;
  isOriginSponsoredDriver?: boolean; // هل تم توليد الحساب من مندوب مكفول بالشركة
  originDriverActivePlatform?: string; // المنصة الأساسية التي يعمل عليها المندوب الأصلي

  // Current Active Assignment (Direct or Supervisor)
  assignedType?: 'direct_driver' | 'supervisor_package' | 'none';
  currentDriverId?: string;
  currentFreelancerId?: string;
  currentFreelancerName?: string;
  currentDriverName?: string;
  currentDriverPhone?: string;
  currentDriverIqama?: string;
  currentSupervisorId?: string;
  currentSupervisorName?: string;
  currentPackageId?: string;
  currentRentalId?: string;
  rentedAt?: string;

  // Health and Metrics
  totalRentalRevenue: number;
  totalOrdersCompleted?: number;
  appPasswordHint?: string; // encrypted or masked for security
  city: string;
  notes?: string;
  createdById: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RentalStatus = 'active' | 'completed' | 'overdue' | 'suspended' | 'cancelled';
export type DepositStatus = 'held' | 'refunded' | 'deducted_for_damages';

export interface FreelancerRental {
  id: string;
  rentalNumber: string; // e.g. RNT-2026-1001
  accountId: string;
  accountCode: string;
  platformName: string;
  driverId: string;
  driverName: string;
  driverIqama: string;
  driverPhone: string;
  rentalType: 'direct_freelancer' | 'supervisor_subrent';
  supervisorId?: string;
  supervisorName?: string;
  
  // Contract Dates & Billing
  startDate: string;
  endDate?: string;
  billingCycle: AccountBillingCycle;
  rentAmount: number; // amount per cycle
  securityDeposit: number;
  depositStatus: DepositStatus;

  // Financial Ledger
  totalBilled: number;
  totalPaid: number;
  paidAmount?: number;
  balanceDue: number;
  paymentStatus?: 'paid_full' | 'partially_paid' | 'unpaid';
  paymentMethod?: FreelancerPaymentMethod;
  paymentReference?: string;
  lastPaymentDate?: string;
  nextPaymentDueDate: string;
  status: RentalStatus;

  // Signatures & Fraud Protection
  assignedById: string;
  assignedByName?: string;
  assignedByRole?: string;
  fraudVerificationCode?: string;
  notes?: string;
  contractDocUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SupervisorPackageStatus = 'active' | 'settled' | 'overdue' | 'suspended';

export interface SupervisorAccountPackage {
  id: string;
  packageNumber: string; // e.g. PKG-SUP-2026-001
  packageName: string; // e.g. حزمة حسابات شمال الرياض - 15 يوزر
  supervisorId: string;
  supervisorName: string;
  supervisorPhone: string;
  platform: RentedAccountPlatform;
  platformName: string;
  
  // Package Quota
  accountsCount: number;
  accountIds: string[]; // list of RentedAccount ids
  activeRentedCount: number;
  availableInPackageCount: number;

  // Wholesale Pricing Model (سعر الجملة للشركة مقابل تأجير المشرف بالقطاعي)
  wholesaleRatePerAccount: number; // e.g. 600 SAR/month
  suggestedRetailRate: number; // e.g. 850 SAR/month
  totalWholesaleDue: number; // e.g. 15 * 600 = 9000 SAR
  totalCollectedFromSupervisor: number;
  supervisorBalanceDue: number;
  supervisorMarginEstimate: number; // estimated profit for the supervisor

  startDate: string;
  endDate: string;
  billingCycle: AccountBillingCycle;
  status: SupervisorPackageStatus;

  // Operators
  managedById: string;
  managedByName?: string;
  managedByRole?: string;
  fraudVerificationCode?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FreelancerPaymentMethod = 'cash' | 'bank_transfer' | 'pos_network' | 'stc_pay';

export interface FreelancerPayment {
  id: string;
  paymentNumber: string; // e.g. RCP-RNT-2026-001
  rentalId?: string;
  rentalNumber?: string;
  packageId?: string;
  packageNumber?: string;
  payerType: 'freelancer_driver' | 'field_supervisor';
  payerId: string;
  payerName: string;
  payerPhone?: string;
  payerIqama?: string;
  amount: number;
  paymentDate: string;
  periodCoveredFrom?: string;
  periodCoveredTo?: string;
  paymentMethod: FreelancerPaymentMethod;
  bankName?: string;
  referenceNumber?: string;
  receiptDocUrl?: string;

  // Operators & Anti-Fraud
  receivedById: string;
  receivedByName?: string;
  receivedByRole?: string;
  fraudVerificationCode?: string;
  notes?: string;
  createdAt?: string;
}

// Platform Invoices & Reconciliation Types
export type CourierAllocationType =
  | 'sponsored_driver' // مندوب على الكفالة (مسيرات الرواتب)
  | 'freelancer' // كابتن فريلانسر (تأجير حسابات / تسوية فريلانسر)
  | 'supervisor_package' // حزمة فريلانسر / مشرف ميداني
  | 'external'; // كابتن خارجي (مستبعد)

export interface PlatformInvoiceRow {
  id: string;
  platformCourierId?: string;
  driverName: string;
  iqamaNumber: string;
  phone?: string;
  deliveredOrders: number;
  totalOrderValue?: number;
  deliveryFeeGross?: number;
  platformDeductions?: number;
  netPayout: number;

  // Allocation & Employment Classification
  allocationType?: CourierAllocationType;

  // 1. Sponsored Driver (الكفالة)
  matchedDriverId?: string;
  matchedDriverName?: string;

  // 2. Freelancer Courier (الفريلانسر)
  freelancerRentalId?: string;
  rentedAccountId?: string;
  freelancerRentDeduction?: number; // إيجار الحساب أو عمولة المنظومة المستقطعة
  freelancerNetDue?: number; // صافي المستحق للفريلانسر بعد استقطاع إيجار الحساب

  // 3. Supervisor Package (حزمة فريلانسر / مشرف ميداني)
  supervisorPackageId?: string;
  supervisorPackageName?: string;
  supervisorName?: string;
  supervisorWholesaleRate?: number; // سعر الجملة للحساب في الحزمة

  isMatched: boolean;
  isManuallyAssigned?: boolean;
  notes?: string;
  rawTextSnippet?: string;
  matchConfidence?: number;
  suggestedDriverId?: string;
  suggestedDriverName?: string;
  suggestedAllocationType?: CourierAllocationType;
  // Manual Payroll Linkage
  isLinkedToPayroll?: boolean;
  linkedDriverId?: string;
  linkedDriverName?: string;
  linkedPayrollId?: string;
  linkedPayrollMonth?: string;
  linkedAt?: string;
  // Platform Contract Binding
  platformContractId?: string;
  platformContractName?: string;
}

export interface PlatformInvoiceReconciliation {
  id: string;
  platformName: string;
  invoiceNumber: string;
  month: string;
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  matchedRowsCount: number;
  unmatchedRowsCount: number;
  totalOrdersAll: number;
  totalOrdersMatched: number;
  totalAmountAll: number;
  totalAmountMatched: number;
  rows: PlatformInvoiceRow[];
}

// Platform Revenues Dedicated Tab & Database Schema
export interface PlatformRevenueItem {
  id: string;
  courierName: string;
  courierCode?: string;
  iqamaNumber?: string;
  phone?: string;
  ordersCount: number;
  grossFee: number;
  deductions: number;
  netPayout: number;
  // Manual payroll linkage & allocation
  isLinkedToPayroll: boolean;
  linkedDriverId?: string;
  linkedDriverName?: string;
  linkedPayrollId?: string;
  linkedPayrollMonth?: string;
  linkedAt?: string;
  // Platform contract linking
  platformContractId?: string;
  platformContractName?: string;
  allocationNotes?: string;
  allocationCategory?: 'sponsored_driver' | 'freelancer' | 'supervisor_package' | 'unassigned';
}

export interface PlatformRevenueStatement {
  id: string;
  statementNumber: string; // e.g. REV-HNGR-2026-10-001
  platformName: string; // e.g. هنقرستيشن (Hungerstation), جاهز (Jahez)...
  platformContractId?: string; // e.g. plt-01
  platformContractName?: string;
  month: string; // e.g. 2026-10
  fileName: string;
  invoiceDocUrl?: string;
  sheetName?: string;
  uploadedAt: string;
  totalCouriers: number;
  totalOrders: number;
  totalGrossFee: number;
  totalDeductions: number;
  totalNetRevenue: number;
  linkedToPayrollCount: number;
  unlinkedCount: number;
  status: 'saved' | 'partially_allocated' | 'fully_allocated';
  items: PlatformRevenueItem[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DeletedRecord {
  id: string;
  originalCollection: string;
  originalId: string;
  itemTitle: string;
  payload?: string;
  deletionMetadata?: string;
  itemSummary?: string;
  itemData?: any;
  deletedByUserId: string;
  deletedByUserName: string;
  deletedAt: string;
  deletionReason?: string;
  deletedByUserRole?: string;
  deletedByUserEmail?: string;
  status?: 'trashed' | 'restored' | 'purged';
  restoredAt?: string;
  restoredByUserId?: string;
  restoredByUserName?: string;
}

// Enterprise System Backup & Disaster Recovery Interfaces
export type BackupType = 'full' | 'selective' | 'scheduled' | 'pre_restore_safety';

export interface CollectionBackupStats {
  collectionName: string;
  count: number;
  sizeBytes: number;
}

export interface SystemBackupRecord {
  id: string;
  backupName: string;
  backupType: BackupType;
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  createdByUserRole: string;
  collectionsIncluded: string[];
  totalRecordsCount: number;
  totalSizeBytes: number;
  checksum: string; // Cryptographic integrity hash
  status: 'completed' | 'in_progress' | 'failed' | 'restoring';
  notes?: string;
  storageType: 'd1_cloud' | 'local_file';
  dataPayload?: Record<string, any[]>; // Collection name -> array of documents
  restoreHistory?: {
    restoredAt: string;
    restoredByUserId: string;
    restoredByUserName: string;
    safetyBackupId?: string;
  }[];
}

export interface BackupPolicySettings {
  autoBackupEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  scheduledTime: string; // e.g. "03:00"
  retentionDays: number; // e.g. 30
  includedCollections: string[];
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
}

export type LeaveType = 'annual' | 'emergency' | 'sick' | 'weekly_rest' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface DriverLeaveRecord {
  id: string;
  driverId: string;
  driverName?: string;
  driverIqama?: string;
  driverPhone?: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  status: LeaveStatus;
  reason?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  attachmentUrl?: string;
  isAutoDistributed?: boolean; // هل تم توليدها بواسطة خوارزمية التوزيع الذكي
  autoDistributionBatchId?: string;
  createdAt?: string;
  updatedAt?: string;
}
