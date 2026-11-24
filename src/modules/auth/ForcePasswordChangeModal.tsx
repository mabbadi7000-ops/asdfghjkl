import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const ForcePasswordChangeModal: React.FC = () => {
  const { forcePasswordModalOpen, setForcePasswordModalOpen, updatePassword } = useAuth();
  const { t } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 خانات على الأقل / Minimum 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين / Passwords do not match');
      return;
    }

    if (newPassword === 'Password@123' || newPassword === 'TempPassword123') {
      setError('لا يمكن استخدام كلمة المرور المؤقتة أو الافتراضية مرة أخرى');
      return;
    }

    setLoading(true);
    const success = await updatePassword(newPassword);
    setLoading(false);

    if (!success) {
      setError('فشل في حفظ كلمة المرور الجديدة');
    }
  };

  return (
    <Modal
      isOpen={forcePasswordModalOpen}
      onClose={() => {}} // Cannot close until password is changed!
      title="تغيير كلمة المرور المؤقتة"
      subtitle="متطلب أمان إلزامي عند أول تسجيل دخول"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            تم إنشاء حسابك بواسطة مدير النظام بكلمة مرور مؤقتة. لحماية أمان بيانات الأسطول، يجب
            عليك تعيين كلمة مرور شخصية جديدة الآن للمتابعة.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('newPassword')}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full ps-9 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('confirmPassword')}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full ps-9 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{loading ? t('loading') : 'حفظ كلمة المرور والدخول إلى النظام'}</span>
        </button>
      </form>
    </Modal>
  );
};
