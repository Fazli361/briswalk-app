import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface ResetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetDatabaseModal: React.FC<ResetDatabaseModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() === 'RESET') {
      onConfirmReset();
      setConfirmText('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-500/30 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-950 text-base leading-tight">
                Kosongkan Semua Data Peserta
              </h3>
              <p className="text-xs text-rose-600 font-bold mt-0.5">
                Tindakan ini adalah kekal & tidak boleh diundur
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmText('');
              setError(false);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-950">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Amaran Keselamatan Urus Setia</span>
          </div>
          <p className="leading-relaxed">
            Semua rekod pendaftaran peserta, pendaftaran keluarga, dan data contoh akan <strong>dipadamkan sepenuhnya (dikosongkan kepada 0 rekod)</strong>.
          </p>
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Untuk meneruskan, sila taip perkataan <span className="font-mono text-rose-600 font-black bg-rose-100 px-1.5 py-0.5 rounded">RESET</span> di bawah:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Taip RESET di sini..."
              autoFocus
              className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 font-mono font-bold tracking-widest text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                error ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus:border-rose-600'
              }`}
            />
            {error && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Perkataan tidak tepat. Sila taip perkataan <strong>RESET</strong> dengan betul.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setError(false);
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={confirmText.trim().toUpperCase() !== 'RESET'}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sahkan Kosongkan Semua Data</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
