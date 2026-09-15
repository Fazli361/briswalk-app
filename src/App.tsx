import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessReceipt } from './components/SuccessReceipt';
import { FamilyLeaderboard } from './components/FamilyLeaderboard';
import { ParticipantDirectory } from './components/ParticipantDirectory';
import { AttendanceModule } from './components/AttendanceModule';
import { GasManager } from './components/GasManager';
import { SystemSidebar } from './components/SystemSidebar';
import { PesertaRecord } from './types';
import { Shield, Lock, CloudDownload, RefreshCw, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { fetchDataFromGoogleSheet } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daftar' | 'leaderboard' | 'peserta' | 'kehadiran' | 'gas'>('daftar');
  const [registeredPeserta, setRegisteredPeserta] = useState<PesertaRecord | null>(null);
  
  // Developer / Superadmin Mode toggle
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin' || params.get('dev') === '1' || params.get('admin') === '1' || params.get('superadmin') === '1') {
      return true;
    }
    return localStorage.getItem('bris_walk_admin_mode') === 'true';
  });

  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Global Superadmin Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const handleRegistrationSuccess = (peserta: PesertaRecord) => {
    setRegisteredPeserta(peserta);
  };

  const handleNewRegistration = () => {
    setRegisteredPeserta(null);
    setActiveTab('daftar');
  };

  // SUPERADMIN PASSWORD: Set strictly to "1984"
  const handleVerifyAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() === '1984') {
      setIsDevMode(true);
      localStorage.setItem('bris_walk_admin_mode', 'true');
      setShowAdminPassModal(false);
      setAdminPin('');
      setPinError(false);
      
      // Auto-sedut semua data dari Google Sheet dan terus buka tab Carta Pemenang
      setActiveTab('leaderboard');
      setIsSyncing(true);
      setSyncStatus(null);
      try {
        const res = await fetchDataFromGoogleSheet();
        if (res.success) {
          setSyncStatus({
            type: 'ok',
            message: `Data terkini berjaya disedut! (${res.totalPeserta} peserta diselaraskan)`
          });
          setTimeout(() => setSyncStatus(null), 5000);
        } else {
          setSyncStatus({
            type: 'err',
            message: res.message
          });
        }
      } catch (err: any) {
        setSyncStatus({
          type: 'err',
          message: 'Ralat menyedut data: ' + (err.message || 'Rangkaian/CORS')
        });
      } finally {
        setIsSyncing(false);
      }
    } else {
      setPinError(true);
    }
  };

  const handleToggleDevMode = () => {
    if (isDevMode) {
      setIsDevMode(false);
      localStorage.removeItem('bris_walk_admin_mode');
    } else {
      setShowAdminPassModal(true);
    }
  };

  const handleSyncFromGoogleSheet = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetchDataFromGoogleSheet();
      if (res.success) {
        setSyncStatus({
          type: 'ok',
          message: res.message
        });
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        setSyncStatus({
          type: 'err',
          message: res.message
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'err',
        message: 'Ralat menyedut data: ' + (err.message || 'Rangkaian/CORS')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 
        DEVELOPER / SUPERADMIN MODE ONLY:
        Show top navigation bar, tabs, backend links, database manager, and Sedut Data button
      */}
      {isDevMode ? (
        <>
          {/* Superadmin Mode Top Banner */}
          <div className="bg-slate-900 text-white text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-3 max-w-7xl mx-auto w-full justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Superadmin Mode
                </span>
                <span className="text-slate-400 hidden sm:inline text-[11px]">
                  Menu kawalan penuh. Peserta awam hanya akan melihat borang pendaftaran.
                </span>
              </div>

              {/* Action Buttons for Superadmin */}
              <div className="flex items-center gap-2">
                {/* BUTANG SEDUT DATA DARI SHEET */}
                <button
                  onClick={handleSyncFromGoogleSheet}
                  disabled={isSyncing}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Sedut data terkini dari Google Sheet ke dalam aplikasi"
                >
                  <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Menyedut Data Dari Sheet...' : 'Sedut Data Dari Sheet'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsDevMode(false);
                    localStorage.removeItem('bris_walk_admin_mode');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-md transition-colors"
                >
                  Tutup Mod Admin
                </button>
              </div>
            </div>
          </div>

          {/* Sync Notification Banner if triggered */}
          {syncStatus && (
            <div className={`text-xs px-4 py-2 border-b flex items-center justify-center gap-2 animate-in fade-in duration-200 ${
              syncStatus.type === 'ok'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80'
                : 'bg-rose-950/90 text-rose-300 border-rose-800/80'
            }`}>
              {syncStatus.type === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{syncStatus.message}</span>
            </div>
          )}

          <Navbar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
            }}
            onNewRegistration={handleNewRegistration}
            onSyncFromSheet={handleSyncFromGoogleSheet}
            isSyncing={isSyncing}
          />
        </>
      ) : (
        /* 
          PARTICIPANT PURE MODE (SCAN QR / DIRECT LINK):
          Clean dark minimalist header
        */
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 shadow-md">
          <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-slate-950 font-black text-base flex items-center justify-center shadow-md">
                B
              </div>
              <div>
                <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
                  BRIS WALK
                </h1>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Borang Pendaftaran Rasmi Peserta
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab === 'kehadiran') {
                    setActiveTab('daftar');
                  } else {
                    setActiveTab('kehadiran');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  activeTab === 'kehadiran'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-extrabold shadow-sm'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/80'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{activeTab === 'kehadiran' ? 'Borang Daftar' : 'Sah Kehadiran'}</span>
              </button>

              {/* Discreet Lock icon for organizers */}
              <button
                onClick={() => setShowAdminPassModal(true)}
                title="Log Masuk Urus Setia / Admin"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area: Deep Dark Background */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* If in Dev Mode, show normal multi-tab view */}
        {isDevMode ? (
          <>
            {activeTab === 'daftar' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8">
                  {registeredPeserta ? (
                    <SuccessReceipt
                      peserta={registeredPeserta}
                      onRegisterAgain={handleNewRegistration}
                      onViewLeaderboard={() => setActiveTab('leaderboard')}
                    />
                  ) : (
                    <RegistrationForm onSuccess={handleRegistrationSuccess} />
                  )}
                </div>
                <div className="lg:col-span-4">
                  <SystemSidebar key={registeredPeserta ? registeredPeserta.idPeserta : 'default'} />
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8">
                  <FamilyLeaderboard />
                </div>
                <div className="lg:col-span-4">
                  <SystemSidebar />
                </div>
              </div>
            )}

            {activeTab === 'peserta' && (
              <ParticipantDirectory />
            )}

            {activeTab === 'kehadiran' && (
              <AttendanceModule />
            )}

            {activeTab === 'gas' && (
              <GasManager />
            )}
          </>
        ) : (
          /* 
            PARTICIPANT FOCUS:
            Ultra clean, high-contrast mobile form.
          */
          <div className="max-w-xl mx-auto w-full">
            {activeTab === 'kehadiran' ? (
              <AttendanceModule />
            ) : registeredPeserta ? (
              <SuccessReceipt
                peserta={registeredPeserta}
                onRegisterAgain={handleNewRegistration}
                onViewLeaderboard={() => {
                  handleNewRegistration();
                }}
              />
            ) : (
              <div className="space-y-4">
                <RegistrationForm onSuccess={handleRegistrationSuccess} />

                <div className="text-center py-2 text-xs text-slate-400">
                  <p>Sila pastikan maklumat nombor kad pengenalan dan telefon adalah tepat.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 text-xs mt-auto">
        <div className="max-w-xl md:max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-300 text-center sm:text-left text-xs">
            © BRIS WALK • Pendaftaran Peserta & Keluarga
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('kehadiran');
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline decoration-emerald-600/50 cursor-pointer"
            >
              Modul Sah Kehadiran
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={handleToggleDevMode}
              className="text-[11px] text-slate-400 hover:text-white font-semibold underline decoration-slate-600 cursor-pointer"
            >
              {isDevMode ? 'Tukar ke Mod Peserta' : 'Log Masuk Superadmin'}
            </button>
          </div>
        </div>
      </footer>

      {/* Superadmin Passcode Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Akses Superadmin BRIS WALK</h3>
                <p className="text-xs text-slate-400">Masukkan kata laluan untuk buka menu pentadbiran</p>
              </div>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Kata Laluan Superadmin
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    if (pinError) setPinError(false);
                  }}
                  placeholder="••••"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border-2 border-slate-700 text-sm font-mono font-bold tracking-widest text-white focus:outline-none focus:border-amber-400"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 font-semibold mt-1">
                    Kata laluan tidak sah. Sila cuba lagi.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPassModal(false);
                    setAdminPin('');
                    setPinError(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Log Masuk Superadmin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
