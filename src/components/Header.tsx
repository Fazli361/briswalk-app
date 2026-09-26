import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { KlinikLogo } from './KlinikLogo';

interface HeaderProps {
  participantCount: number;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  participantCount,
  onOpenAdmin,
  isAdminAuthenticated,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-4">
        {/* Logo and Agency Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-white rounded-xl border border-slate-100 p-1 shadow-xs flex items-center justify-center overflow-hidden">
            <KlinikLogo className="w-full h-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Panel Penasihat Klinik Kesihatan Changkat Jering
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
              Program Briskwalk
            </h1>
          </div>
        </div>

        {/* Single Unified 'PENTADBIR' button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-admin"
            onClick={onOpenAdmin}
            title="Akses Pentadbir (Peserta & Tetapan Google Sheet)"
            className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PENTADBIR</span>
            {participantCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[11px] font-bold bg-emerald-600 text-white rounded-full min-w-[18px]">
                {participantCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

