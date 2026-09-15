import React from 'react';
import { Trophy, Users, FileCode2, ExternalLink, Plus, CloudDownload, UserCheck } from 'lucide-react';
import { SPREADSHEET_URL } from '../gasSourceCode';

interface NavbarProps {
  activeTab: 'daftar' | 'leaderboard' | 'peserta' | 'kehadiran' | 'gas';
  setActiveTab: (tab: 'daftar' | 'leaderboard' | 'peserta' | 'kehadiran' | 'gas') => void;
  onNewRegistration: () => void;
  onSyncFromSheet?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewRegistration,
  onSyncFromSheet,
  isSyncing = false
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title (Single row contract) */}
        <div 
          onClick={() => setActiveTab('daftar')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base tracking-tight shadow-xs group-hover:bg-slate-800 transition-colors">
            B
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                BRIS WALK
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Superadmin
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden md:block -mt-0.5">
              Sistem Pendaftaran Rasmi
            </span>
          </div>
        </div>

        {/* Zone 2: Nav Links (5 items, 1-2 words, single line) */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('daftar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'daftar'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Pendaftaran
          </button>
          
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Keluarga Ramai
          </button>

          <button
            onClick={() => setActiveTab('peserta')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'peserta'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Senarai Peserta
          </button>

          <button
            onClick={() => setActiveTab('kehadiran')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'kehadiran'
                ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sah Kehadiran</span>
          </button>

          <button
            onClick={() => setActiveTab('gas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'gas'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-sky-500" />
            Kod Backend
          </button>
        </nav>

        {/* Zone 3: Primary Action Zone */}
        <div className="flex items-center gap-2 shrink-0">
          {onSyncFromSheet && (
            <button
              onClick={onSyncFromSheet}
              disabled={isSyncing}
              title="Sedut data terkini dari Google Sheet ke dalam aplikasi"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <CloudDownload className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sedang Sedut...' : 'Sedut Dari Sheet'}</span>
            </button>
          )}

          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka Google Sheet Rasmi"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
          >
            <span>Google Sheet</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={() => {
              setActiveTab('daftar');
              onNewRegistration();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Daftar Baru</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-50 px-2 py-1.5 border-t border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`flex-1 py-1.5 px-1.5 text-center rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'daftar' ? 'text-slate-900 bg-white shadow-xs font-bold' : 'text-slate-500'
          }`}
        >
          Daftar
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-1.5 px-1.5 text-center rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'leaderboard' ? 'text-slate-900 bg-white shadow-xs font-bold' : 'text-slate-500'
          }`}
        >
          Keluarga
        </button>
        <button
          onClick={() => setActiveTab('peserta')}
          className={`flex-1 py-1.5 px-1.5 text-center rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'peserta' ? 'text-slate-900 bg-white shadow-xs font-bold' : 'text-slate-500'
          }`}
        >
          Peserta
        </button>
        <button
          onClick={() => setActiveTab('kehadiran')}
          className={`flex-1 py-1.5 px-1.5 text-center rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'kehadiran' ? 'text-emerald-950 bg-emerald-100 shadow-xs font-bold' : 'text-emerald-700'
          }`}
        >
          Kehadiran
        </button>
        <button
          onClick={() => setActiveTab('gas')}
          className={`flex-1 py-1.5 px-1.5 text-center rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'gas' ? 'text-slate-900 bg-white shadow-xs font-bold' : 'text-slate-500'
          }`}
        >
          Backend
        </button>
      </div>
    </header>
  );
};

