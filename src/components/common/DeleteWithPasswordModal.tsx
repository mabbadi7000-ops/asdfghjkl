import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface DeleteWithPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  itemTitle: string;
  itemType?: string;
  warningNote?: string;
  loading?: boolean;
}

export const DeleteWithPasswordModal: React.FC<DeleteWithPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  itemType = 'سجل',
  warningNote,
  loading = false,
}) => {
  const { currentUser, verifyPassword } = useAuth();
  const { t, language } = useLanguage();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setReason('');
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال كلمة المرور للمتابعة' : 'Please enter your password to continue');
      return;
    }

    try {
      setIsVerifying(true);
      const isPasswordValid = await verifyPassword(password.trim());

      if (!isPasswordValid) {
        setError(
          language === 'ar'
            ? 'كلمة المرور غير صحيحة! تم إيقاف عملية الحذف لحماية بيانات المنظومة.'
            : 'Incorrect password! Deletion blocked to protect system records.'
        );
        setIsVerifying(false);
        return;
      }

      // Valid password - execute deletion
      await onConfirm(reason.trim() || (language === 'ar' ? 'حذف مصرح به بكلمة مرور' : 'Authorized deletion with password'));
      onClose();
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء معالجة الحذف' : 'An error occurred during deletion'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `تأكيد حذف ${itemType} بكلمة المرور` : `Confirm ${itemType} Deletion with Password`}
      subtitle={language === 'ar' ? 'حماية أمنية وتوثيق لسلة المحذوفات لدى المدير العام' : 'Security confirmation with recycle bin logging'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-rose-950">
              {language === 'ar' ? 'طلب تفويض أمني للحذف' : 'Security Authorization Required'}
            </h4>
            <p className="text-rose-800 leading-relaxed">
              {language === 'ar'
                ? `أنت على وشك حذف:`
                : `You are about to delete:`}{' '}
              <strong className="text-rose-950 font-black block mt-0.5 break-all">
                {itemTitle}
              </strong>
            </p>
            {warningNote && (
              <p className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60">
                {warningNote}
              </p>
            )}
          </div>
        </div>

        {/* Audit Guarantee Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
          <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            {language === 'ar'
              ? `سيتم حفظ هذا السجل في "إدارة المحذوفات" مسجلاً باسمك (${currentUser?.fullName || 'المستخدم'}) ويمكن للمدير العام استعادته في أي وقت.`
              : `This item will be archived in "Recycle Bin" under your name (${currentUser?.fullName || 'User'}) and can be restored anytime by the General Manager.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-100/80 border border-red-300 rounded-xl text-xs text-red-900 font-semibold flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ar' ? 'أدخل كلمة المرور الخاصة بك لتأكيد الحذف *' : 'Enter your password to authorize deletion *'}</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={language === 'ar' ? 'كلمة مرور حسابك الحالي...' : 'Your account password...'}
              className="w-full px-3.5 py-2.5 ps-3 pe-10 bg-white border border-slate-300 focus:border-rose-500 rounded-xl text-xs font-mono outline-hidden focus:ring-2 focus:ring-rose-200 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Reason Input (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'ar' ? 'سبب الحذف (للتوثيق في سجل الأمان وسلة المحذوفات):' : 'Reason for deletion (for security audit trail):'}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={language === 'ar' ? 'مثال: إلغاء التعاقد، خطأ في الإدخال، انتهاء الصلاحية...' : 'e.g. Contract cancelled, data entry mistake...'}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-hidden focus:border-slate-400 transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isVerifying || loading}
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isVerifying || loading}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
          >
            {isVerifying || loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{language === 'ar' ? 'جارٍ التحقق والحذف...' : 'Verifying & Deleting...'}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'تأكيد الحذف والنقل للمحذوفات' : 'Confirm & Move to Trash'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
