import React, { useState } from 'react';
import {
  Lock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { BrandLogo } from '../../components/common/BrandLogo';

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String.fromCharCode(code >= 0x06f0 ? code - 0x06f0 + 0x30 : code - 0x0660 + 0x30);
  });
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t, tx, language, setLanguage } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال اسم المستخدم أو رقم الهوية وكلمة المرور'
          : 'Please enter username or ID and password'
      );
      return;
    }

    setLoading(true);
    let result: Awaited<ReturnType<typeof login>>;
    try {
      result = await login(username.trim(), password);
    } finally {
      setLoading(false);
    }

    if (!result.success) {
      setError(result.error || (language === 'ar' ? 'فشل تسجيل الدخول، تأكد من صحة البيانات' : 'Login failed, please check credentials'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Graphic elements */}
      <div className="absolute top-1/4 -start-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -end-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in corner */}
      <div className="absolute top-6 end-6">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 pb-6 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-b border-amber-500/30 flex flex-col items-center">
          <BrandLogo size="lg" variant="icon" isDark={true} className="mb-3" />
          <h2 className="text-xl font-black text-amber-400 tracking-wide font-sans">MARSHAL LOGISTIC</h2>
          <p className="text-xs text-slate-300 font-bold mt-0.5">شركة مارشال لوجيستيكس • س.ت: 7054828277</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {tx('منظومة الإدارة المتكاملة للأسطول والعمليات اللوجستية', 'Integrated Fleet & Logistics Operations System')}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {tx('اسم المستخدم أو رقم الهوية', 'Username or ID')}
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(normalizeIdentifier(e.target.value))}
                  placeholder={language === 'ar' ? 'أدخل اسم المستخدم أو رقم الهوية' : 'Enter username or ID'}
                  required
                  autoFocus
                  className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t('password')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{tx('نسيت كلمة المرور؟', 'Forgot password?')}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
            </div>

            {showHelp && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                {tx(
                  'يتم إنشاء وتعيين حسابات موظفي ومشرفي الشركة عبر إدارة النظام. في حال فقدان كلمة المرور يرجى التواصل مع المسؤول المعتمد.',
                  'User credentials are provided by system administrators. Please contact your manager or admin to reset your password.'
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? t('loading') : t('login')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secure System Access Notice */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              {tx('تسجيل دخول آمن ومحمي بنظام الصلاحيات المشفرة RBAC', 'Encrypted Role-Based Access Control')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
