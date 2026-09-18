import React, { useState } from 'react';
import {
  Lock,
  X,
  KeyRound,
  FileSpreadsheet,
  Users,
  Download,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Participant, SheetConfig } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onAuthenticate: (password: string) => boolean;
  onLogout: () => void;
  participantCount: number;
  hasSheetConfigured: boolean;
  onOpenParticipantsList: () => void;
  onOpenSheetSettings: () => void;
  onExportCsv: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onAuthenticate,
  onLogout,
  participantCount,
  hasSheetConfigured,
  onOpenParticipantsList,
  onOpenSheetSettings,
  onExportCsv,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAuthenticate(passwordInput);
    if (success) {
      setPasswordInput('');
      setErrorMsg('');
    } else {
      setErrorMsg('Kata laluan tidak sah. Sila cuba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Panel Pentadbir</h3>
              <p className="text-xs text-slate-400 font-medium">
                Panel Penasihat Klinik Kesihatan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {!isAuthenticated ? (
            /* Password Authentication Screen */
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="text-center space-y-2 pb-2">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center text-emerald-700 shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-extrabold text-slate-900">
                  Pengesahan Akses Pentadbir
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                  Sila masukkan kata laluan untuk mengakses rekod pendaftaran peserta dan tetapan Google Sheets.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Kata Laluan (Password)
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password-input"
                    type="password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Masukkan kata laluan"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-xl border-2 border-slate-300 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 text-base font-mono outline-none transition"
                  />
                </div>
                {errorMsg && (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mt-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-md hover:shadow-emerald-700/20 active:scale-[0.99] transition cursor-pointer"
              >
                Log Masuk Pentadbir
              </button>
            </form>
          ) : (
            /* Authenticated Admin Dashboard Controls */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-sm font-bold text-slate-800">
                    Akses Dibenarkan (Pentadbir)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1. Senarai Peserta */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenParticipantsList();
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">
                          Senarai Peserta
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                          {participantCount}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lihat, cari, padam, dan selaras data peserta
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition group-hover:translate-x-0.5" />
                </button>

                {/* 2. Tetapan Google Sheets */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSheetSettings();
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">
                          Tetapan Google Sheets
                        </span>
                        {hasSheetConfigured ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Tersambung
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Belum Disambung
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Urus URL Web App Google Sheet dan kod skrip
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition group-hover:translate-x-0.5" />
                </button>

                {/* 3. Muat Turun Fail CSV / Excel */}
                <button
                  type="button"
                  onClick={() => {
                    onExportCsv();
                  }}
                  disabled={participantCount === 0}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition flex items-center justify-between text-left group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-base">
                        Muat Turun Fail CSV / Excel
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Eksport semua rekod pendaftaran ke komputer
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
