import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { FuelChipSystem } from '../../types';
import { CompanyProfileSettings, saveCompanySettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import { Fuel, CheckCircle2, ShieldCheck, CreditCard, Sparkles, AlertCircle } from 'lucide-react';

interface FuelContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CompanyProfileSettings;
  onSaved: (updated: CompanyProfileSettings) => void;
}

export const FuelContractModal: React.FC<FuelContractModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}) => {
  const { t } = useLanguage();
  const [platform, setPlatform] = useState<FuelChipSystem>(
    (currentSettings.fuelContractPlatform as FuelChipSystem) || 'waee'
  );
  const [platformName, setPlatformName] = useState(
    currentSettings.fuelContractPlatformName || 'منصة واعي الذكية (Waee RFID)'
  );
  const [contractNumber, setContractNumber] = useState(
    currentSettings.fuelContractNumber || 'FLT-FUEL-2026/01'
  );
  const [accountNumber, setAccountNumber] = useState(
    currentSettings.fuelContractAccount || 'MARSHAL-WAEE-9021'
  );
  const [dailyQuota, setDailyQuota] = useState<number>(
    currentSettings.fuelContractDailyQuota || 50
  );
  const [workDays, setWorkDays] = useState<number>(
    currentSettings.fuelContractWorkDays || 30
  );
  const [loading, setLoading] = useState(false);

  // Platform presets
  const handlePlatformChange = (p: FuelChipSystem) => {
    setPlatform(p);
    switch (p) {
      case 'waee':
        setPlatformName('منصة واعي الذكية للأسطول (Waee RFID - الدريس)');
        break;
      case 'fleet_plus':
        setPlatformName('منصة فلييت بلس لإدارة الوقود (Fleet Plus)');
        break;
      case 'sasco':
        setPlatformName('منصة ساسكو أسطول (SASCO Fleet RFID)');
        break;
      case 'aldrees':
        setPlatformName('منصة الدريس الذكية (Aldrees Smart Fleet)');
        break;
      case 'petromin':
        setPlatformName('منصة بترومين أسطول (Petromin Fleet Tag)');
        break;
      case 'naft':
        setPlatformName('منصة نفط الذكية (Naft Smart RFID)');
        break;
      default:
        setPlatformName('منصة تعاقد وقود معتمدة');
    }
  };

  const calculatedMonthly = Math.round(dailyQuota * workDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await saveCompanySettings({
        fuelContractPlatform: platform,
        fuelContractPlatformName: platformName,
        fuelContractNumber: contractNumber,
        fuelContractAccount: accountNumber,
        fuelContractDailyQuota: Number(dailyQuota),
        fuelContractWorkDays: Number(workDays),
      });
      onSaved(updated);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعداد منصة التعاقد الموحدة للوقود (Fuel Contract Platform)"
      subtitle="تحديد منصة الوقود المتعاقد معها رسمياً مع حساب الحصة اليومية وحسابها الشهري التلقائي"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Platform Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            منصة الوقود المتعاقد معها *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'waee', label: 'واعي (Waee RFID)', desc: 'بترول والدريس' },
              { id: 'fleet_plus', label: 'فلييت بلس (Fleet Plus)', desc: 'منظومة فلييت بلس' },
              { id: 'sasco', label: 'ساسكو أسطول (SASCO)', desc: 'محطات ساسكو' },
              { id: 'aldrees', label: 'الدريس (Aldrees)', desc: 'محطات الدريس' },
              { id: 'petromin', label: 'بترومين (Petromin)', desc: 'بترومين إكسبريس' },
              { id: 'naft', label: 'نفط (Naft RFID)', desc: 'محطات نفط' },
              { id: 'other', label: 'منصة أخرى / مخصصة', desc: 'مزود وقود آخر' },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handlePlatformChange(item.id as FuelChipSystem)}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                  platform === item.id
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${platform === item.id ? 'text-emerald-900' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  {platform === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المسمى الرسمي للمنصة في النظام
            </label>
            <input
              type="text"
              required
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم حساب المنشأة / العقد لدى المزود
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="مثال: MARSHAL-WAEE-9021"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم العقد أو الاتفاقية الموحدة
            </label>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="مثال: FLT-WAEE-2026/01"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عدد أيام التشغيل المحتسبة شهرياً *
            </label>
            <select
              value={workDays}
              onChange={(e) => setWorkDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden cursor-pointer"
            >
              <option value={30}>30 يوماً (كامل الشهر - توصيل مستمر)</option>
              <option value={26}>26 يوماً (استبعاد 4 أيام راحة أسبوعية)</option>
              <option value={28}>28 يوماً</option>
              <option value={31}>31 يوماً</option>
            </select>
          </div>
        </div>

        {/* Quota Calculation Card */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">
                حساب الحصة الافتراضية للمندوب (يومياً وشهرياً)
              </span>
            </div>
            <span className="text-[10px] text-slate-300 font-mono">
              احتساب آلي فوري
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                حصة المندوب اليومية الافتراضية (ر.س / يوم) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={10}
                  max={500}
                  step={1}
                  value={dailyQuota}
                  onChange={(e) => setDailyQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-mono font-bold focus:border-amber-400 outline-hidden"
                />
                <span className="absolute left-3 top-2.5 text-xs text-amber-400 font-bold">ر.س / يوم</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                تطبق تلقائياً عند تسجيل أي شريحة جديدة للمندوب
              </span>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-center">
              <span className="text-[11px] text-slate-400">الحصة المحسوبة شهرياً في السستم:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {calculatedMonthly.toLocaleString()}
                </span>
                <span className="text-xs text-slate-300 font-bold">ر.س / شهر</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                ({dailyQuota} ر.س × {workDays} يوم)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? t('loading') : 'حفظ إعدادات منصة التعاقد'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
