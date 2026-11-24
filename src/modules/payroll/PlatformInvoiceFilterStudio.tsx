import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Coins,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  PieChart as PieChartIcon,
  Percent,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  Upload,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/common/StatCard';
import { PlatformContract } from '../../types';
import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  appendSessionToken,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { downloadFile, isImageData } from '../../utils/fileUtils';
import { syncPlatformRevenueDocument } from '../../services/documentSyncService';

type InvoiceStatus = 'approved' | 'pending' | 'saved' | 'partially_allocated' | 'fully_allocated' | string;

interface DeliveryPlatform {
  id: string;
  name?: string;
  status?: string;
}

interface PlatformInvoice {
  id: string;
  invoiceNumber?: string;
  statementNumber?: string;
  platformId?: string;
  platformName?: string;
  platformContractId?: string;
  platformContractName?: string;
  contractNumber?: string;
  billingPeriod?: string;
  month?: string;
  totalOrders?: number;
  grossAmount?: number;
  totalGrossFee?: number;
  commissionRate?: number;
  commissionAmount?: number;
  vatAmount?: number;
  deductionsAmount?: number;
  totalDeductions?: number;
  netAmount?: number;
  totalNetRevenue?: number;
  status?: InvoiceStatus;
  invoiceDocUrl?: string;
  fileName?: string;
  items?: unknown;
  notes?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

const CHART_COLORS = ['#D97706', '#1E3A8A', '#059669', '#BE123C', '#475569', '#0891B2'];
const INVOICE_METADATA_KEY = 'invoiceMetadata';

function parseInvoiceItems(value: unknown): Record<string, unknown>[] {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
}

function parseInvoiceNotes(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function safeAmount(value: unknown): number {
  return Number(value) || 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'approved': return 'معتمدة';
    case 'pending': return 'قيد المراجعة';
    case 'saved': return 'محفوظة';
    case 'partially_allocated': return 'تصنيف جزئي';
    case 'fully_allocated': return 'مصنفة';
    default: return status || 'غير محددة';
  }
}

export const PlatformInvoiceFilterStudio: React.FC = () => {
  const { tx } = useLanguage();
  const { currentUser } = useAuth();

  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [contracts, setContracts] = useState<PlatformContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'studio' | 'ledger'>('studio');
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [totalOrders, setTotalOrders] = useState(0);
  const [grossAmount, setGrossAmount] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [deductionsAmount, setDeductionsAmount] = useState(0);
  const [invoiceDocUrl, setInvoiceDocUrl] = useState('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<PlatformInvoice | null>(null);
  const [invoiceToPreview, setInvoiceToPreview] = useState<PlatformInvoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribeInvoices = subscribeToCollection<PlatformInvoice>('platform_invoices', (data) => {
      setInvoices(Array.isArray(data) ? data.filter((invoice) => invoice && typeof invoice === 'object') : []);
      setIsLoading(false);
    });
    const unsubscribePlatforms = subscribeToCollection<DeliveryPlatform>('delivery_platforms', (data) => {
      setPlatforms(Array.isArray(data) ? data.filter((platform) => platform && typeof platform === 'object') : []);
    });
    const unsubscribeContracts = subscribeToCollection<PlatformContract>('platform_contracts', (data) => {
      setContracts(Array.isArray(data) ? data.filter((contract) => contract && typeof contract === 'object') : []);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribePlatforms();
      unsubscribeContracts();
    };
  }, []);

  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId);
  const activeContracts = contracts.filter((contract) =>
    contract.platformId === selectedPlatformId && (!contract.status || contract.status === 'active')
  );
  const selectedContract = contracts.find((contract) => contract.id === selectedContractId);
  const commissionAmount = grossAmount * commissionRate / 100;
  const vatAmount = grossAmount * 0.15;
  const totalInvoiceDeductions = commissionAmount + deductionsAmount + vatAmount;
  const calculatedNetAmount = grossAmount - totalInvoiceDeductions;

  const resolvePlatformName = (invoice: PlatformInvoice): string => {
    const metadata = parseInvoiceNotes(invoice.notes);
    const platform = platforms.find((item) => item.id === invoice.platformId);
    return invoice.platformName || platform?.name || String(metadata.platformName || '') || 'منصة غير محددة';
  };

