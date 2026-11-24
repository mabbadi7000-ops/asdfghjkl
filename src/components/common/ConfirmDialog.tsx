import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}) => {
  const { t } = useLanguage();

  const icon = {
    danger: <Trash2 className="w-8 h-8 text-rose-600" />,
    warning: <AlertTriangle className="w-8 h-8 text-amber-500" />,
    primary: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
  }[variant];

  const confirmBtnBg = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(title)} maxWidth="md">
      <div className="flex flex-col items-center text-center py-2">
        <div className="p-3 bg-slate-100 rounded-2xl mb-4">
          {icon}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mb-6">
          {t(message)}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel || t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer ${confirmBtnBg}`}
          >
            {loading ? t('loading') : (confirmLabel || t('confirm'))}
          </button>
        </div>
      </div>
    </Modal>
  );
};
