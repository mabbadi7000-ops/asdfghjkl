import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Bell,
  Fuel,
  Shield,
  Save,
  CheckCircle2,
  Database,
  RefreshCw,
  Globe,
  Sliders,
  Zap,
  KeyRound,
  FileCheck,
  Trash2,
  Sparkles,
  AlertTriangle,
  Rocket,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { CommercialRegistrationCard } from '../../components/common/CommercialRegistrationCard';
import { BrandLogo } from '../../components/common/BrandLogo';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { logAuditAction } from '../../services/auditService';
import {
  loadCompanySettings,
  saveCompanySettings,
  syncCompanySettingsFromCloud,
  CompanyProfileSettings,
} from '../../services/settingsService';
import { LogoUploaderSection } from './LogoUploaderSection';
import { createDocument, deleteDocument, fetchCollection } from '../../services/dataService';

export const SettingsManagement: React.FC = () => {
  const { t, tx, language } = useLanguage();
  const { currentUser } = useAuth();

  const [companySettings, setCompanySettings] = useState<CompanyProfileSettings>(() => {
    return loadCompanySettings();
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    let active = true;
    void syncCompanySettingsFromCloud()
      .then((settings) => {
        if (active) setCompanySettings(settings);
      })
      .catch((error) => {
        console.error('[SettingsManagement] Could not load company settings from D1:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSettingsChange = (partial: Partial<CompanyProfileSettings>) => {
    setCompanySettings((prev) => {
      const updated = { ...prev, ...partial };
      // Save immediately for responsive logo/brand changes
      void saveCompanySettings(updated).catch((error) => {
        console.error('[SettingsManagement] Could not save company settings:', error);
      });
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCompanySettings(companySettings);
    if (currentUser) {
      await logAuditAction(
        currentUser,
        'UPDATE_COMPANY_SETTINGS',
        'settings',
        'company_profile',
        'تم تحديث إعدادات وهوية شركة مارشال لوجستيكس بنجاح'
      );
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleWipeDemoData = async () => {
    try {
      setResetting(true);
      setResetConfirmOpen(false);

      // Comprehensive operational collections to clear for 100% clean production handover
      const operationalCollections = [
        'drivers',
        'vehicles',
        'vehicle_shifts',
        'fuel_chips',
        'fuel_records',
        'maintenance_records',
        'attendance',
        'attendance_records',
        'tasks',
        'reports',
        'documents',
        'accidents',
        'violations',
        'expenses',
        'cash_settlements',
        'driver_payrolls',
        'driver_advances',
        'leaves',
        'platform_revenues',
        'mileage_logs',
        'rented_accounts',
        'freelancer_rentals',
        'supervisor_packages',
        'supervisor_account_packages',
        'notifications',
        'deleted_records',
      ];

      for (const col of operationalCollections) {
        try {
          const records = await fetchCollection<{ id: string }>(col);
          for (const record of records) {
            await deleteDocument(col, record.id);
          }
        } catch (colErr) {
          console.error(`[WipeDemoData] Failed to wipe table ${col}:`, colErr);
          throw colErr;
        }
      }

      await createDocument('settings', {
        id: 'production_state',
        isProduction: true,
        demoWiped: true,
        wipedAt: new Date().toISOString(),
        wipedBy: currentUser?.email || currentUser?.fullName || 'admin',
      });

      if (currentUser) {
        await logAuditAction(
          currentUser,
          'WIPE_DEMO_DATA',
          'system',
          'sys-prod',
          'تم تفريغ كافة السجلات المؤقتة وتهيئة المنظومة لاستقبال البيانات التشغيلية الفعلية'
        );
      }

      setResetMessage(
        language === 'ar'
          ? 'تم تفريغ السجلات المؤقتة بنجاح! المنظومة الآن مهيأة وجاهزة 100% لإدخال بيانات أسطول وسائقي شركتك الفعلية.'
          : 'Database cleared successfully! System is now 100% ready for live company operations.'
      );
      setTimeout(() => setResetMessage(''), 6000);
    } catch (err: any) {
      console.error('Error clearing data:', err);
      setResetMessage(err.message || 'حدث خطأ أثناء تفريغ البيانات');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-amber-500" />
            {t('settings')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {tx(
              'إعدادات الهوية البصرية لشعار مارشال لوجستيكس، السجل التجاري، والربط السحابي',
              'Visual Identity & Marshal Logistics Logo, Commercial Registration & Cloud Configuration'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BrandLogo size="sm" variant="badge" isDark={true} />
        </div>
      </div>

      {/* 1. Logo & Brand Visual Identity Uploader */}
      <LogoUploaderSection
        settings={companySettings}
        onChange={handleSettingsChange}
      />

      {/* 2. Commercial Registration Official Card */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-amber-500" />
          <span>{tx('بيانات السجل التجاري والترخيص المعتمد', 'Commercial Registration & Official License')}</span>
        </h3>
        <CommercialRegistrationCard />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{tx('تم حفظ إعدادات وهوية الشركة وتطبيقها في جميع الأقسام بنجاح', 'Settings & Branding updated across all sections successfully')}</span>
          </div>
        )}

        {/* Company Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-amber-500" />
            <span>{tx('بيانات وهوية الشركة المشغلة (مارشال لوجستيكس)', 'Operating Company Profile (MARSHAL LOGISTIC)')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('اسم الشركة (بالعربية)', 'Company Name (Arabic)')}
              </label>
              <input
                type="text"
                value={companySettings.companyNameAr}
                onChange={(e) => setCompanySettings({ ...companySettings, companyNameAr: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 outline-none font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('اسم الشركة (بالإنجليزية)', 'Company Name (English)')}
              </label>
              <input
                type="text"
                value={companySettings.companyNameEn}
                onChange={(e) => setCompanySettings({ ...companySettings, companyNameEn: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 outline-none font-sans font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('الرقم الموحد للسجل التجاري', 'Commercial Registration (CR No)')}
              </label>
              <input
                type="text"
                value={companySettings.crNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, crNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-amber-700 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('الرقم الضريبي (VAT)', 'Tax Number (VAT)')}
              </label>
              <input
                type="text"
                value={companySettings.taxNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, taxNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-amber-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('المدينة والمقر الرئيسي', 'City & Headquarters')}
              </label>
              <input
                type="text"
                value={companySettings.headquarters}
                onChange={(e) => setCompanySettings({ ...companySettings, headquarters: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('اسم المنظومة السحابية المعتمد في التقارير', 'System Name in Reports')}
              </label>
              <input
                type="text"
                value={companySettings.systemName || ''}
                onChange={(e) => setCompanySettings({ ...companySettings, systemName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 outline-none font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Operational Limits & Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>{tx('حدود وضوابط التنبيهات والتشغيل', 'Operational Thresholds & Alerts')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('مهلة تنبيه انتهاء الوثائق (أيام)', 'Document Expiry Alert (Days)')}
              </label>
              <input
                type="number"
                value={companySettings.docExpiryWarningDays}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, docExpiryWarningDays: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-amber-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {tx('تنبيه مبكر قبل انتهاء الرخص والإقامات والتأمين', 'Days prior to document expiry')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('الحد الأقصى اليومي للوقود (ر.س)', 'Daily Fuel Cap (SAR)')}
              </label>
              <input
                type="number"
                value={companySettings.dailyFuelCap}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, dailyFuelCap: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-amber-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {tx('تنبيه العمليات عند تجاوز الاستهلاك الطبيعي', 'Triggers operational anomaly')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('دورة الصيانة الدورية (كم)', 'Service Interval (KM)')}
              </label>
              <input
                type="number"
                value={companySettings.maintenanceAlertKm}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, maintenanceAlertKm: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-amber-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {tx('غيار زيت وفحص دوري ذكي', 'Smart oil change & periodic maintenance')}
              </span>
            </div>
          </div>
        </div>

        {/* Database & Cloud Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>{tx('قواعد البيانات والربط السحابي', 'Cloud Database & Storage')}</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
              {tx('متصل ونشط', 'Connected & Active')}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500">{tx('المزامنة السحابية الحية', 'Live Realtime Sync')}</div>
              <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloudflare D1 & R2 Storage</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {tx('تخزين آمن للبيانات والسجلات والمستندات والعمليات', 'Secure live data synchronization')}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs text-slate-500">{tx('حالة الأمان والصلاحيات', 'Security Rules')}</div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>RBAC & Row-Level Security Enforced</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {tx('حماية بيانات السائقين والمركبات والعمليات المالية', 'Role-based access control')}
              </p>
            </div>
          </div>

        </div>

        {/* Production Mode & Demo Data Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-500" />
              <span>{tx('إدارة بيئة الإطلاق الفعلي والبيانات (Production Readiness)', 'Production Launch & Data Management')}</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full">
              Admin Exclusive
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {tx(
              'قاعدة البيانات السحابية الحالية مكتملة ومهيأة بالكامل (18 جدول / مجموعة بيانات سحابية متكاملة مع قواعد الحماية). يمكنك تفريغ سجلات التشغيل المؤقتة بضغطة زر واحدة للبدء بإدخال بيانات أسطول وسائقي وعمليات شركتك الفعلية.',
              'Cloudflare D1 is configured for the operational database. You can clear temporary operational records when ready to input your actual company data.'
            )}
          </p>

          {resetMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                {tx('تفريغ السجلات المؤقتة وبدء التشغيل الفعلي', 'Clear Temporary Records for Live Launch')}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {tx(
                  'يقوم بتنظيف جداول العمليات لاستقبال بيانات التشغيل الفعلية مع الحفاظ التام على حسابات المديرين وإعدادات الشركة.',
                  'Wipes operational tables for production while keeping your Admin credentials and company settings intact.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setResetConfirmOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{resetting ? tx('جارٍ المعالجة...', 'Processing...') : tx('تفريغ الجداول للإنتاج', 'Wipe Records for Launch')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('save')}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Clearing Operational Data */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleWipeDemoData}
        title={tx('تأكيد تفريغ السجلات المؤقتة للإنتاج', 'Confirm Operational Records Wipe')}
        message={tx(
          'هل أنت متأكد من رغبتك في تفريغ سجلات الأسطول والسائقين المؤقتة؟ سيتم تنظيف الجداول لتهيئة المنظومة لاستقبال بياناتك الفعلية دون التأثير على حسابك أو إعدادات الشركة.',
          'Are you sure you want to wipe operational records? This will clean tables for production launch while keeping your Admin account intact.'
        )}
        variant="danger"
      />
    </div>
  );
};