  const getInvoiceValues = (invoice: PlatformInvoice) => {
    const metadata = parseInvoiceNotes(invoice.notes);
    const firstItem = parseInvoiceItems(invoice.items).find((item) => item[INVOICE_METADATA_KEY] === true);
    const details = firstItem || metadata;
    const gross = safeAmount(invoice.grossAmount ?? details.grossAmount ?? invoice.totalGrossFee);
    const hasCalculationDetails = [
      'commissionRate', 'commissionAmount', 'vatAmount', 'deductionsAmount',
    ].some((key) => Object.prototype.hasOwnProperty.call(details, key)) || [
      'commissionRate', 'commissionAmount', 'vatAmount', 'deductionsAmount',
    ].some((key) => Object.prototype.hasOwnProperty.call(invoice, key));
    const commissionRate = safeAmount(invoice.commissionRate ?? details.commissionRate);
    const commission = safeAmount(invoice.commissionAmount ?? details.commissionAmount ?? (hasCalculationDetails ? gross * commissionRate / 100 : 0));
    const vat = safeAmount(invoice.vatAmount ?? details.vatAmount ?? (hasCalculationDetails ? gross * 0.15 : 0));
    const deductions = safeAmount(invoice.deductionsAmount ?? details.deductionsAmount ?? invoice.totalDeductions);
    const totalDeductions = commission + vat + deductions;
    const net = hasCalculationDetails
      ? gross - totalDeductions
      : safeAmount(invoice.netAmount ?? details.netAmount ?? invoice.totalNetRevenue);
    const orders = safeAmount(invoice.totalOrders ?? details.totalOrders);
    const period = String(invoice.billingPeriod || details.billingPeriod || invoice.month || '');
    const invoiceId = String(invoice.invoiceNumber || details.invoiceNumber || invoice.statementNumber || '');
    const contractNumber = String(invoice.contractNumber || details.contractNumber || '');
    const contractId = String(invoice.platformContractId || details.platformContractId || '');
    return { gross, net, orders, commission, vat, deductions, totalDeductions, period, invoiceId, contractNumber, contractId };
  };

  const invoicesWithNames = useMemo(() => invoices.map((invoice) => ({
    invoice,
    platformName: resolvePlatformName(invoice),
    ...getInvoiceValues(invoice),
  })), [invoices, platforms]);

  const totalGross = invoicesWithNames.reduce((sum, row) => sum + row.gross, 0);
  const totalNet = invoicesWithNames.reduce((sum, row) => sum + row.net, 0);
  const totalCommission = invoicesWithNames.reduce((sum, row) => sum + row.commission, 0);
  const totalVat = invoicesWithNames.reduce((sum, row) => sum + row.vat, 0);
  const totalDeductions = invoicesWithNames.reduce((sum, row) => sum + row.totalDeductions, 0);
  const totalDeliveredOrders = invoicesWithNames.reduce((sum, row) => sum + row.orders, 0);
  const approvedInvoices = invoices.filter((invoice) => invoice.status === 'approved').length;
  const approvedRatio = invoices.length ? Math.round(approvedInvoices / invoices.length * 100) : 0;

  const monthlyComparison = useMemo(() => {
    const monthly = new Map<string, { billingPeriod: string; hungerstationRevenue: number; otherPlatformsRevenue: number }>();
    for (const row of invoicesWithNames) {
      if (!/^\d{4}-\d{2}$/.test(row.period)) continue;
      const item = monthly.get(row.period) || {
        billingPeriod: row.period,
        hungerstationRevenue: 0,
        otherPlatformsRevenue: 0,
      };
      if (/هنقرستيشن|hungerstation/i.test(row.platformName)) {
        item.hungerstationRevenue += row.gross;
      } else {
        item.otherPlatformsRevenue += row.gross;
      }
      monthly.set(row.period, item);
    }
    return Array.from(monthly.values()).sort((left, right) => left.billingPeriod.localeCompare(right.billingPeriod));
  }, [invoicesWithNames]);

