import React, { useState, useEffect, useMemo } from 'react';
import {
  Fuel,
  PlusCircle,
  AlertTriangle,
  FileText,
  Trash2,
  TrendingUp,
  Truck,
  CheckCircle2,
  Cpu,
  CreditCard,
  Edit2,
  ShieldCheck,
  Ban,
  Activity,
  Layers,
  Calendar,
  Clock,
  Sun,
  Moon,
  Search,
  Filter,
  User,
  Download,
  Wallet,
  Gauge,
  Sparkles,
  Settings,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { FuelFormModal } from './FuelFormModal';
import { FuelChipModal } from './FuelChipModal';
import { FuelContractModal } from './FuelContractModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import {
  FuelRecord,
  FuelChip,
  FuelChipSystem,
  Vehicle,
  Driver,
  VehicleShift,
  VehicleShiftType,
} from '../../types';
import {
  subscribeToCollection,
  createDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  updateDocument,
  fetchCollection,
} from '../../services/dataService';
import { loadCompanySettings, CompanyProfileSettings } from '../../services/settingsService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { exportToEnterpriseExcel } from '../../utils/excelExport';

export const FuelManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, language } = useLanguage();
  const [companySettings, setCompanySettings] = useState<CompanyProfileSettings>(loadCompanySettings());

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'dispenses' | 'today_monitor' | 'cards' | 'contracts'>('dispenses');

  // D1 data collections
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [fuelChips, setFuelChips] = useState<FuelChip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isChipModalOpen, setIsChipModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingChip, setEditingChip] = useState<FuelChip | null>(null);
  const [preselectedDriverId, setPreselectedDriverId] = useState<string | undefined>(undefined);

  const [recordToDelete, setRecordToDelete] = useState<FuelRecord | null>(null);
  const [chipToDelete, setChipToDelete] = useState<FuelChip | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [todayStatusFilter, setTodayStatusFilter] = useState<'all' | 'claimed' | 'pending'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const unsubRecords = subscribeToCollection<FuelRecord>('fuel_records', setFuelRecords);
    const unsubChips = subscribeToCollection<FuelChip>('fuel_chips', setFuelChips);
    const unsubShifts = subscribeToCollection<VehicleShift>('vehicle_shifts', setShifts);

    async function loadMeta() {
      const [v, d] = await Promise.all([
        fetchCollection<Vehicle>('vehicles'),
        fetchCollection<Driver>('drivers'),
      ]);
      setVehicles(v);
      setDrivers(d);
    }
    loadMeta();

    return () => {
      unsubRecords();
      unsubChips();
      unsubShifts();
    };
  }, []);

  // Save new refuel / quota dispense record
  const handleCreateFuelRecord = async (data: Partial<FuelRecord>) => {
    const id = await createDocument<Omit<FuelRecord, 'id'>>('fuel_records', data as any);

    // Update vehicle odometer if higher
    if (data.vehicleId && data.odometer) {
      const v = vehicles.find((item) => item.id === data.vehicleId);
      if (v && data.odometer > v.currentOdometer) {
        await updateDocument<Vehicle>('vehicles', v.id, { currentOdometer: data.odometer });
      }
    }

    // Update associated driver fuel card currentMonthSpent
    if (data.driverId && data.totalCost) {
      const matchedCard = fuelChips.find((c) => c.driverId === data.driverId);
      if (matchedCard) {
        const newSpent = (matchedCard.currentMonthSpent || 0) + data.totalCost;
        const newStatus =
          newSpent >= matchedCard.monthlyQuota ? 'limit_reached' : matchedCard.status;
        await updateDocument<FuelChip>('fuel_chips', matchedCard.id, {
          currentMonthSpent: Number(newSpent.toFixed(2)),
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await logAuditAction(
      currentUser,
      'LOG_FUEL',
      'fuel_records',
      id,
      `تسجيل صرف حصة وقود للمندوب بمبلغ ${data.totalCost} ر.س عبر نظام (${data.chipSystem || 'شريحة'})`
    );
  };

  // Create / Update Driver Fuel Card
  const handleSaveFuelChip = async (chipData: Partial<FuelChip>) => {
    if (editingChip) {
      await updateDocument<FuelChip>('fuel_chips', editingChip.id, {
        ...chipData,
        updatedAt: new Date().toISOString(),
      });
      await logAuditAction(
        currentUser,
        'UPDATE_FUEL_CHIP',
        'fuel_chips',
        editingChip.id,
        `تعديل بيانات بطاقة الوقود للمندوب: ${chipData.chipNumber} (${chipData.system})`
      );
    } else {
      const newId = `chip-${Date.now()}`;
      await createDocument<FuelChip>('fuel_chips', {
        ...chipData,
        currentMonthSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      await logAuditAction(
        currentUser,
        'ISSUE_FUEL_CHIP',
        'fuel_chips',
        newId,
        `إصدار وتسليم بطاقة وقود جديدة للمندوب: ${chipData.chipNumber} (${chipData.system})`
      );
    }
    setEditingChip(null);
  };

  const handleToggleChipStatus = async (chip: FuelChip) => {
    const nextStatus = chip.status === 'active' ? 'suspended' : 'active';
    await updateDocument<FuelChip>('fuel_chips', chip.id, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    await logAuditAction(
      currentUser,
      'TOGGLE_CHIP_STATUS',
      'fuel_chips',
      chip.id,
      `تغيير حالة بطاقة الوقود ${chip.chipNumber} إلى (${nextStatus})`
    );
  };

  const handleDeleteRecord = async (reason: string) => {
    if (!recordToDelete || !currentUser) return;
    const driverName = getDriverName(recordToDelete.driverId);
    await softDeleteDocumentWithPassword(
      'fuel_records',
      recordToDelete.id,
      `سجل صرف وقود: للمندوب ${driverName} بمبلغ ${recordToDelete.totalCost} ر.س (${recordToDelete.liters || 0} لتر)`,
      recordToDelete,
      currentUser,
      reason,
      `تاريخ: ${recordToDelete.date} • المحطة: ${recordToDelete.gasStation || '-'} • النظام: ${recordToDelete.chipSystem}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_FUEL_RECORD',
      'fuel_records',
      recordToDelete.id,
      `حذف سجل وقود للمندوب ${driverName} بمبلغ ${recordToDelete.totalCost} ر.س (${reason})`
    );
    setRecordToDelete(null);
  };

  const handleDeleteChip = async (reason: string) => {
    if (!chipToDelete || !currentUser) return;
    const driverName = getDriverName(chipToDelete.driverId);
    await softDeleteDocumentWithPassword(
      'fuel_chips',
      chipToDelete.id,
      `بطاقة وقود: ${chipToDelete.chipNumber} (${chipToDelete.system}) - المندوب: ${driverName}`,
      chipToDelete,
      currentUser,
      reason,
      `النظام: ${chipToDelete.system} • الحصة اليومية: ${chipToDelete.dailyQuota} ر.س`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_FUEL_CHIP',
      'fuel_chips',
      chipToDelete.id,
      `حذف بطاقة وقود للمندوب ${driverName} (${chipToDelete.chipNumber})`
    );
    setChipToDelete(null);
  };

  // Helper getters
  const getVehiclePlate = (vId?: string) => {
    if (!vId) return 'غير محدد';
    const v = vehicles.find((item) => item.id === vId);
    return v ? `${v.make} (${v.plateNumber})` : vId;
  };

  const getDriverName = (dId?: string) => {
    if (!dId) return 'غير محدد';
    const d = drivers.find((item) => item.id === dId);
    return d ? d.fullName : dId;
  };

  const getChipSystemBadge = (sys?: FuelChipSystem) => {
    switch (sys) {
      case 'fleet_plus':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            فلييت بلس (Fleet Plus)
          </span>
        );
      case 'waee':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            واعي (Waee RFID)
          </span>
        );
      case 'sasco':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            ساسكو أسطول (SASCO)
          </span>
        );
      case 'aldrees':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            الدريس الذكية (Aldrees)
          </span>
        );
      case 'petromin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            بترومين أسطول (Petromin)
          </span>
        );
      case 'naft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            شريحة نفط (Naft)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            نقدي / مزود آخر
          </span>
        );
    }
  };

  const getShiftBadge = (shiftType?: VehicleShiftType | string) => {
    if (shiftType === 'night_shift') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Moon className="w-3 h-3 text-indigo-600" />
          <span>المسائية (11س)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Sun className="w-3 h-3 text-amber-600" />
        <span>الصباحية (11س)</span>
      </span>
    );
  };

  const getChipStatusBadge = (status: FuelChip['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            مفعلة وتعمل
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            موقوفة مؤقتاً
          </span>
        );
      case 'limit_reached':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            تجاوزت الحد الشهري
          </span>
        );
      case 'replacement_needed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            تحتاج استبدال
          </span>
        );
    }
  };

  // Calculations for KPIs
  const totalCost = fuelRecords.reduce((acc, f) => acc + (f.totalCost || 0), 0);
  const totalLiters = fuelRecords.reduce((acc, f) => acc + (f.liters || 0), 0);

  // Today's stats
  const todayDispenses = fuelRecords.filter((f) => (f.date || '').startsWith(todayStr));
  const todayDispensedDrivers = new Set(todayDispenses.map((f) => f.driverId));
  const todaySpentTotal = todayDispenses.reduce((acc, f) => acc + (f.totalCost || 0), 0);

  const totalRegisteredCards = fuelChips.length;
  const activeCardsCount = fuelChips.filter((c) => c.status === 'active').length;

  const totalMonthlyBudget = fuelChips.reduce((acc, c) => acc + (c.monthlyQuota || 0), 0);
  const totalMonthlySpent = fuelChips.reduce((acc, c) => acc + (c.currentMonthSpent || 0), 0);
  const budgetUtilization = totalMonthlyBudget > 0 ? Math.round((totalMonthlySpent / totalMonthlyBudget) * 100) : 0;

  // Breakdown by system
  const fleetPlusSpent = fuelRecords
    .filter((f) => f.chipSystem === 'fleet_plus')
    .reduce((acc, f) => acc + (f.totalCost || 0), 0);

  const waeeSpent = fuelRecords
    .filter((f) => f.chipSystem === 'waee')
    .reduce((acc, f) => acc + (f.totalCost || 0), 0);

  const sascoSpent = fuelRecords
    .filter((f) => f.chipSystem === 'sasco')
    .reduce((acc, f) => acc + (f.totalCost || 0), 0);

  // Filtered Fuel Records
  const filteredRecords = useMemo(() => {
    return fuelRecords.filter((rec) => {
      const dName = getDriverName(rec.driverId).toLowerCase();
      const vPlate = getVehiclePlate(rec.vehicleId).toLowerCase();
      const station = (rec.gasStation || '').toLowerCase();
      const chip = (rec.chipNumber || '').toLowerCase();
      const s = searchTerm.toLowerCase();

      const matchesSearch =
        !s || dName.includes(s) || vPlate.includes(s) || station.includes(s) || chip.includes(s);

      const matchesSystem =
        selectedSystemFilter === 'all' || rec.chipSystem === selectedSystemFilter;

      const matchesShift =
        selectedShiftFilter === 'all' || rec.shiftType === selectedShiftFilter;

      return matchesSearch && matchesSystem && matchesShift;
    });
  }, [fuelRecords, searchTerm, selectedSystemFilter, selectedShiftFilter, drivers, vehicles]);

  // Today's Quota Monitor Items (Drivers on duty and their cards)
  const todayMonitorItems = useMemo(() => {
    // Collect all active drivers who have assigned vehicles or cards
    return drivers
      .filter((d) => d.status === 'active')
      .map((driver) => {
        const card = fuelChips.find((c) => c.driverId === driver.id);
        const vehicle =
          vehicles.find(
            (v) =>
              v.id === card?.vehicleId ||
              v.id === driver.assignedVehicleId ||
              v.currentDriverId === driver.id ||
              v.dayDriverId === driver.id ||
              v.nightDriverId === driver.id
          ) || null;

        const isNightShift = vehicle?.nightDriverId === driver.id || card?.shiftType === 'night_shift';
        const shiftType: VehicleShiftType = isNightShift ? 'night_shift' : 'day_shift';

        const todayFuel = todayDispenses.filter((f) => f.driverId === driver.id);
        const hasClaimedToday = todayFuel.length > 0;
        const todaySpent = todayFuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);
        const dailyQuota = card?.dailyQuota || 40;

        let status: 'claimed' | 'pending' | 'exceeded' = 'pending';
        if (hasClaimedToday) {
          status = todaySpent > dailyQuota ? 'exceeded' : 'claimed';
        }

        return {
          driver,
          card,
          vehicle,
          shiftType,
          hasClaimedToday,
          todaySpent,
          dailyQuota,
          status,
          todayFuelRecord: todayFuel[0] || null,
        };
      })
      .filter((item) => {
        if (todayStatusFilter === 'claimed') return item.hasClaimedToday;
        if (todayStatusFilter === 'pending') return !item.hasClaimedToday;
        return true;
      });
  }, [drivers, fuelChips, vehicles, todayDispenses, todayStatusFilter]);

  // Quick Open Refuel Modal for a specific driver
  const handleQuickRefuel = (driverId: string) => {
    setPreselectedDriverId(driverId);
    setIsRecordModalOpen(true);
  };

  // Quick Issue Card for a driver
  const handleQuickIssueCard = (driverId: string) => {
    setPreselectedDriverId(driverId);
    setEditingChip(null);
    setIsChipModalOpen(true);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    await exportToEnterpriseExcel({
      filename: `تقرير_صرف_حصص_الوقود_${todayStr}`,
      title: 'تقرير سجلات تعبئة وصرف حصص الوقود للأسطول والمناديب',
      subtitle: `تاريخ التصدير: ${todayStr} • منصة التعاقد: ${companySettings.fuelContractPlatformName || 'فلييت بلس/واعي'}`,
      columns: [
        { header: 'التاريخ والوقت', accessor: 'date' },
        { header: 'اسم المندوب', getValue: (f) => getDriverName(f.driverId) },
        { header: 'المركبة واللوحة', getValue: (f) => getVehiclePlate(f.vehicleId) },
        {
          header: 'الوردية (11 ساعة)',
          getValue: (f) => (f.shiftType === 'night_shift' ? 'مسائية (11س)' : 'صباحية (11س)'),
        },
        { header: 'نظام الشريحة', getValue: (f) => f.chipSystem || 'فلييت بلس' },
        { header: 'رقم البطاقة', accessor: 'chipNumber' },
        { header: 'الحصة اليومية (ر.س)', getValue: (f) => f.dailyQuotaAllowed || '-' },
        { header: 'المبلغ المصروف (ر.س)', accessor: 'totalCost' },
        { header: 'الكمية (لتر)', accessor: 'liters' },
        { header: 'سعر اللتر', accessor: 'pricePerLiter' },
        { header: 'محطة الوقود', accessor: 'gasStation' },
        { header: 'قراءة العداد (كم)', accessor: 'odometer' },
        { header: 'رقم الإيصال', accessor: 'invoiceNumber' },
        { header: 'المسؤول المسجل', accessor: 'createdByName' },
      ],
      data: filteredRecords,
      user: currentUser,
      totalSummary: {
        'إجمالي المنصرف (ر.س)': `${totalCost.toLocaleString()} ر.س`,
        'إجمالي اللترات': `${totalLiters.toLocaleString()} لتر`,
        'عدد العمليات': `${filteredRecords.length} عملية`,
      },
    });
  };

  // Columns for Dispensing Log
  const recordColumns: Column<FuelRecord>[] = [
    {
      header: 'التاريخ والوقت',
      accessor: 'date',
      sortable: true,
      render: (f) => (
        <div>
          <span className="font-mono text-xs text-slate-900 font-bold block">{f.date}</span>
          {f.invoiceNumber && (
            <span className="text-[10px] text-slate-400 font-mono">#{f.invoiceNumber}</span>
          )}
        </div>
      ),
    },
    {
      header: 'المندوب المستلم للحصة',
      accessor: 'driverId',
      sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs">{getDriverName(f.driverId)}</span>
            <span className="text-[10px] text-slate-400 font-mono">ID: {f.driverId}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'المركبة والوردية',
      accessor: 'vehicleId',
      render: (f) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block text-xs">{getVehiclePlate(f.vehicleId)}</span>
          <div className="flex items-center gap-1">{getShiftBadge(f.shiftType)}</div>
        </div>
      ),
    },
    {
      header: 'نظام ورقم الشريحة',
      accessor: 'chipSystem',
      sortable: true,
      render: (f) => (
        <div className="space-y-1">
          <div>{getChipSystemBadge(f.chipSystem)}</div>
          {f.chipNumber && (
            <span className="font-mono text-[10px] text-slate-600 block bg-slate-100 px-1.5 py-0.5 rounded w-fit">
              {f.chipNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'الحصة والمصروف',
      accessor: 'totalCost',
      sortable: true,
      render: (f) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-emerald-700 font-mono text-sm">
              {f.totalCost.toLocaleString()} ر.س
            </span>
            {f.quotaStatus === 'quota_exceeded' ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                ⚠️ تجاوز
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                مستوفى
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            {f.liters} لتر ({f.fuelType || 'بنزين 91'})
          </span>
        </div>
      ),
    },
    {
      header: 'المحطة وقراءة العداد',
      accessor: 'gasStation',
      render: (f) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{f.gasStation}</span>
          <span className="text-[10px] text-slate-500 font-mono">
            عداد: {(f.odometer || 0).toLocaleString()} كم
          </span>
        </div>
      ),
    },
    {
      header: 'المسؤول المالي',
      accessor: 'createdByName',
      render: (f) => (
        <FinancialOperatorBadge
          name={f.createdByName}
          role={f.createdByRole}
          actionTitle="مسجل الصرف"
          verificationCode={f.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setRecordToDelete(f)}
              title="حذف السجل"
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Columns for Driver Fuel Cards
  const cardColumns: Column<FuelChip>[] = [
    {
      header: 'المندوب المسلمة له البطاقة',
      accessor: 'driverId',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs">{getDriverName(c.driverId)}</span>
            <span className="text-[10px] text-slate-400 font-mono">المعرف: {c.driverId}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'نظام ومزود الشريحة',
      accessor: 'system',
      sortable: true,
      render: (c) => (
        <div className="space-y-1">
          <div>{getChipSystemBadge(c.system)}</div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {c.chipNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'المركبة والوردية (11س)',
      accessor: 'vehicleId',
      render: (c) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block text-xs">{getVehiclePlate(c.vehicleId)}</span>
          <div>{getShiftBadge(c.shiftType)}</div>
        </div>
      ),
    },
    {
      header: 'الحصة اليومية والشهرية',
      accessor: 'dailyQuota',
      sortable: true,
      render: (c) => (
        <div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-emerald-800 text-xs font-mono">
              {c.dailyQuota || 40} ر.س / يوم
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            المبلغ الشهري: {(c.monthlyQuota || 1200).toLocaleString()} ر.س
          </span>
        </div>
      ),
    },
    {
      header: 'المستهلك والرصيد الشهري',
      accessor: 'currentMonthSpent',
      sortable: true,
      render: (c) => {
        const spent = c.currentMonthSpent || 0;
        const quota = c.monthlyQuota || 1200;
        const pct = Math.min(100, Math.round((spent / quota) * 100));
        const remaining = Math.max(0, quota - spent);
        const isNearLimit = pct >= 85;

        return (
          <div className="w-36 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className={isNearLimit ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                {spent.toLocaleString()} ر.س
              </span>
              <span className="text-slate-400 text-[10px]">متبقي {remaining} ر.س</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 95 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'حالة البطاقة',
      accessor: 'status',
      sortable: true,
      render: (c) => getChipStatusBadge(c.status),
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleQuickRefuel(c.driverId)}
            title="تسجيل صرف حصة للمندوب"
            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
          >
            <Fuel className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleChipStatus(c)}
            title={c.status === 'active' ? 'تجميد البطاقة مؤقتاً' : 'تفعيل البطاقة'}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              c.status === 'active'
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {c.status === 'active' ? <Ban className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setEditingChip(c);
              setIsChipModalOpen(true);
            }}
            title="تعديل بيانات البطاقة"
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setChipToDelete(c)}
              title="إلغاء وحذف البطاقة"
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  إدارة وقود المناديب والشرائح الذكية
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  نظام المناديب والورديات
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط كل مندوب ببطاقة وقود مخصصة (واعي، فلييت بلس، ساسكو) مع تتبع الحصة اليومية والمبلغ الشهري وورديته (11 ساعة)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>تصدير إكسيل (Excel)</span>
          </button>

          <button
            onClick={() => setIsContractModalOpen(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-amber-200"
          >
            <Settings className="w-4 h-4 text-amber-600" />
            <span>عقد المنصة الموحدة</span>
          </button>

          <button
            onClick={() => {
              setEditingChip(null);
              setPreselectedDriverId(undefined);
              setIsChipModalOpen(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إصدار بطاقة لمندوب</span>
          </button>

          <button
            onClick={() => {
              setPreselectedDriverId(undefined);
              setIsRecordModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Fuel className="w-4 h-4" />
            <span>تسجيل صرف حصة وقود</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="مناديب ببطاقات وقود"
          value={`${activeCardsCount} / ${totalRegisteredCards}`}
          subtitle={`${Math.max(0, drivers.length - totalRegisteredCards)} مندوب بانتظار بطاقة`}
          icon={CreditCard}
          colorScheme="blue"
          trend={{ value: `${Math.round((activeCardsCount / (totalRegisteredCards || 1)) * 100)}% مفعلة`, isPositive: true }}
        />

        <StatCard
          title="حصص اليوم المستلمة"
          value={`${todayDispensedDrivers.size} مندوب`}
          subtitle={`المصروف اليوم: ${todaySpentTotal.toLocaleString()} ر.س`}
          icon={CheckCircle2}
          colorScheme="emerald"
          trend={{ value: `${todayDispenses.length} عملية تعبئة`, isPositive: true }}
        />

        <StatCard
          title="استهلاك الميزانية الشهرية"
          value={`${budgetUtilization}%`}
          subtitle={`${totalMonthlySpent.toLocaleString()} من ${totalMonthlyBudget.toLocaleString()} ر.س`}
          icon={Wallet}
          colorScheme="indigo"
          trend={{
            value: budgetUtilization > 90 ? 'تجاوز وشيك' : 'ضمن الحد',
            isPositive: budgetUtilization <= 90,
          }}
        />

        <StatCard
          title="إجمالي منصرف الوقود"
          value={`${totalCost.toLocaleString()} ر.س`}
          subtitle={`${totalLiters.toLocaleString()} لتر كلي`}
          icon={TrendingUp}
          colorScheme="amber"
        />

        <StatCard
          title="منصة فلييت بلس وواعي"
          value={`${fleetPlusSpent.toLocaleString()} ر.س`}
          subtitle={`واعي: ${waeeSpent.toLocaleString()} • ساسكو: ${sascoSpent.toLocaleString()}`}
          icon={Cpu}
          colorScheme="purple"
        />
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dispenses')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'dispenses'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>سجل تعبئة وصرف الحصص</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {fuelRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('today_monitor')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'today_monitor'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>كشف متابعة حصص اليوم الحية</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
            {todayDispensedDrivers.size} استلموا
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'cards'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>بطاقات وشرائح الوقود للمناديب</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {fuelChips.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'contracts'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>عقود وأنظمة الوقود</span>
        </button>
      </div>

      {/* TAB 1: Sijill Ta'bi'ah (Refueling Log) */}
      {activeTab === 'dispenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم المندوب، رقم اللوحة، الشريحة، المحطة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              </div>

              {/* System Filter */}
              <select
                value={selectedSystemFilter}
                onChange={(e) => setSelectedSystemFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">كافة الأنظمة</option>
                <option value="fleet_plus">فلييت بلس</option>
                <option value="waee">واعي RFID</option>
                <option value="sasco">ساسكو أسطول</option>
                <option value="aldrees">الدريس الذكية</option>
                <option value="petromin">بترومين</option>
                <option value="naft">نفط</option>
              </select>

              {/* Shift Filter */}
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="all">كافة الورديات</option>
                <option value="day_shift">الوردية الصباحية (11س)</option>
                <option value="night_shift">الوردية المسائية (11س)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              إجمالي النتائج: <strong>{filteredRecords.length}</strong> سجل
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table
              data={filteredRecords}
              columns={recordColumns}
              keyExtractor={(f) => f.id}
              emptyTitle="لا توجد عمليات صرف وقود مسجلة مطابقة للبحث"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Today's Quota Monitor (كشف استلام حصص اليوم) */}
      {activeTab === 'today_monitor' && (
        <div className="space-y-4">
          {/* Header guidance & quick filters */}
          <div className="p-4 bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>كشف متابعة حصص اليوم الحية - تاريخ: {todayStr}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                تتبع فوري لكافة المناديب على رأس العمل لمعرفة من استلم حصته اليومية ومن لم يستلم بعد، مع إمكانية تسجيل الصرف بنقرة واحدة
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-blue-100">
              <button
                onClick={() => setTodayStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  todayStatusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                الكل ({drivers.length})
              </button>
              <button
                onClick={() => setTodayStatusFilter('claimed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  todayStatusFilter === 'claimed'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                استلموا الحصة ({todayDispensedDrivers.size})
              </button>
              <button
                onClick={() => setTodayStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  todayStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                لم يستلموا بعد ({Math.max(0, drivers.length - todayDispensedDrivers.size)})
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {todayMonitorItems.map((item) => (
              <div
                key={item.driver.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.hasClaimedToday
                    ? 'bg-white border-emerald-200 hover:border-emerald-300 shadow-xs'
                    : 'bg-white border-amber-200 hover:border-amber-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.hasClaimedToday
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{item.driver.fullName}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        إقامة: {item.driver.iqamaNumber} • {item.driver.phone}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      item.hasClaimedToday
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {item.hasClaimedToday ? '✅ تم الاستلام' : '⏳ بانتظار الصرف'}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الوردية المرتبطة:</span>
                    <div>{getShiftBadge(item.shiftType)}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المركبة المسندة:</span>
                    <span className="font-bold text-slate-800">
                      {item.vehicle ? `${item.vehicle.make} (${item.vehicle.plateNumber})` : 'غير مسندة'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">بطاقة الوقود:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {item.card ? (
                        <>
                          {item.card.chipNumber} ({item.card.system})
                        </>
                      ) : (
                        <span className="text-rose-500">لا توجد بطاقة</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">الحصة المقررة اليوم:</span>
                    <span className="font-mono font-black text-slate-900">
                      {item.dailyQuota} ر.س
                    </span>
                  </div>

                  {item.hasClaimedToday && item.todayFuelRecord && (
                    <div className="p-2 bg-emerald-50 rounded-xl text-[11px] text-emerald-900 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>المصروف الفعلي: {item.todaySpent} ر.س</span>
                        <span>{item.todayFuelRecord.liters} لتر</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-emerald-700">
                        <span>المحطة: {item.todayFuelRecord.gasStation}</span>
                        <span>الوقت: {item.todayFuelRecord.date.split(' ')[1] || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="mt-3 pt-2">
                  {item.card ? (
                    <button
                      onClick={() => handleQuickRefuel(item.driver.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        item.hasClaimedToday
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      <span>{item.hasClaimedToday ? 'تسجيل تعبئة إضافية' : 'صرف حصة اليوم للمندوب'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickIssueCard(item.driver.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إصدار بطاقة وقود لهذا المندوب</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Driver Dedicated Fuel Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                بطاقات وشرائح الوقود المسلمة للمناديب ({fuelChips.length} بطاقة مسجلة)
              </span>
            </div>

            <button
              onClick={() => {
                setEditingChip(null);
                setPreselectedDriverId(undefined);
                setIsChipModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إصدار بطاقة وقود جديدة لمندوب</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table
              data={fuelChips}
              columns={cardColumns}
              keyExtractor={(c) => c.id}
              emptyTitle="لا توجد بطاقات وقود مسجلة للمناديب حالياً"
            />
          </div>
        </div>
      )}

      {/* TAB 4: Central Contract Platform */}
      {activeTab === 'contracts' && (
        <div className="max-w-4xl space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span>منظومة التعاقد المركزية مع مزودي الوقود</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  إعداد المنصة المعتمدة في الشركة وحساب الحصص الافتراضية للمناديب
                </p>
              </div>

              <button
                onClick={() => setIsContractModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل إعدادات العقد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">المنصة الرسمية المعتمدة</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {companySettings.fuelContractPlatformName || 'فلييت بلس / واعي'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  كود المزود: {(companySettings.fuelContractPlatform || 'fleet_plus').toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">الحصة اليومية الافتراضية</span>
                <span className="font-bold text-emerald-800 text-sm block mt-0.5">
                  {companySettings.fuelContractDailyQuota || 40} ر.س / يوم
                </span>
                <span className="text-[10px] text-slate-500">
                  تحتسب آلياً لكافة مناديب الأسطول الجدد
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px]">أيام العمل والحساب الشهري</span>
                <span className="font-bold text-blue-900 text-sm block mt-0.5">
                  {companySettings.fuelContractWorkDays || 30} يوماً (
                  {(companySettings.fuelContractDailyQuota || 40) * (companySettings.fuelContractWorkDays || 30)} ر.س / شهر)
                </span>
                <span className="text-[10px] text-slate-500">
                  الحساب الشهري التلقائي
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                رقم الحساب لدى مزود الخدمة:{' '}
                <strong>{companySettings.fuelContractAccount || 'MARSHAL-FLEETPLUS-9901'}</strong> • رقم العقد:{' '}
                <strong>{companySettings.fuelContractNumber || 'FLT-FUEL-2026/01'}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <FuelFormModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSubmit={handleCreateFuelRecord}
        preselectedDriverId={preselectedDriverId}
        existingFuelRecords={fuelRecords}
      />

      <FuelChipModal
        isOpen={isChipModalOpen}
        onClose={() => {
          setIsChipModalOpen(false);
          setEditingChip(null);
        }}
        onSubmit={handleSaveFuelChip}
        editingChip={editingChip}
        preselectedDriverId={preselectedDriverId}
      />

      <FuelContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        currentSettings={companySettings}
        onSaved={(updated) => setCompanySettings(updated)}
      />

      <DeleteWithPasswordModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteRecord}
        itemTitle={recordToDelete ? `سجل وقود بمبلغ ${recordToDelete.totalCost} ر.س للمندوب ${getDriverName(recordToDelete.driverId)}` : ''}
        itemType="سجل وقود"
      />

      <DeleteWithPasswordModal
        isOpen={!!chipToDelete}
        onClose={() => setChipToDelete(null)}
        onConfirm={handleDeleteChip}
        itemTitle={chipToDelete ? `بطاقة وقود رقم ${chipToDelete.chipNumber} (${chipToDelete.system}) للمندوب ${getDriverName(chipToDelete.driverId)}` : ''}
        itemType="بطاقة وقود"
      />
    </div>
  );
};
