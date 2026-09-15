import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Users, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  RefreshCw,
  UserCheck,
  Check,
  ExternalLink,
  HelpCircle,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';
import { PesertaRecord } from '../types';
import { StorageService } from '../services/storage';
import { markAttendanceApi, fetchDataFromGoogleSheet } from '../services/api';
import { normalizeMalaysianIc } from '../utils/icUtils';

export const AttendanceModule: React.FC = () => {
  // Security Authentication (Password: 4123) - Without showing any hint in UI
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('briswalk_attendance_unlocked') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [pesertaList, setPesertaList] = useState<PesertaRecord[]>(() => StorageService.getPesertaList());

  // Selected state
  const [selectedPeserta, setSelectedPeserta] = useState<PesertaRecord | null>(null);
  const [familyMembers, setFamilyMembers] = useState<PesertaRecord[]>([]);
  // Record of IC -> boolean for attendance checkboxes
  const [selectedAttendanceMap, setSelectedAttendanceMap] = useState<Record<string, boolean>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick live sync indicator
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGasHelp, setShowGasHelp] = useState(false);

  // Reload data from local storage when changes occur & auto fetch if empty
  useEffect(() => {
    const handleDataUpdate = () => {
      setPesertaList(StorageService.getPesertaList());
    };
    window.addEventListener('briswalk_data_updated', handleDataUpdate);

    // If local storage has 0 peserta, automatically fetch from Google Sheet
    const currentLocal = StorageService.getPesertaList();
    if (currentLocal.length === 0) {
      handleManualSync();
    }

    return () => window.removeEventListener('briswalk_data_updated', handleDataUpdate);
  }, [isUnlocked]);

  // Filtered search list (4 last digits of IC or name)
  const filteredPeserta = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const cleanDigits = q.replace(/\D/g, '');

    return pesertaList.filter(p => {
      const cleanIc = normalizeMalaysianIc(p.noIc);
      // Match last 4 digits (or exact substring of digits)
      if (cleanDigits.length >= 2 && cleanIc.endsWith(cleanDigits)) return true;
      if (cleanDigits.length >= 4 && cleanIc.includes(cleanDigits)) return true;
      // Match name
      if (p.nama.toLowerCase().includes(q)) return true;
      // Match ID
      if (p.idPeserta.toLowerCase().includes(q)) return true;
      return false;
    }).slice(0, 15); // Limit to top 15 results for performance
  }, [searchQuery, pesertaList]);

  // Statistics
  const stats = useMemo(() => {
    const total = pesertaList.length;
    const hadir = pesertaList.filter(p => p.kehadiran && p.kehadiran.includes('HADIR')).length;
    const individuHadir = pesertaList.filter(p => p.jenisPendaftaran === 'INDIVIDU' && p.kehadiran && p.kehadiran.includes('HADIR')).length;
    const keluargaHadir = pesertaList.filter(p => p.jenisPendaftaran === 'KELUARGA' && p.kehadiran && p.kehadiran.includes('HADIR')).length;
    const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, individuHadir, keluargaHadir, percent };
  }, [pesertaList]);

  // When a participant is clicked from the list
  const handleSelectPeserta = (peserta: PesertaRecord) => {
    setSelectedPeserta(peserta);
    setFeedback(null);

    if (peserta.jenisPendaftaran === 'KELUARGA' && peserta.idKeluarga) {
      // Find all members of this family
      const members = pesertaList.filter(p => p.idKeluarga === peserta.idKeluarga);
      setFamilyMembers(members);

      // Initialize attendance map (default checked if already hadir or if newly selected)
      const initialMap: Record<string, boolean> = {};
      members.forEach(m => {
        initialMap[m.noIc] = m.kehadiran ? m.kehadiran.includes('HADIR') : true;
      });
      setSelectedAttendanceMap(initialMap);
    } else {
      // Individual
      setFamilyMembers([]);
      setSelectedAttendanceMap({
        [peserta.noIc]: peserta.kehadiran ? peserta.kehadiran.includes('HADIR') : true
      });
    }
  };

  // Toggle individual checkbox
  const handleToggleCheckbox = (noIc: string) => {
    setSelectedAttendanceMap(prev => ({
      ...prev,
      [noIc]: !prev[noIc]
    }));
  };

  // Select all or deselect all
  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    familyMembers.forEach(m => {
      updated[m.noIc] = checked;
    });
    setSelectedAttendanceMap(updated);
  };

  // Submit attendance confirmation
  const handleConfirmAttendance = async () => {
    if (!selectedPeserta) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      let targets: { idPeserta?: string; noIc: string; hadir: boolean }[] = [];

      if (selectedPeserta.jenisPendaftaran === 'KELUARGA' && familyMembers.length > 0) {
        targets = familyMembers.map(m => ({
          idPeserta: m.idPeserta,
          noIc: m.noIc,
          hadir: !!selectedAttendanceMap[m.noIc]
        }));
      } else {
        targets = [{
          idPeserta: selectedPeserta.idPeserta,
          noIc: selectedPeserta.noIc,
          hadir: !!selectedAttendanceMap[selectedPeserta.noIc]
        }];
      }

      const res = await markAttendanceApi(targets);

      // Refresh state
      const updatedList = StorageService.getPesertaList();
      setPesertaList(updatedList);

      // Update selected item reference
      const refreshedSelected = updatedList.find(p => p.idPeserta === selectedPeserta.idPeserta) || null;
      setSelectedPeserta(refreshedSelected);

      if (refreshedSelected && refreshedSelected.idKeluarga) {
        setFamilyMembers(updatedList.filter(p => p.idKeluarga === refreshedSelected.idKeluarga));
      }

      setFeedback({
        type: 'success',
        message: res.message
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Gagal mengemaskini kehadiran: ' + (err.message || 'Ralat tidak diketahui')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick sync from Google Sheet
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetchDataFromGoogleSheet();
      if (res.success) {
        setPesertaList(StorageService.getPesertaList());
        setFeedback({
          type: 'success',
          message: `Penyelarasan berjaya: ${res.totalPeserta} rekod dikemaskini dari Google Sheet.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Gagal menyedut data'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Ralat: ' + err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '4123') {
      setIsUnlocked(true);
      sessionStorage.setItem('briswalk_attendance_unlocked', 'true');
      setPasswordError(false);
      setPasswordInput('');

      // Auto sync from Google Sheet if local list is currently empty
      if (pesertaList.length === 0) {
        handleManualSync();
      }
    } else {
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('briswalk_attendance_unlocked');
    setPasswordInput('');
    setPasswordError(false);
  };

  // PASSWORD GATE IF NOT UNLOCKED (No hints anywhere)
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Modul Sah Kehadiran
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sila masukkan kata laluan untuk mengakses modul ini.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Kata Laluan
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError(false);
                }}
                placeholder="Masukkan kata laluan"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-hidden transition-colors ${
                  passwordError
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500'
                    : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                }`}
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Kata laluan tidak sah. Sila cuba lagi.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Buka Modul
          </button>
        </form>
      </div>
    );
  }

  // MAIN ATTENDANCE WORKFLOW (UNLOCKED)
  return (
    <div className="space-y-6">
      {/* Top Bar with Lock Option */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">Modul Kehadiran Aktif</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title="Kunci semula modul"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Kunci Modul</span>
        </button>
      </div>
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between gap-3 shadow-xs ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-2 shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Sheet Sync Status & Guidance Notice */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide text-white uppercase">
                  Penyegerakan Kehadiran ke Google Sheet (Lajur M - KEHADIRAN)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Automatik & Luar Talian Siap
                </span>
              </div>
              <p className="text-[12px] text-slate-300 font-medium mt-0.5">
                Sistem menghantar status kehadiran melalui saluran multi-pipeline secara automatik setiap kali butang Sahkan Kehadiran ditekan.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGasHelp(!showGasHelp)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showGasHelp ? 'Sembunyi Panduan Sheet' : 'Jika Sheet Belum Muncul?'}</span>
          </button>
        </div>

        {showGasHelp && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-300">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                Mengapa Google Sheet belum update secara langsung?
              </p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Deployment Google Apps Script Web App semasa anda masih menggunakan versi asal yang belum ada fungsi penerimaan <code>markAttendance</code> / <code>doPost</code>. Skrip di Google Apps Script perlu disimpan dengan versi terkini (<strong>New Version</strong>).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-black text-emerald-400 block uppercase tracking-wider">Langkah 1</span>
                <p className="text-[11px] text-slate-200 font-semibold">Salin Kod Code.gs Terkini</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Buka tab <strong>Pengurus Web App (GAS)</strong> di menu atas dan klik <em>Salin Code.gs</em>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-black text-emerald-400 block uppercase tracking-wider">Langkah 2</span>
                <p className="text-[11px] text-slate-200 font-semibold">Tampal di Apps Script</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Buka fail <code>Code.gs</code> di projek Google Apps Script anda, padam semua dan tampal kod baru, kemudian klik Simpan (💾).
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-black text-emerald-400 block uppercase tracking-wider">Langkah 3 (Penting!)</span>
                <p className="text-[11px] text-slate-200 font-semibold">Deploy Versi Baru</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Klik <strong>Deploy &gt; Manage deployments &gt; Ikon Pensel (Edit) &gt; Version: New version &gt; Deploy</strong>.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Nota: Kehadiran sentiasa disimpan secara selamat serta-merta dalam sistem kaunter ini dan disegerakkan bila-bila masa melalui butang <strong>Segerak Sheet</strong>.
            </p>
          </div>
        )}
      </div>

      {/* 
        SUSUNAN PAPARAN MENGIKUT PERMINTAAN PENGGUNA:
        1. Carian Peserta Kaunter (Letak atas sekali)
        2. Nama Peserta atau Keluarga yang dijumpai (Kedua selepas carian)
        3. Info dan Dashboard Statistik (Letak bawah sekali)
      */}

      {/* 1. CARIAN PESERTA KAUNTER (ATAS SEKALI) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Carian Peserta Kaunter
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Hari Kejadian
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {pesertaList.length} peserta sedia dicari
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Isi 4 digit akhir IC (cth: 6095) atau nama peserta untuk semakan pantas.
              </p>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title="Penyelarasan dengan Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyegerak...' : 'Segerak Sheet'}</span>
          </button>
        </div>

        {/* Input Carian */}
        <div className="space-y-1">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Isi 4 digit akhir IC (cth: 6095) atau nama..."
              autoFocus
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-1">
            💡 <strong>Tip Petugas:</strong> Masukkan 4 nombor belakang IC. Klik pada nama peserta dalam senarai untuk sahkan kehadiran.
          </p>
        </div>

        {/* Carian Hasil Senarai */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 block">
            {searchQuery ? `Hasil Padanan (${filteredPeserta.length})` : 'Masukkan 4 digit IC untuk mula carian'}
          </span>

          {searchQuery && filteredPeserta.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
              <p className="font-bold text-slate-600">Tiada peserta dijumpai</p>
              <p>Pastikan 4 digit nombor atau ejaan nama adalah tepat.</p>
            </div>
          )}

          {filteredPeserta.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredPeserta.map((p) => {
                const isSelected = selectedPeserta?.idPeserta === p.idPeserta;
                const isHadir = p.kehadiran && p.kehadiran.includes('HADIR');

                return (
                  <div
                    key={p.idPeserta}
                    onClick={() => handleSelectPeserta(p)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {p.nama}
                        </span>
                        {p.jenisPendaftaran === 'KELUARGA' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {p.statusKeluarga === 'KETUA' ? 'Ketua Keluarga' : (p.hubunganKetua || 'Ahli')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            Individu
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>
                          IC: <strong className="text-slate-800 font-bold">•••••••{p.noIc.slice(-4)}</strong>
                        </span>
                        <span>•</span>
                        <span>{p.umur} thn</span>
                        {p.idKeluarga && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-bold">{p.idKeluarga}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Icon */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {isHadir ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span>Hadir</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
                          Belum
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. NAMA PESERTA ATAU KELUARGA (KEDUA SELEPAS CARIAN) */}
      {selectedPeserta ? (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/60 shadow-md space-y-6">
          {/* Header Details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {selectedPeserta.jenisPendaftaran === 'KELUARGA' ? 'Pendaftaran Keluarga' : 'Pendaftaran Individu'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                {selectedPeserta.nama}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5 flex-wrap">
                <span>No. KP: <strong className="text-slate-800">{selectedPeserta.noIc}</strong></span>
                <span>•</span>
                <span>Umur: <strong className="text-slate-800">{selectedPeserta.umur} Tahun</strong></span>
                <span>•</span>
                <span>Tel: <strong className="text-slate-800">{selectedPeserta.noTelefon}</strong></span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 self-stretch sm:self-auto">
              <span className="text-[11px] text-slate-400 block">ID Peserta</span>
              <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                {selectedPeserta.idPeserta}
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* JIKA KELUARGA: Paparkan Senarai Ahli Keluarga dengan Checkbox */}
          {selectedPeserta.jenisPendaftaran === 'KELUARGA' && familyMembers.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-bold text-indigo-950">
                    Kumpulan Keluarga: <span className="font-mono font-black">{selectedPeserta.idKeluarga}</span> ({familyMembers.length} Ahli Berdaftar)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Pilih Semua Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Tandakan ahli keluarga yang hadir di kaunter hari ini. Ahli yang tidak dapat hadir boleh dibiarkan kosong:
              </p>

              <div className="space-y-2.5">
                {familyMembers.map((member) => {
                  const isChecked = !!selectedAttendanceMap[member.noIc];
                  const alreadyMarked = member.kehadiran && member.kehadiran.includes('HADIR');

                  return (
                    <div
                      key={member.noIc}
                      onClick={() => handleToggleCheckbox(member.noIc)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-emerald-600 focus:outline-none"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                              {member.nama}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {member.statusKeluarga === 'KETUA' ? 'Ketua' : (member.hubunganKetua || 'Ahli')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                            <span>IC: {member.noIc}</span>
                            <span>•</span>
                            <span>Umur: {member.umur} Tahun</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {alreadyMarked && (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {member.kehadiran}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* JIKA INDIVIDU */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Status Kehadiran Peserta:
                </span>

                <label 
                  onClick={() => handleToggleCheckbox(selectedPeserta.noIc)}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer select-none"
                >
                  {selectedAttendanceMap[selectedPeserta.noIc] ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 shrink-0" />
                  )}
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Tandakan Hadir Pada Hari Ini
                    </span>
                    <span className="text-xs text-slate-500">
                      {selectedPeserta.kehadiran ? `Status Semasa: ${selectedPeserta.kehadiran}` : 'Belum disahkan'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedPeserta(null)}
              className="px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal / Pilih Semula
            </button>

            <button
              type="button"
              onClick={handleConfirmAttendance}
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isSubmitting 
                  ? 'Sedang Mengemaskini...' 
                  : selectedPeserta.jenisPendaftaran === 'KELUARGA' 
                    ? 'Sahkan Kehadiran Ahli Keluarga' 
                    : 'Sahkan Kehadiran Peserta'
                }
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. INFO DAN DASHBOARD STATISTIK (LETAK BAWAH SEKALI) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Dashboard & Ringkasan Kehadiran Hari Kejadian
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Statistik langsung kehadiran peserta berdaftar di tapak kaunter.
          </p>
        </div>

        {/* Live Attendance Stats Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Jumlah Berdaftar</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{stats.total} Orang</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 block">Telah Hadir</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-700">{stats.hadir}</span>
              <span className="text-xs font-bold text-emerald-600">({stats.percent}%)</span>
            </div>
          </div>
          <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200">
            <span className="text-[11px] font-bold text-sky-800 block">Individu Hadir</span>
            <span className="text-xl font-black text-sky-700 mt-0.5 block">{stats.individuHadir} Orang</span>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200">
            <span className="text-[11px] font-bold text-indigo-800 block">Keluarga Hadir</span>
            <span className="text-xl font-black text-indigo-700 mt-0.5 block">{stats.keluargaHadir} Orang</span>
          </div>
        </div>
      </div>
    </div>
  );
};