  const platformDistribution = useMemo(() => {
    const revenueByPlatform = new Map<string, number>();
    for (const row of invoicesWithNames) {
      revenueByPlatform.set(row.platformName, (revenueByPlatform.get(row.platformName) || 0) + row.gross);
    }
    return Array.from(revenueByPlatform, ([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
  }, [invoicesWithNames]);

  const filteredInvoices = invoicesWithNames.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query ||
      row.invoice.id.toLowerCase().includes(query) ||
      row.invoiceId.toLowerCase().includes(query) ||
      row.platformName.toLowerCase().includes(query) ||
      row.contractNumber.toLowerCase().includes(query);
    const matchesPlatform = platformFilter === 'all' || row.invoice.platformId === platformFilter || row.platformName === platformFilter;
    const matchesStatus = statusFilter === 'all' || row.invoice.status === statusFilter;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const resetForm = () => {
    setSelectedPlatformId('');
    setSelectedContractId('');
    setInvoiceNumber('');
    setBillingPeriod(new Date().toISOString().slice(0, 7));
    setTotalOrders(0);
    setGrossAmount(0);
    setCommissionRate(0);
    setDeductionsAmount(0);
    setInvoiceDocUrl('');
    setInvoiceFileName('');
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatformId(platformId);
    setSelectedContractId('');
    setCommissionRate(0);
  };

  const handleContractChange = (contractId: string) => {
    setSelectedContractId(contractId);
    const contract = contracts.find((item) => item.id === contractId);
    setCommissionRate(safeAmount(contract?.commissionRate));
  };

  const handleSaveInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlatformId || !selectedContractId || !invoiceNumber.trim() || !billingPeriod || totalOrders < 0 || grossAmount < 0) {
      setStatusMessage({ type: 'error', text: 'أكمل بيانات المنصة والعقد ورقم الفاتورة والفترة والمبالغ المطلوبة.' });
      return;
    }
    if (!selectedPlatform || !selectedContract) {
      setStatusMessage({ type: 'error', text: 'المنصة أو العقد المحدد لم يعد متاحاً. حدّث القائمة ثم أعد الاختيار.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    const now = new Date().toISOString();
    const metadata = {
      [INVOICE_METADATA_KEY]: true,
      invoiceNumber: invoiceNumber.trim(),
      platformId: selectedPlatformId,
      platformName: selectedPlatform.name || selectedContract.platformName || selectedContract.name || 'منصة غير محددة',
      platformContractId: selectedContractId,
      contractNumber: selectedContract.contractNumber || '',
      billingPeriod,
      totalOrders: safeAmount(totalOrders),
      grossAmount: safeAmount(grossAmount),
      commissionRate: safeAmount(commissionRate),
      commissionAmount,
      vatAmount: safeAmount(vatAmount),
      deductionsAmount: safeAmount(deductionsAmount),
      totalDeductions: safeAmount(totalInvoiceDeductions),
      netAmount: safeAmount(calculatedNetAmount),
      fileName: invoiceFileName,
      invoiceDocUrl,
    };
    const payload: PlatformInvoice = {
      id: `invoice-${Date.now()}-${crypto.randomUUID()}`,
      ...metadata,
      statementNumber: invoiceNumber.trim(),
      platformContractName: selectedContract.platformName || selectedContract.name || selectedPlatform.name || 'منصة غير محددة',
      month: billingPeriod,
      fileName: invoiceFileName || `${invoiceNumber.trim()}.pdf`,
      invoiceDocUrl,
      uploadedAt: now,
      totalCouriers: 0,
      totalOrders: safeAmount(totalOrders),
      totalGrossFee: safeAmount(grossAmount),
      totalDeductions: safeAmount(totalInvoiceDeductions),
      totalNetRevenue: safeAmount(calculatedNetAmount),
      linkedToPayrollCount: 0,
      unlinkedCount: 0,
      status: 'approved',
      items: [metadata],
      notes: JSON.stringify(metadata),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await createDocument('platform_invoices', payload);
      const savedInvoice = { ...payload, id };
      setInvoices((current) => [savedInvoice, ...current.filter((invoice) => invoice.id !== id)]);
      let archiveSyncFailed = false;
      try {
        await syncPlatformRevenueDocument({
          id,
          statementNumber: invoiceNumber.trim(),
          platformName: metadata.platformName,
          month: billingPeriod,
          fileName: payload.fileName || '',
          totalNetRevenue: calculatedNetAmount,
          fileUrl: invoiceDocUrl,
        }, currentUser?.id || 'sys');
      } catch (syncError) {
        archiveSyncFailed = true;
        console.error('Invoice saved to D1 but archive synchronization failed:', syncError);
      }
      await logAuditAction(currentUser, 'SAVE_PLATFORM_OPERATIONAL_INVOICE', 'platform_invoices', id, `حفظ فاتورة ${invoiceNumber.trim()} لمنصة ${metadata.platformName} للفترة ${billingPeriod}`);
      setStatusMessage(archiveSyncFailed
        ? { type: 'error', text: `تم حفظ الفاتورة ${invoiceNumber.trim()} في D1، لكن تعذرت مزامنتها مع أرشيف المستندات.` }
        : { type: 'success', text: `تم حفظ واعتماد الفاتورة ${invoiceNumber.trim()} ضمن إيرادات التشغيل وأرشفة مستندها.` });
      resetForm();
      setActiveTab('ledger');
    } catch (error) {
      console.error('Failed to save platform invoice:', error);
      setStatusMessage({ type: 'error', text: error instanceof Error ? `تعذر حفظ الفاتورة: ${error.message}` : 'تعذر حفظ الفاتورة في قاعدة البيانات.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocument('platform_invoices', invoiceToDelete.id);
      setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceToDelete.id));
      setInvoiceToDelete(null);
      setStatusMessage({ type: 'success', text: 'تم حذف الفاتورة من سجل الإيرادات.' });
    } catch (error) {
      console.error('Failed to delete platform invoice:', error);
      setStatusMessage({ type: 'error', text: error instanceof Error ? `تعذر حذف الفاتورة: ${error.message}` : 'تعذر حذف الفاتورة.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const getInvoiceTitle = (invoice: PlatformInvoice) => {
    const values = getInvoiceValues(invoice);
    return values.invoiceId || invoice.id || 'فاتورة';
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">FleetOps / Finance</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">إيرادات المنصة وإيرادات التشغيل</h1>
          <p className="mt-1 text-xs text-slate-500">إدارة مستقلة للفواتير التشغيلية، بياناتها المحفوظة، ومستندات المصدر.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`rounded-md px-3 py-2 text-xs font-bold ${activeTab === 'studio' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Upload className="me-1.5 inline h-3.5 w-3.5" />استوديو الفواتير
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`rounded-md px-3 py-2 text-xs font-bold ${activeTab === 'ledger' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Receipt className="me-1.5 inline h-3.5 w-3.5" />سجل الإيرادات ({invoices.length})
          </button>
        </div>
      </header>

      {statusMessage && (
        <div
          role={statusMessage.type === 'error' ? 'alert' : 'status'}
          className={`fixed end-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-md items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold shadow-lg ${statusMessage.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{statusMessage.text}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="ms-auto text-current opacity-70 hover:opacity-100" aria-label="إغلاق">×</button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي دخل التشغيل" value={formatCurrency(totalGross)} subtitle="إجمالي الدخل قبل الخصومات" icon={BarChart3} colorScheme="amber" />
        <StatCard title="إجمالي الخصومات والاستقطاعات" value={formatCurrency(totalDeductions)} subtitle="العمولة + الخصومات + ضريبة القيمة المضافة" icon={TrendingDown} colorScheme="rose" />
        <StatCard title="إجمالي العمولات" value={formatCurrency(totalCommission)} subtitle="مجموع عمولات المنصات" icon={Percent} colorScheme="blue" />
        <StatCard title="إجمالي ضريبة القيمة المضافة" value={formatCurrency(totalVat)} subtitle="مجموع ضريبة 15% المخصومة" icon={Coins} colorScheme="indigo" />
        <StatCard title="صافي مستحقات المنشأة" value={formatCurrency(totalNet)} subtitle="الإجمالي بعد طرح الخصومات والضريبة" icon={Receipt} colorScheme="emerald" />
        <StatCard title="إجمالي الطلبات المنفذة" value={totalDeliveredOrders.toLocaleString('ar-SA')} subtitle={`${invoices.length} فاتورة محفوظة`} icon={FileSpreadsheet} colorScheme="blue" />
        <StatCard title="نسبة الفواتير المعتمدة" value={`${approvedRatio}%`} subtitle={`${approvedInvoices} من ${invoices.length} فاتورة`} icon={CheckCircle2} colorScheme="indigo" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-bold text-slate-900">مقارنة دخل هنقرستيشن والمنصات الأخرى شهرياً</h2>
          </div>
          {monthlyComparison.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">لا توجد بيانات شهرية لعرضها.</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="billingPeriod" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={52} />
                  <Tooltip formatter={(value) => formatCurrency(safeAmount(value))} />
                  <Legend />
                  <Bar dataKey="hungerstationRevenue" name="هنقرستيشن" fill="#D97706" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="otherPlatformsRevenue" name="منصات أخرى" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-blue-800" />
            <h2 className="text-sm font-bold text-slate-900">توزيع الحصة السوقية للإيرادات</h2>
          </div>
          {platformDistribution.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">لا توجد إيرادات مسجلة بعد.</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformDistribution} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2}>
                    {platformDistribution.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(safeAmount(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {activeTab === 'studio' ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">استوديو رفع واعتماد الفواتير التشغيلية</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">تُحفظ بيانات الفاتورة في D1 ويُحفظ الملف المرفق في R2.</p>
          </div>
          <form onSubmit={handleSaveInvoice} className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>منصة التوصيل *</span>
                <select required value={selectedPlatformId} onChange={(event) => handlePlatformChange(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">
                  <option value="">اختر المنصة</option>
                  {platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name || 'منصة غير محددة'}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>العقد النشط *</span>
                <select required disabled={!selectedPlatformId} value={selectedContractId} onChange={(event) => handleContractChange(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs disabled:bg-slate-100">
                  <option value="">اختر العقد</option>
                  {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractNumber || contract.name || contract.id}</option>)}
                </select>
                {selectedPlatformId && activeContracts.length === 0 && <span className="block text-[10px] font-normal text-amber-700">لا توجد عقود نشطة مرتبطة بهذه المنصة.</span>}
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>رقم الفاتورة *</span>
                <input required value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" placeholder="INV-2026-001" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>رقم العقد المرتبط</span>
                <input readOnly value={selectedContract?.contractNumber || ''} placeholder="يُحدد تلقائياً من العقد" className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>الفترة المحاسبية *</span>
                <input type="month" required value={billingPeriod} onChange={(event) => setBillingPeriod(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>عدد الطلبات المنفذة *</span>
                <input type="number" min="0" required value={totalOrders} onChange={(event) => setTotalOrders(Number(event.target.value) || 0)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>الدخل الإجمالي (ر.س) *</span>
                <input type="number" min="0" step="0.01" required value={grossAmount} onChange={(event) => setGrossAmount(Number(event.target.value) || 0)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>نسبة العمولة (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={(event) => setCommissionRate(Number(event.target.value) || 0)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>ضريبة القيمة المضافة 15% (ر.س)</span>
                <input type="number" min="0" step="0.01" value={vatAmount.toFixed(2)} readOnly className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-xs" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                <span>الخصومات والغرامات (ر.س)</span>
                <input type="number" min="0" step="0.01" value={deductionsAmount} onChange={(event) => setDeductionsAmount(Number(event.target.value) || 0)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
              <FileUploadZone
                label="مرفق الفاتورة (PDF / Excel)"
                sublabel="ارفع نسخة المصدر إلى التخزين السحابي R2"
                value={invoiceDocUrl}
                onChange={(url, name) => {
                  setInvoiceDocUrl(url);
                  setInvoiceFileName(name || '');
                }}
                accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.pdf,.xlsx,.xls,.csv"
                maxSizeMB={5}
                previewHeight="h-32"
              />
              <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">احتساب صافي الإيراد</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">الإجمالي - العمولة - الخصومات - ضريبة القيمة المضافة</p>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-slate-500">مبلغ العمولة</span><strong>{formatCurrency(commissionAmount)}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">الخصومات والغرامات</span><strong>{formatCurrency(deductionsAmount)}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">ضريبة القيمة المضافة المخصومة</span><strong>{formatCurrency(vatAmount)}</strong></div>
                  <div className="flex justify-between gap-2 border-t border-slate-200 pt-1"><span className="font-semibold text-slate-600">إجمالي الخصومات</span><strong>{formatCurrency(totalInvoiceDeductions)}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">صافي مستحق المنشأة</span><strong className="text-emerald-700">{formatCurrency(calculatedNetAmount)}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <p className="text-[10px] text-slate-500">رقم العقد: <span className="font-mono font-bold text-slate-700">{selectedContract?.contractNumber || '—'}</span></p>
              <button type="submit" disabled={isSaving || !selectedContractId} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ واعتماد الفاتورة كإيراد تشغيلي في D1'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">سجل الفواتير والإيرادات المحفوظة</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">السجلات المباشرة من قاعدة بيانات D1.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-md border border-slate-300 px-2.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث برقم الفاتورة أو المنصة" className="min-h-9 min-w-48 text-xs outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-300 px-2.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="min-h-9 bg-white text-xs outline-none">
                  <option value="all">كل المنصات</option>
                  {platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name || 'منصة غير محددة'}</option>)}
                </select>
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs">
                <option value="all">كل الحالات</option>
                <option value="approved">معتمدة</option>
                <option value="pending">قيد المراجعة</option>
                <option value="saved">محفوظة</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-xs font-semibold text-slate-500">جارٍ تحميل سجل الإيرادات...</div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={invoices.length ? 'لا توجد فواتير مطابقة' : 'لا توجد فواتير إيرادات محفوظة'}
              description={invoices.length ? 'غيّر كلمات البحث أو عوامل التصفية.' : 'ابدأ بإضافة فاتورة تشغيلية إلى سجل D1.'}
              actionLabel={invoices.length ? undefined : 'إضافة فاتورة'}
              onAction={invoices.length ? undefined : () => setActiveTab('studio')}
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[1050px] text-start text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">رقم الفاتورة</th>
                    <th className="px-3 py-2.5">المنصة والعقد</th>
                    <th className="px-3 py-2.5">الفترة</th>
                    <th className="px-3 py-2.5 text-end">الطلبات</th>
                    <th className="px-3 py-2.5 text-end">الدخل الإجمالي</th>
                    <th className="px-3 py-2.5 text-end">إجمالي الخصومات</th>
                    <th className="px-3 py-2.5 text-end">صافي الاستحقاق</th>
                    <th className="px-3 py-2.5">الحالة</th>
                    <th className="px-3 py-2.5">المستند</th>
                    <th className="px-3 py-2.5">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((row) => {
                    const { invoice } = row;
                    const title = getInvoiceTitle(invoice);
                    const contract = contracts.find((item) => item.id === row.contractId);
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{title}</td>
                        <td className="px-3 py-2.5">
                          <span className="block font-semibold text-slate-800">{row.platformName}</span>
                          <span className="text-[10px] text-slate-500">{row.contractNumber || contract?.contractNumber || contract?.name || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{row.period || '—'}</td>
                        <td className="px-3 py-2.5 text-end font-mono">{row.orders.toLocaleString('ar-SA')}</td>
                        <td className="px-3 py-2.5 text-end font-mono">{formatCurrency(row.gross)}</td>
                        <td className="px-3 py-2.5 text-end font-mono text-rose-700">{formatCurrency(row.totalDeductions)}</td>
                        <td className="px-3 py-2.5 text-end font-mono font-bold text-emerald-700">{formatCurrency(row.net)}</td>
                        <td className="px-3 py-2.5"><span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{getStatusLabel(invoice.status)}</span></td>
                        <td className="px-3 py-2.5">
                          {invoice.invoiceDocUrl ? (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setInvoiceToPreview(invoice)} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title="معاينة من R2"><ExternalLink className="h-4 w-4" /></button>
                              <button type="button" onClick={() => downloadFile(appendSessionToken(invoice.invoiceDocUrl!), invoice.fileName || `${title}.pdf`)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50" title="تنزيل من R2"><Download className="h-4 w-4" /></button>
                            </div>
                          ) : <span className="text-[10px] text-slate-400">لا يوجد مرفق</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <button type="button" onClick={() => setInvoiceToDelete(invoice)} className="rounded p-1.5 text-rose-700 hover:bg-rose-50" title="حذف الفاتورة"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal isOpen={Boolean(invoiceToDelete)} onClose={() => !isDeleting && setInvoiceToDelete(null)} title="تأكيد حذف الفاتورة" maxWidth="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">هل تريد حذف الفاتورة «{invoiceToDelete ? getInvoiceTitle(invoiceToDelete) : ''}» من سجل D1؟</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setInvoiceToDelete(null)} disabled={isDeleting} className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">إلغاء</button>
            <button type="button" onClick={() => void handleDeleteInvoice()} disabled={isDeleting} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isDeleting ? 'جارٍ الحذف...' : 'حذف الفاتورة'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(invoiceToPreview)} onClose={() => setInvoiceToPreview(null)} title={invoiceToPreview ? getInvoiceTitle(invoiceToPreview) : 'معاينة الفاتورة'} maxWidth="4xl">
        {invoiceToPreview?.invoiceDocUrl ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <a href={appendSessionToken(invoiceToPreview.invoiceDocUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                <ExternalLink className="h-3.5 w-3.5" />فتح الملف
              </a>
            </div>
            {isImageData(invoiceToPreview.invoiceDocUrl) ? (
              <img src={appendSessionToken(invoiceToPreview.invoiceDocUrl)} alt={getInvoiceTitle(invoiceToPreview)} className="max-h-[70vh] w-full rounded-md object-contain" />
            ) : (
              <iframe src={appendSessionToken(invoiceToPreview.invoiceDocUrl)} title={getInvoiceTitle(invoiceToPreview)} className="h-[70vh] w-full rounded-md border border-slate-200" />
            )}
          </div>
        ) : <p className="text-sm text-slate-500">لا يوجد ملف مرفق.</p>}
      </Modal>
    </div>
  );
};
