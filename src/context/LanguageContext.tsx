import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '../services/dataService';

export type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  // App Branding & Navigation
  appName: { ar: 'مارشال لوجستيكس | إدارة الأسطول والتشغيل', en: 'MARSHAL LOGISTIC | Fleet Operations' },
  appTagline: { ar: 'منظومة إدارة تشغيل أساطيل التوصيل والخدمات اللوجستية', en: 'Delivery Fleet & Logistics Management System' },
  enterpriseCloud: { ar: 'السحابة المؤسسية', en: 'Enterprise Cloud' },
  footerTag: { ar: 'مارشال لوجستيكس v2.4 • MARSHAL LOGISTIC KSA', en: 'MARSHAL LOGISTIC v2.4 • KSA Logistics' },
  dashboard: { ar: 'لوحة القيادة', en: 'Dashboard' },
  users: { ar: 'المستخدمون والصلاحيات', en: 'Users & Permissions' },
  drivers: { ar: 'إدارة السائقين', en: 'Drivers' },
  vehicles: { ar: 'إدارة المركبات', en: 'Vehicles' },
  fuel: { ar: 'إدارة الوقود', en: 'Fuel Management' },
  maintenance: { ar: 'الصيانة والورش', en: 'Maintenance' },
  attendance: { ar: 'الحضور والانصراف', en: 'Attendance' },
  leaves: { ar: 'إدارة الإجازات وجدول العطلات', en: 'Driver Leaves & Schedules' },
  platforms: { ar: 'المنصات والعقود', en: 'Platforms & Contracts' },
  tasks: { ar: 'المهام التشغيلية', en: 'Operations Tasks' },
  reports: { ar: 'بوابة التقارير', en: 'Reporting Portal' },
  documents: { ar: 'الأرشيف والمستندات', en: 'Documents & Archive' },
  accidents: { ar: 'الحوادث والمطالبات', en: 'Accidents & Claims' },
  violations: { ar: 'المخالفات المرورية', en: 'Traffic Violations' },
  expenses: { ar: 'المصروفات التشغيلية', en: 'Expenses' },
  cash_settlement: { ar: 'تصفية عهد الكاش', en: 'Cash Settlements' },
  cashSettlement: { ar: 'تصفية عهد الكاش', en: 'Cash Settlements' },
  freelancers: { ar: 'إدارة الفريلانسر والحسابات المؤجرة', en: 'Freelancers & Rented Accounts' },
  rentedAccounts: { ar: 'الحسابات المؤجرة', en: 'Rented Accounts' },
  payroll: { ar: 'رواتب ومستحقات المناديب', en: 'Driver Payroll' },
  driverPayroll: { ar: 'رواتب ومستحقات المناديب', en: 'Driver Payroll' },
  notifications: { ar: 'مركز التنبيهات', en: 'Notifications' },
  analytics: { ar: 'التحليلات ومؤشرات الأداء', en: 'Analytics & KPIs' },
  recycleBin: { ar: 'إدارة المحذوفات', en: 'Recycle Bin' },
  systemBackups: { ar: 'النسخ الاحتياطي وحماية النظام', en: 'System Backups & Recovery' },
  auditLogs: { ar: 'سجل النشاط والأمان', en: 'Audit Logs' },
  officialLetters: { ar: 'الخطابات والمكاتبات', en: 'Official Letters' },
  settings: { ar: 'إعدادات النظام', en: 'System Settings' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
  login: { ar: 'تسجيل الدخول', en: 'Login' },

  // Role labels
  role: { ar: 'الدور / الصلاحية', en: 'Role' },
  admin: { ar: 'مدير النظام (Admin)', en: 'System Administrator (Admin)' },
  adminRole: { ar: 'مدير النظام والصلاحيات والأمان', en: 'System & Security Admin' },
  generalManager: { ar: 'المدير العام', en: 'General Manager' },
  operationsManager: { ar: 'مدير التشغيل', en: 'Operations Manager' },
  supervisor: { ar: 'مشرف تشغيل', en: 'Supervisor' },
  driver: { ar: 'مندوب توصيل', en: 'Delivery Driver' },
  currentUserLabel: { ar: 'المستخدم الحالي', en: 'Current User' },

  // Auth & Profile
  iqamaNumber: { ar: 'رقم الإقامة / الهوية', en: 'Iqama / ID Number' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  newPassword: { ar: 'كلمة المرور الجديدة', en: 'New Password' },
  confirmPassword: { ar: 'تأكيد كلمة المرور', en: 'Confirm Password' },
  temporaryPasswordWarning: { ar: 'يجب عليك تغيير كلمة المرور المؤقتة قبل المتابعة', en: 'You must change your temporary password before proceeding' },

  // General Actions & Controls
  search: { ar: 'بحث...', en: 'Search...' },
  filter: { ar: 'تصفية', en: 'Filter' },
  status: { ar: 'الحالة', en: 'Status' },
  actions: { ar: 'الإجراءات', en: 'Actions' },
  add: { ar: 'إضافة', en: 'Add' },
  edit: { ar: 'تعديل', en: 'Edit' },
  delete: { ar: 'حذف', en: 'Delete' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  confirm: { ar: 'تأكيد', en: 'Confirm' },
  close: { ar: 'إغلاق', en: 'Close' },
  back: { ar: 'رجوع', en: 'Back' },
  next: { ar: 'التالي', en: 'Next' },
  submit: { ar: 'إرسال', en: 'Submit' },
  view: { ar: 'معاينة', en: 'View' },
  details: { ar: 'التفاصيل', en: 'Details' },
  download: { ar: 'تحميل', en: 'Download' },
  upload: { ar: 'رفع ملف', en: 'Upload' },
  preview: { ar: 'معاينة المستند', en: 'Preview Document' },
  print: { ar: 'طباعة', en: 'Print' },
  refresh: { ar: 'تحديث البيانات', en: 'Refresh' },
  all: { ar: 'الكل', en: 'All' },
  loading: { ar: 'جارٍ التحميل...', en: 'Loading...' },
  noData: { ar: 'لا توجد بيانات متوفرة حالياً', en: 'No data available' },
  noDataDesc: { ar: 'يمكنك البدء بإضافة سجل جديد أو تغيير معايير البحث والفلترة.', en: 'You can start by adding a new record or modifying search filters.' },
  confirmDeleteTitle: { ar: 'تأكيد الحذف', en: 'Confirm Deletion' },
  confirmDeleteMsg: { ar: 'هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.', en: 'Are you sure you want to permanently delete this record? This action cannot be undone.' },
  sar: { ar: 'ر.س', en: 'SAR' },
  today: { ar: 'اليوم', en: 'Today' },
  thisWeek: { ar: 'هذا الأسبوع', en: 'This Week' },
  thisMonth: { ar: 'هذا الشهر', en: 'This Month' },
  lastMonth: { ar: 'الشهر الماضي', en: 'Last Month' },
  allTime: { ar: 'كافة الفترات', en: 'All Time' },
  vsPreviousPeriod: { ar: 'مقارنة بالفترة السابقة', en: 'vs previous period' },
  date: { ar: 'التاريخ', en: 'Date' },
  time: { ar: 'الوقت', en: 'Time' },
  branch: { ar: 'الفرع', en: 'Branch' },
  priority: { ar: 'الأولوية', en: 'Priority' },
  notes: { ar: 'الملاحظات', en: 'Notes' },
  reason: { ar: 'السبب', en: 'Reason' },

  // Priority levels
  urgent: { ar: 'عاجل جداً', en: 'Urgent' },
  high: { ar: 'مرتفع', en: 'High' },
  medium: { ar: 'متوسط', en: 'Medium' },
  low: { ar: 'منخفض', en: 'Low' },

  // Common Entity Statuses
  active: { ar: 'نشط', en: 'Active' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  vacation: { ar: 'إجازة', en: 'Vacation' },
  sickLeave: { ar: 'مرضي', en: 'Sick Leave' },
  terminated: { ar: 'منتهي خدماته', en: 'Terminated' },
  available: { ar: 'متاح', en: 'Available' },
  assigned: { ar: 'مسند', en: 'Assigned' },
  inOperation: { ar: 'بالخدمة', en: 'In Operation' },
  maintenanceStatus: { ar: 'في الصيانة', en: 'In Maintenance' },
  accident: { ar: 'حادث', en: 'Accident' },
  sold: { ar: 'مباع', en: 'Sold' },
  present: { ar: 'حاضر', en: 'Present' },
  absent: { ar: 'غائب', en: 'Absent' },
  late: { ar: 'متأخر', en: 'Late' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  reviewed: { ar: 'تمت المراجعة', en: 'Reviewed' },
  paid: { ar: 'مدفوع', en: 'Paid' },
  unpaid: { ar: 'غير مسدد', en: 'Unpaid' },
  partiallyPaid: { ar: 'مسدد جزئياً', en: 'Partially Paid' },
  disputed: { ar: 'متنازع عليه', en: 'Disputed' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  inProgress: { ar: 'قيد التنفيذ', en: 'In Progress' },
  draft: { ar: 'مسودة', en: 'Draft' },

  // Attendance
  clockIn: { ar: 'تسجيل بداية الدوام', en: 'Clock In' },
  clockOut: { ar: 'تسجيل نهاية الدوام', en: 'Clock Out' },
  checkInSuccess: { ar: 'تم تسجيل بداية الوردية بنجاح', en: 'Clocked in successfully' },
  checkOutSuccess: { ar: 'تم تسجيل نهاية الوردية بنجاح', en: 'Clocked out successfully' },

  // Export & Tables
  exportExcel: { ar: 'تصدير Excel', en: 'Export Excel' },
  exportCSV: { ar: 'تصدير CSV', en: 'Export CSV' },
  printPDF: { ar: 'طباعة PDF', en: 'Print PDF' },
  exportReports: { ar: 'تصدير التقارير', en: 'Export Data' },
  enterpriseExport: { ar: 'خيارات التصدير الرسمية', en: 'Enterprise Export' },
  executiveExcel: { ar: 'إكسيل معتمد (Excel .xls)', en: 'Executive Excel (.xls)' },
  corporateStyled: { ar: 'منسق مع الهوية الرسمية', en: 'Corporate styled & branded' },
  officialPDF: { ar: 'وثيقة PDF رسمية (Print / PDF)', en: 'Official PDF Document' },
  letterheadAndSeals: { ar: 'ترويسة وأختام واعتمادات', en: 'With letterhead & seals' },
  standardCSV: { ar: 'جدول بيانات (CSV .csv)', en: 'Standard CSV Data' },
  utf8Bom: { ar: 'ترميز UTF-8 للانظمة الخارجية', en: 'UTF-8 BOM for pipelines' },
  recordsCount: { ar: 'سجل', en: 'records' },
  showing: { ar: 'عرض', en: 'Showing' },
  to: { ar: 'إلى', en: 'to' },
  of: { ar: 'من أصل', en: 'of' },
  page: { ar: 'صفحة', en: 'Page' },

  // Driver Management
  fullName: { ar: 'الاسم الكامل', en: 'Full Name' },
  phone: { ar: 'رقم الجوال', en: 'Phone Number' },
  nationality: { ar: 'الجنسية', en: 'Nationality' },
  birthDate: { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
  iqamaExpiryDate: { ar: 'تاريخ انتهاء الإقامة', en: 'Iqama Expiry Date' },
  licenseNumber: { ar: 'رقم رخصة القيادة', en: 'License Number' },
  licenseType: { ar: 'نوع الرخصة', en: 'License Type' },
  licenseExpiryDate: { ar: 'تاريخ انتهاء الرخصة', en: 'License Expiry Date' },
  totalDeliveries: { ar: 'إجمالي الطلبات المنجزة', en: 'Total Deliveries' },
  rating: { ar: 'التقييم', en: 'Rating' },
  assignedVehicle: { ar: 'المركبة المسندة', en: 'Assigned Vehicle' },
  addNewDriver: { ar: 'إضافة سائق جديد', en: 'Add New Driver' },
  editDriver: { ar: 'تعديل بيانات الكابتن', en: 'Edit Driver Details' },
  driverDetails: { ar: 'الملف الشامل للكابتن', en: 'Comprehensive Driver Profile' },
  driverPhoto: { ar: 'الصورة الشخصية للكابتن', en: 'Driver Photo' },
  uploadDriverPhoto: { ar: 'رفع صورة شخصية', en: 'Upload Driver Photo' },
  officialDocs: { ar: 'المستندات والصور الرسمية', en: 'Official Documents & Photos' },
  basicInfo: { ar: 'البيانات الأساسية', en: 'Basic Information' },
  financialsAndSettlements: { ar: 'المالية والرواتب والكاش', en: 'Financials, Payroll & Cash' },
  tasksCount: { ar: 'المهام', en: 'Tasks' },
  violationsCount: { ar: 'المخالفات', en: 'Violations' },
  attendanceTab: { ar: 'الحضور', en: 'Attendance' },
  residencyIqama: { ar: 'صورة الإقامة الرسمية', en: 'Residency Permit (Iqama)' },
  drivingLicenseDoc: { ar: 'صورة رخصة القيادة', en: 'Driving License Document' },
  medicalReportDoc: { ar: 'الفحص الطبي', en: 'Medical Exam Report' },
  employmentContractDoc: { ar: 'عقد العمل', en: 'Employment Contract' },

  // Vehicle Management
  plateNumber: { ar: 'رقم اللوحة', en: 'Plate Number' },
  vin: { ar: 'رقم الهيكل (VIN)', en: 'VIN Number' },
  make: { ar: 'الشركة الصانعة', en: 'Make' },
  model: { ar: 'الموديل / الطراز', en: 'Model' },
  year: { ar: 'سنة الصنع', en: 'Year' },
  color: { ar: 'اللون', en: 'Color' },
  vehicleType: { ar: 'نوع المركبة', en: 'Vehicle Type' },
  fuelType: { ar: 'نوع الوقود', en: 'Fuel Type' },
  odometer: { ar: 'قراءة العداد (كم)', en: 'Odometer (km)' },
  insuranceCompany: { ar: 'شركة التأمين', en: 'Insurance Company' },
  insuranceExpiryDate: { ar: 'تاريخ انتهاء التأمين', en: 'Insurance Expiry Date' },
  istemaraExpiryDate: { ar: 'تاريخ انتهاء الاستمارة', en: 'Istemara Expiry Date' },
  addNewVehicle: { ar: 'إضافة مركبة جديدة', en: 'Add New Vehicle' },
  editVehicle: { ar: 'تعديل بيانات المركبة', en: 'Edit Vehicle Details' },
  vehicleDetails: { ar: 'الملف الشامل للمركبة', en: 'Vehicle Full Profile' },
  vehiclePhoto: { ar: 'صورة المركبة', en: 'Vehicle Photo' },
  uploadVehiclePhoto: { ar: 'رفع صورة المركبة', en: 'Upload Vehicle Photo' },
  specsAndDetails: { ar: 'البيانات الأساسية والمواصفات', en: 'Basic Specs & Details' },
  photosAndDocs: { ar: 'الصور والمستندات', en: 'Photos & Documents' },
  istemaraDoc: { ar: 'وثيقة استمارة السير', en: 'Vehicle Registration (Istemara)' },
  insuranceDoc: { ar: 'وثيقة التأمين التجاري', en: 'Commercial Insurance Policy' },
  mvpiDoc: { ar: 'شهادة الفحص الدوري (MVPI)', en: 'Periodic Inspection (MVPI)' },
  operationCardDoc: { ar: 'بطاقة التشغيل (هيئة النقل)', en: 'Transport Operation Card' },

  // Fuel Management & Chip Systems
  fuelManagement: { ar: 'إدارة الوقود', en: 'Fuel Management' },
  fuelLogs: { ar: 'سجلات التزود بالوقود', en: 'Fuel Consumption Logs' },
  addFuelLog: { ar: 'تسجيل عملية وقود جديدة', en: 'Log Fuel Transaction' },
  chipSystem: { ar: 'نظام الشريحة', en: 'Fuel Chip System' },
  chipNumber: { ar: 'رقم الشريحة', en: 'Chip Number' },
  gasStation: { ar: 'المحطة', en: 'Gas Station' },
  liters: { ar: 'كمية اللترات', en: 'Liters' },
  cost: { ar: 'التكلفة الإجمالية', en: 'Total Cost' },
  pricePerLiter: { ar: 'سعر اللتر', en: 'Price / Liter' },
  transactionNumber: { ar: 'رقم الفاتورة / العملية', en: 'Transaction / Invoice #' },
  abnormalConsumption: { ar: 'استهلاك غير طبيعي', en: 'Abnormal Consumption' },
  normalConsumption: { ar: 'استهلاك منتظم', en: 'Normal Consumption' },
  fuelChipsManagement: { ar: 'منظومة شرائح الوقود الذكية', en: 'Smart Fuel Chips System' },
  addFuelChip: { ar: 'إصدار شريحة وقود جديدة', en: 'Register Fuel Chip' },
  monthlyQuota: { ar: 'الحصة الشهرية', en: 'Monthly Quota' },
  spentThisMonth: { ar: 'المستهلك هذا الشهر', en: 'Spent This Month' },
  dailyCap: { ar: 'الحد اليومي', en: 'Daily Cap' },
  waeeSystem: { ar: 'نظام واعي الذكي (Waee)', en: 'Waee Smart Chip System' },
  sascoSystem: { ar: 'ساسكو بالم (Sasco Palm)', en: 'Sasco Palm Chip' },
  aldreesSystem: { ar: 'الدريس واعي (Aldrees)', en: 'Aldrees Waee Chip' },
  petrominSystem: { ar: 'بترومين أوتوكير (Petromin)', en: 'Petromin Fuel System' },
  naftSystem: { ar: 'شريحة نفط (Naft)', en: 'Naft Chip System' },
  manualCash: { ar: 'نقدي يدوي', en: 'Manual Cash' },
  gasoline91: { ar: 'بنزين 91', en: 'Gasoline 91' },
  gasoline95: { ar: 'بنزين 95', en: 'Gasoline 95' },
  diesel: { ar: 'ديزل', en: 'Diesel' },

  // Cash Settlements (Couriers & Delivery Apps)
  cashSettlementTitle: { ar: 'إدارة وتصفية عهد الكاش المستلم من المناديب', en: 'Delivery Couriers Cash Settlement & Clearance' },
  settlementNumber: { ar: 'رقم التصفية', en: 'Settlement #' },
  addSettlement: { ar: 'تسجيل وتصفية كاش جديد للمناديب', en: 'Record Cash Settlement' },
  editSettlement: { ar: 'تعديل تصفية كاش', en: 'Edit Cash Settlement' },
  ordersCount: { ar: 'عدد الطلبات', en: 'Orders Count' },
  expectedAmount: { ar: 'المبلغ المتوقع', en: 'Expected Amount' },
  collectedAmount: { ar: 'المبلغ المحصل', en: 'Collected Amount' },
  differenceAmount: { ar: 'الفارق / العجز', en: 'Difference / Shortage' },
  shiftPeriod: { ar: 'فترة الوردية', en: 'Shift Period' },
  platform: { ar: 'منصة التوصيل', en: 'Delivery Platform' },
  paymentMethod: { ar: 'طريقة التوريد / السداد', en: 'Payment Method' },
  cashHandover: { ar: 'تسليم نقدي مباشر', en: 'Direct Cash Handover' },
  bankTransfer: { ar: 'تحويل بنكي مباشر', en: 'Direct Bank Transfer' },
  posNetwork: { ar: 'شبكة مدى / POS', en: 'Mada POS Terminal' },
  stcPay: { ar: 'STC Pay / محفظة رقمية', en: 'STC Pay / Digital Wallet' },
  deductionFromSalary: { ar: 'خصم من الراتب الشهري', en: 'Salary Deduction' },
  receiptDoc: { ar: 'إيصال التوريد / الحوالة', en: 'Receipt / Transfer Doc' },
  receivedBy: { ar: 'المستلم', en: 'Received By' },
  reviewedBy: { ar: 'المعتمد', en: 'Reviewed By' },
  settlementVoucher: { ar: 'سند تصفية وقبض عهدة كاش', en: 'Cash Settlement Voucher' },
  printVoucher: { ar: 'طباعة السند', en: 'Print Voucher' },
  matchedClean: { ar: 'مطابق 100%', en: 'Matched 100%' },
  shortageDeficit: { ar: 'عجز كاش', en: 'Cash Deficit' },
  surplusExcess: { ar: 'فائض كاش', en: 'Cash Surplus' },

  // Driver Payroll & Advances
  driverPayrollHeading: { ar: 'إدارة مسيرات رواتب ومستحقات المناديب', en: 'Driver Payroll & Earnings Management' },
  payrollNumber: { ar: 'رقم المسير', en: 'Payroll #' },
  month: { ar: 'الشهر المالي', en: 'Payroll Month' },
  basicSalary: { ar: 'الراتب الأساسي', en: 'Basic Salary' },
  deliveriesCountLabel: { ar: 'عدد الطلبات المنجزة', en: 'Delivered Orders' },
  commissionRate: { ar: 'عمولة الطلب', en: 'Rate / Order' },
  deliveryCommissions: { ar: 'عمولات التوصيل', en: 'Delivery Commissions' },
  bonuses: { ar: 'مكافآت وحوافز إضافية', en: 'Bonuses & Incentives' },
  grossEarnings: { ar: 'إجمالي المستحقات (Gross)', en: 'Gross Earnings' },
  totalDeductions: { ar: 'إجمالي الاستقطاعات', en: 'Total Deductions' },
  netSalary: { ar: 'صافي الراتب المستحق (Net)', en: 'Net Salary Due' },
  advanceDeduction: { ar: 'قسط السلفة المالية', en: 'Advance / Loan Deduction' },
  cashShortageDeduction: { ar: 'عجز تصفية الكاش', en: 'Cash Shortage Deduction' },
  violationDeduction: { ar: 'المخالفات المرورية', en: 'Traffic Fine Deduction' },
  fuelExcessDeduction: { ar: 'تجاوز حصة الوقود', en: 'Fuel Excess Deduction' },
  absenceDeduction: { ar: 'استقطاع الغياب', en: 'Absence Deduction' },
  otherDeductions: { ar: 'استقطاعات أخرى', en: 'Other Deductions' },
  calculatePayroll: { ar: 'إعداد مسير راتب شهري للكابتن', en: 'Calculate Monthly Payroll' },
  editPayroll: { ar: 'تعديل مسير راتب الكابتن', en: 'Edit Driver Payroll' },
  platformInvoices: { ar: 'إيرادات المنصة وإيرادات التشغيل', en: 'Platform & Operations Revenue' },
  platformRevenues: { ar: 'إيرادات المنصة', en: 'Platform Revenues' },
  linkToPayroll: { ar: 'ربط وتخصيص مع الرواتب', en: 'Link to Payroll' },
  autoPullDeductions: { ar: 'سحب الاستقطاعات الفعلية من النظام', en: 'Auto-Pull Deductions from System' },
  autoPulling: { ar: 'جارٍ استخراج العجز والمخالفات والسلف...', en: 'Pulling shortages, violations, and advances...' },
  autoPullSuccess: { ar: 'تم سحب الاستقطاعات بنجاح من قاعدة البيانات', en: 'Deductions successfully pulled from database' },
  payslip: { ar: 'قسيمة الراتب (Payslip)', en: 'Payslip' },
  officialPayslip: { ar: 'كشف راتب كابتن توصيل رسمي', en: 'Official Driver Payslip' },
  wpsBank: { ar: 'نظام حماية الأجور (WPS)', en: 'Wage Protection System (WPS)' },
  bankIban: { ar: 'رقم الآيبان البنكي (IBAN)', en: 'Bank IBAN' },
  bankName: { ar: 'اسم البنك', en: 'Bank Name' },
  driverAdvances: { ar: 'السلف المالية والأقساط', en: 'Financial Advances & Loans' },
  newAdvance: { ar: 'تسجيل سلفة مالية جديدة للكابتن', en: 'Issue Financial Advance' },
  editAdvance: { ar: 'تعديل بيانات السلفة المالية', en: 'Edit Financial Advance' },
  advanceNumber: { ar: 'رقم السلفة', en: 'Advance #' },
  loanAmount: { ar: 'مبلغ السلفة الإجمالي', en: 'Total Loan Amount' },
  repaidAmount: { ar: 'المبلغ المسدد', en: 'Repaid Amount' },
  remainingAmount: { ar: 'المبلغ المتبقي', en: 'Remaining Balance' },
  installmentsCount: { ar: 'عدد الأقساط الشهرية', en: 'Installments Count' },
  monthlyInstallment: { ar: 'القسط الشهري', en: 'Monthly Installment' },
  loanReason: { ar: 'سبب طلب السلفة', en: 'Reason for Advance' },
  activeAdvances: { ar: 'السلف النشطة', en: 'Active Advances' },

  // Document Archive & Previews
  documentArchive: { ar: 'الأرشيف والمستندات', en: 'Document Archive & Expiries' },
  addNewDocument: { ar: 'أرشفة وثيقة جديدة', en: 'Archive New Document' },
  docTitle: { ar: 'عنوان الوثيقة / المستند', en: 'Document Title' },
  docType: { ar: 'نوع الوثيقة', en: 'Document Type' },
  ownerType: { ar: 'الجهة التابعة', en: 'Owner Type' },
  ownerName: { ar: 'صاحب الوثيقة', en: 'Document Owner' },
  issueDate: { ar: 'تاريخ الإصدار', en: 'Issue Date' },
  expiryDate: { ar: 'تاريخ الانتهاء', en: 'Expiry Date' },
  expiringSoon: { ar: 'ينتهي قريباً', en: 'Expiring Soon' },
  expired: { ar: 'منتهي الصلاحية', en: 'Expired' },
  validDoc: { ar: 'ساري الصلاحية', en: 'Valid' },
  daysLeft: { ar: 'يوم متبقي', en: 'days left' },
  rotateDocument: { ar: 'تدوير', en: 'Rotate' },
  zoomIn: { ar: 'تكبير', en: 'Zoom In' },
  zoomOut: { ar: 'تصغير', en: 'Zoom Out' },
  downloadFile: { ar: 'تحميل الملف', en: 'Download File' },
  printDocument: { ar: 'طباعة المستند', en: 'Print Document' },

  // File Upload Zone
  dragDropOrBrowse: { ar: 'اسحب وأفلت الملف هنا أو انقر للتصفح', en: 'Drag and drop file here, or click to browse' },
  supportedFileFormats: { ar: 'يدعم JPG, PNG, WEBP, PDF بحد أقصى 15 ميجابايت', en: 'Supports JPG, PNG, WEBP, PDF up to 15MB' },
  autoOptimizedNotice: { ar: 'يتم ضغط ومعالجة الصور آلياً لتسريع التحميل والحفظ السحابي', en: 'Images are automatically compressed & optimized for cloud storage' },
  changeFile: { ar: 'تغيير الملف', en: 'Change File' },
  removeFile: { ar: 'إزالة الملف', en: 'Remove File' },

  // Direct Arabic Phrases mapping for universal fallback
  'حفظ': { ar: 'حفظ', en: 'Save' },
  'تعديل': { ar: 'تعديل', en: 'Edit' },
  'حذف': { ar: 'حذف', en: 'Delete' },
  'إلغاء': { ar: 'إلغاء', en: 'Cancel' },
  'تأكيد': { ar: 'تأكيد', en: 'Confirm' },
  'إغلاق': { ar: 'إغلاق', en: 'Close' },
  'معاينة': { ar: 'معاينة', en: 'Preview' },
  'تحميل': { ar: 'تحميل', en: 'Download' },
  'طباعة': { ar: 'طباعة', en: 'Print' },
  'بحث...': { ar: 'بحث...', en: 'Search...' },
  'الكل': { ar: 'الكل', en: 'All' },
  'نشط': { ar: 'نشط', en: 'Active' },
  'غير نشط': { ar: 'غير نشط', en: 'Inactive' },
  'موقوف': { ar: 'موقوف', en: 'Suspended' },
  'إجازة': { ar: 'إجازة', en: 'Vacation' },
  'مرضي': { ar: 'مرضي', en: 'Sick Leave' },
  'منتهي': { ar: 'منتهي', en: 'Terminated' },
  'معتمد': { ar: 'معتمد', en: 'Approved' },
  'قيد المراجعة': { ar: 'قيد المراجعة', en: 'In Review' },
  'مدفوع': { ar: 'مدفوع', en: 'Paid' },
  'غير مسدد': { ar: 'غير مسدد', en: 'Unpaid' },
  'مكتمل': { ar: 'مكتمل', en: 'Completed' },
  'متاح': { ar: 'متاح', en: 'Available' },
  'مسند': { ar: 'مسند', en: 'Assigned' },
  'بالخدمة': { ar: 'بالخدمة', en: 'In Operation' },
  'في الصيانة': { ar: 'في الصيانة', en: 'In Maintenance' },
  'رقم اللوحة': { ar: 'رقم اللوحة', en: 'Plate Number' },
  'الاسم': { ar: 'الاسم', en: 'Name' },
  'الاسم الكامل': { ar: 'الاسم الكامل', en: 'Full Name' },
  'الجوال': { ar: 'الجوال', en: 'Phone' },
  'رقم الإقامة': { ar: 'رقم الإقامة', en: 'Iqama Number' },
  'المركبة': { ar: 'المركبة', en: 'Vehicle' },
  'السائق': { ar: 'السائق', en: 'Driver' },
  'الكابتن': { ar: 'الكابتن', en: 'Driver' },
  'التاريخ': { ar: 'التاريخ', en: 'Date' },
  'الوقت': { ar: 'الوقت', en: 'Time' },
  'التكلفة': { ar: 'التكلفة', en: 'Cost' },
  'المبلغ': { ar: 'المبلغ', en: 'Amount' },
  'الراتب': { ar: 'الراتب', en: 'Salary' },
  'الصافي': { ar: 'الصافي', en: 'Net' },
  'الإجمالي': { ar: 'الإجمالي', en: 'Gross' },
  'الاستقطاعات': { ar: 'الاستقطاعات', en: 'Deductions' },
  'المستندات': { ar: 'المستندات', en: 'Documents' },
  'الصور والمستندات': { ar: 'الصور والمستندات', en: 'Photos & Documents' },
  'البيانات الأساسية': { ar: 'البيانات الأساسية', en: 'Basic Info' },
  'المخالفات': { ar: 'المخالفات', en: 'Violations' },
  'الحضور': { ar: 'الحضور', en: 'Attendance' },
  'المهام': { ar: 'المهام', en: 'Tasks' },
  'الوقود': { ar: 'الوقود', en: 'Fuel' },
  'العمليات': { ar: 'العمليات', en: 'Operations' },
  'التقارير': { ar: 'التقارير', en: 'Reports' },

  // Dashboard translations
  'لوحة القيادة التنفيذية': { ar: 'لوحة القيادة التنفيذية', en: 'Executive Dashboard' },
  'مرحباً بك في منظومة FleetOps لإدارة الأسطول': { ar: 'مرحباً بك في منظومة FleetOps لإدارة الأسطول', en: 'Welcome to FleetOps Fleet Management' },
  'متابعة شاملة وحية لكافة العمليات التشغيلية، الكباتن، أداء المركبات، تكاليف الوقود ومؤشرات الالتزام عبر المنصات.': {
    ar: 'متابعة شاملة وحية لكافة العمليات التشغيلية، الكباتن، أداء المركبات، تكاليف الوقود ومؤشرات الالتزام عبر المنصات.',
    en: 'Live operations tracking for couriers, vehicle performance, fuel costs, and platform SLAs.'
  },
  'إجمالي الكباتن': { ar: 'إجمالي الكباتن', en: 'Total Drivers' },
  'الكباتن النشطون': { ar: 'الكباتن النشطون', en: 'Active Drivers' },
  'إجمالي المركبات': { ar: 'إجمالي المركبات', en: 'Total Vehicles' },
  'تكلفة الوقود': { ar: 'تكلفة الوقود', en: 'Fuel Cost' },
  'إجمالي المصروفات': { ar: 'إجمالي المصروفات', en: 'Total Expenses' },
  'إجمالي المهام': { ar: 'إجمالي المهام', en: 'Total Tasks' },
  'وثائق تنتهي قريباً': { ar: 'وثائق تنتهي قريباً', en: 'Expiring Documents' },
  'تقارير بانتظار الاعتماد': { ar: 'تقارير بانتظار الاعتماد', en: 'Pending Reports' },
  'حوادث ومخالفات': { ar: 'حوادث ومخالفات', en: 'Accidents & Violations' },
  'توزيع حالة الأسطول': { ar: 'توزيع حالة الأسطول', en: 'Fleet Status Distribution' },
  'قيد التشغيل والتوصيل': { ar: 'قيد التشغيل والتوصيل', en: 'In Operation & Delivering' },
  'متاحة وجاهزة للإسناد': { ar: 'متاحة وجاهزة للإسناد', en: 'Available & Ready' },
  'في الورش والصيانة': { ar: 'في الورش والصيانة', en: 'In Workshops & Maintenance' },
  'عقود منصات التوصيل': { ar: 'عقود منصات التوصيل', en: 'Delivery Platform Contracts' },
  'مركز التحكم والتشغيل الميداني': { ar: 'مركز التحكم والتشغيل الميداني', en: 'Operations Control Center' },
  'غرفة عمليات تشغيل الأسطول': { ar: 'غرفة عمليات تشغيل الأسطول', en: 'Fleet Operations Control Room' },
  'مركبات في الخدمة': { ar: 'مركبات في الخدمة', en: 'Vehicles in Service' },
  'حضور الكباتن اليوم': { ar: 'حضور الكباتن اليوم', en: 'Drivers Present Today' },
  'مهام جارية ومفتوحة': { ar: 'مهام جارية ومفتوحة', en: 'Ongoing Tasks' },
  'أوامر صيانة نشطة': { ar: 'أوامر صيانة نشطة', en: 'Active Maintenance Orders' },
  'الإشراف الميداني اليومي': { ar: 'الإشراف الميداني اليومي', en: 'Daily Field Supervision' },
  'لوحة المشرف الميداني': { ar: 'لوحة المشرف الميداني', en: 'Supervisor Field Dashboard' },
  'كباتن حاضرون': { ar: 'كباتن حاضرون', en: 'Present Couriers' },
  'متأخرون عن الوردية': { ar: 'متأخرون عن الوردية', en: 'Late for Shift' },
  'غياب غير مبرر': { ar: 'غياب غير مبرر', en: 'Unexcused Absence' },
  'المهام المسندة': { ar: 'المهام المسندة', en: 'Assigned Tasks' },
  'رفع تقرير ميداني': { ar: 'رفع تقرير ميداني', en: 'Submit Field Report' },
  'إسناد مهمة تشغيلية': { ar: 'إسناد مهمة تشغيلية', en: 'Assign Operations Task' },
  'تسجيل حضور فوري': { ar: 'تسجيل حضور فوري', en: 'Quick Attendance' },

  // Cash Settlements & Payroll Extra terms
  'إدارة تصفية وتحصيل كاش المناديب': { ar: 'إدارة تصفية وتحصيل كاش المناديب', en: 'Couriers Cash Clearance & Settlements' },
  'مشتركة لكافة الأدوار': { ar: 'مشتركة لكافة الأدوار', en: 'Shared Across All Roles' },
  'تسجيل تصفية كاش جديدة': { ar: 'تسجيل تصفية كاش جديدة', en: 'Record Cash Settlement' },
  'الكاش المصفى والمودع': { ar: 'الكاش المصفى والمودع', en: 'Cleared & Deposited Cash' },
  'عُهد الكاش المعلقة': { ar: 'عُهد الكاش المعلقة', en: 'Pending Cash Settlements' },
  'إجمالي عجز الكاش غير المسدد': { ar: 'إجمالي عجز الكاش غير المسدد', en: 'Total Cash Deficit / Shortage' },
  'نسبة مطابقة كاش المنصات': { ar: 'نسبة مطابقة كاش المنصات', en: 'Cash Reconciliation Rate' },
  'سجل تسويات الكاش': { ar: 'سجل تسويات الكاش', en: 'Settlements Ledger' },
  'أرصدة عُهد الكباتن': { ar: 'أرصدة عُهد الكباتن', en: 'Courier Balances' },
  'مطابقة منصات التوصيل': { ar: 'مطابقة منصات التوصيل', en: 'Platform Reconciliation' },
  'رقم السند والتاريخ': { ar: 'رقم السند والتاريخ', en: 'Voucher # & Date' },
  'الكابتن المسلّم': { ar: 'الكابتن المسلّم', en: 'Delivering Driver' },
  'المنصة والوردية': { ar: 'المنصة والوردية', en: 'Platform & Shift' },
  'مبلغ المنصة (المطلوب)': { ar: 'مبلغ المنصة (المطلوب)', en: 'Expected Amount' },
  'المبلغ المستلم فعلياً': { ar: 'المبلغ المستلم فعلياً', en: 'Collected Amount' },
  'المطابقة / الفارق': { ar: 'المطابقة / الفارق', en: 'Reconciliation / Diff' },
  'طريقة التوريد': { ar: 'طريقة التوريد', en: 'Payment Method' },
  'حالة التصفية': { ar: 'حالة التصفية', en: 'Clearance Status' },
  'معتمد ومصفى': { ar: 'معتمد ومصفى', en: 'Approved & Cleared' },
  'بانتظار الاعتماد': { ar: 'بانتظار الاعتماد', en: 'Pending Approval' },
  'عجز قيد النزاع': { ar: 'عجز قيد النزاع', en: 'Disputed Deficit' },
  'كاش مباشر': { ar: 'كاش مباشر', en: 'Cash Handover' },
  'تحويل بنكي': { ar: 'تحويل بنكي', en: 'Bank Transfer' },
  'شبكة مدى': { ar: 'شبكة مدى', en: 'Mada POS' },
  'محفظة STC Pay': { ar: 'محفظة STC Pay', en: 'STC Pay' },
  'خصم راتب': { ar: 'خصم راتب', en: 'Salary Deduction' },
  'مطابق 0.00': { ar: 'مطابق 0.00', en: 'Matched 0.00' },
  'معاينة وطباعة سند التصفية': { ar: 'معاينة وطباعة سند التصفية', en: 'View & Print Voucher' },
  'اعتماد التصفية': { ar: 'اعتماد التصفية', en: 'Approve Settlement' },
  'حذف السند': { ar: 'حذف السند', en: 'Delete Voucher' },
  'حذف المسير': { ar: 'حذف المسير', en: 'Delete Payroll' },
  'تعديل المسير': { ar: 'تعديل المسير', en: 'Edit Payroll' },
  'معاينة وطباعة مسير الراتب': { ar: 'معاينة وطباعة مسير الراتب', en: 'View & Print Payslip' },
  'تأكيد الصرف والتحويل البنكي': { ar: 'تأكيد الصرف والتحويل البنكي', en: 'Confirm Payment & Transfer' },
  'إنشاء مسير الشهر آلياً لكافة المناديب': { ar: 'إنشاء مسير الشهر آلياً لكافة المناديب', en: 'Auto-Generate All Drivers Payroll' },
  'إعداد مسير فردي': { ar: 'إعداد مسير فردي', en: 'Calculate Driver Payroll' },
  'صافي رواتب الشهر': { ar: 'صافي رواتب الشهر', en: 'Total Net Month Payroll' },
  'الاستقطاعات المنفذة': { ar: 'الاستقطاعات المنفذة', en: 'Total Deductions Executed' },
  'مسيرات جاهزة للصرف': { ar: 'مسيرات جاهزة للصرف', en: 'Approved for Payment' },
  'رصيد السلف المالية القائمة': { ar: 'رصيد السلف المالية القائمة', en: 'Active Advances Balance' },
  'مسير الرواتب الشهري': { ar: 'مسير الرواتب الشهري', en: 'Monthly Payroll' },
  'إدارة السلف المالية': { ar: 'إدارة السلف المالية', en: 'Financial Advances' },
  'تقرير الربط المالي والاستقطاعات': { ar: 'تقرير الربط المالي والاستقطاعات', en: 'Interconnection & Audit' },
  'شهر المسير:': { ar: 'شهر المسير:', en: 'Payroll Month:' },
  'شهر المسير': { ar: 'شهر المسير', en: 'Payroll Month' },
  'الحالة:': { ar: 'الحالة:', en: 'Status:' },
  'جميع الحالات': { ar: 'جميع الحالات', en: 'All Statuses' },
  'تم الصرف والتحويل': { ar: 'تم الصرف والتحويل', en: 'Paid & Transferred' },
  'معتمد للصرف': { ar: 'معتمد للصرف', en: 'Approved for Pay' },
  'تم التدقيق': { ar: 'تم التدقيق', en: 'Audited & Reviewed' },
  'الأساسي والبدلات': { ar: 'الأساسي والبدلات', en: 'Basic & Allowances' },
  'عمولة الطلبات': { ar: 'عمولة الطلبات', en: 'Delivery Commission' },
  'إجمالي الاستحقاق': { ar: 'إجمالي الاستحقاق', en: 'Gross Earnings' },
  'الاستقطاعات المترابطة': { ar: 'الاستقطاعات المترابطة', en: 'Connected Deductions' },
  'صافي الراتب المستحق': { ar: 'صافي الراتب المستحق', en: 'Net Salary Due' },
  'سجل السلف والقروض المالية للمناديب': { ar: 'سجل السلف والقروض المالية للمناديب', en: 'Couriers Financial Advances & Loans Ledger' },
  'صرف سلفة مالية جديدة': { ar: 'صرف سلفة مالية جديدة', en: 'Issue New Advance' },
  'لا توجد سلف مالية مسجلة حالياً': { ar: 'لا توجد سلف مالية مسجلة حالياً', en: 'No financial advances recorded' },
  'مبلغ السلفة': { ar: 'مبلغ السلفة', en: 'Advance Amount' },
  'المسدد حتى الآن': { ar: 'المسدد حتى الآن', en: 'Repaid So Far' },
  'المتبقي': { ar: 'المتبقي', en: 'Remaining' },
  'تاريخ الصرف:': { ar: 'تاريخ الصرف:', en: 'Disbursement Date:' },
  'تاريخ الصرف': { ar: 'تاريخ الصرف', en: 'Disbursement Date' },
  'حذف السلفة': { ar: 'حذف السلفة', en: 'Delete Advance' },
  'عجز تصفية الكاش المسترد': { ar: 'عجز تصفية الكاش المسترد', en: 'Recovered Cash Deficit' },
  'مخالفات مرورية مخصومة': { ar: 'مخالفات مرورية مخصومة', en: 'Deducted Traffic Fines' },
  'أقساط سلف مستردة': { ar: 'أقساط سلف مستردة', en: 'Recovered Advance Installments' },
  'تجاوز وقود مسترد': { ar: 'تجاوز وقود مسترد', en: 'Recovered Fuel Overages' },
  'الملف الشامل': { ar: 'الملف الشامل', en: 'Full Profile' },
  'تعديل البيانات': { ar: 'تعديل البيانات', en: 'Edit Details' },
  'إضافة كابتن جديد': { ar: 'إضافة كابتن جديد', en: 'Add New Driver' },
  'تأكيد حذف الكابتن': { ar: 'تأكيد حذف الكابتن', en: 'Confirm Driver Deletion' },
  'المركبة المسندة': { ar: 'المركبة المسندة', en: 'Assigned Vehicle' },
  'المالية والرواتب': { ar: 'المالية والرواتب', en: 'Financials & Payroll' },
  'المالية والرواتب والكاش': { ar: 'المالية والرواتب والكاش', en: 'Financials, Payroll & Cash' },
  'تصدير التقارير': { ar: 'تصدير التقارير', en: 'Export Data' },
  'تصدير التقارير والبيانات': { ar: 'تصدير التقارير والبيانات', en: 'Export Data & Reports' },
  'خيارات التصدير الرسمية': { ar: 'خيارات التصدير الرسمية', en: 'Enterprise Export Options' },
  'إكسيل معتمد (Excel .xls)': { ar: 'إكسيل معتمد (Excel .xls)', en: 'Executive Excel (.xls)' },
  'وثيقة PDF رسمية (Print / PDF)': { ar: 'وثيقة PDF رسمية (Print / PDF)', en: 'Official PDF Document' },
  'جدول بيانات (CSV .csv)': { ar: 'جدول بيانات (CSV .csv)', en: 'Standard CSV Data' },
  'سجل': { ar: 'سجل', en: 'records' },
  'طلب': { ar: 'طلب', en: 'orders' },
  'مركبة': { ar: 'مركبة', en: 'vehicles' },
  'يوم': { ar: 'يوم', en: 'days' },
  'السابق': { ar: 'السابق', en: 'Previous' },
  'التالي': { ar: 'التالي', en: 'Next' },
};

interface LanguageContextType {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  t: (key: string | number) => string;
  tx: (ar: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLanguage = safeLocalStorageGetItem('fleetops_lang');
    return storedLanguage === 'en' || storedLanguage === 'ar' ? storedLanguage : 'ar';
  });

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    safeLocalStorageSetItem('fleetops_lang', language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const tx = (arText: string, enText: string): string => {
    return language === 'ar' ? arText : enText;
  };

  const t = (key: string | number): string => {
    if (key === null || key === undefined) return '';
    const raw = String(key);
    const k = raw.trim();

    // 1. Direct key match
    if (translations[k]) {
      return translations[k][language];
    }

    // 2. Trailing colon or punctuation match
    const cleanKey = k.replace(/[:：]$/, '').trim();
    if (translations[cleanKey]) {
      const translated = translations[cleanKey][language];
      return k.endsWith(':') ? `${translated}:` : translated;
    }

    // If English mode, attempt smart pattern mappings
    if (language === 'en') {
      // e.g. "X سجل" -> "X records"
      const recordMatch = k.match(/^(\d+)\s*سجل$/);
      if (recordMatch) return `${recordMatch[1]} records`;

      // e.g. "X طلب" -> "X orders"
      const orderMatch = k.match(/^(\d+)\s*طلب$/);
      if (orderMatch) return `${orderMatch[1]} orders`;

      // e.g. "X يوم" -> "X days"
      const dayMatch = k.match(/^(\d+)\s*يوم(\s*متبقي)?$/);
      if (dayMatch) return `${dayMatch[1]} days left`;

      // e.g. "X مركبة" -> "X vehicles"
      const vehMatch = k.match(/^(\d+)\s*مركبة$/);
      if (vehMatch) return `${vehMatch[1]} vehicles`;

      // e.g. "X كابتن" -> "X drivers"
      const drvMatch = k.match(/^(\d+)\s*كابتن$/);
      if (drvMatch) return `${drvMatch[1]} drivers`;

      // Replace "ر.س" with "SAR"
      if (k.includes('ر.س')) {
        return k.replace(/ر\.س/g, 'SAR');
      }
    }

    return k;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t, tx }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
