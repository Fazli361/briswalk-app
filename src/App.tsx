import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessModal } from './components/SuccessModal';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ParticipantsListModal } from './components/ParticipantsListModal';
import { AdminModal } from './components/AdminModal';
import { Participant, SheetConfig } from './types';
import {
  getSavedConfig,
  saveConfig,
  getStoredParticipants,
  saveParticipants,
  sendParticipantToSheet,
  exportToCSV,
  DEFAULT_SHEET_URL,
} from './services/sheetService';
import {
  HeartPulse,
  Award,
  Timer,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Footprints,
  Gift,
} from 'lucide-react';

const ADMIN_PASSWORD = '1984';

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [config, setConfig] = useState<SheetConfig>({
    sheetUrl: DEFAULT_SHEET_URL,
    autoSync: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [latestRegistered, setLatestRegistered] = useState<Participant | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  } | null>(null);

  // Load initial data
  useEffect(() => {
    const loadedConfig = getSavedConfig();
    const loadedParticipants = getStoredParticipants();
    setConfig(loadedConfig);
    setParticipants(loadedParticipants);
  }, []);

  const showToast = (
    type: 'success' | 'warning' | 'error',
    title: string,
    description: string
  ) => {
    setToastMessage({ type, title, description });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleAdminAuthenticate = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      showToast('success', 'Akses Dibenarkan', 'Selamat datang ke Panel Pentadbir.');
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    showToast('warning', 'Log Keluar', 'Anda telah keluar dari Panel Pentadbir.');
  };

  const handleOpenAdmin = () => {
    setIsAdminModalOpen(true);
  };

  const handleRegistrationSubmit = async (formData: {
    nama: string;
    noKp: string;
    noTel: string;
  }) => {
    // Enforce 1 IC = 1 entry restriction
    const cleanKp = formData.noKp.replace(/\D/g, '');
    const existingParticipant = participants.find(
      (p) => p.noKp.replace(/\D/g, '') === cleanKp
    );
    if (existingParticipant) {
      showToast(
        'error',
        'Pendaftaran Ditolak: No. KP Bertindih',
        `No. Kad Pengenalan ini telah pun didaftarkan atas nama "${existingParticipant.nama}". Setiap peserta hanya layak mendaftar sekali sahaja.`
      );
      return;
    }

    setIsSubmitting(true);

    const newParticipant: Participant = {
      id: 'BW-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      nama: formData.nama,
      noKp: formData.noKp,
      noTel: formData.noTel,
      syncedToSheet: false,
    };

    let synced = false;
    let syncErrMsg = '';

    // Attempt to send straight to Google Sheets if URL configured
    if (config.sheetUrl && config.sheetUrl.trim()) {
      try {
        const result = await sendParticipantToSheet(newParticipant, config.sheetUrl);
        if (result.success) {
          synced = true;
          newParticipant.syncedToSheet = true;
        } else {
          syncErrMsg = result.error || 'Gagal sambung ke Google Sheet';
          newParticipant.syncError = syncErrMsg;
        }
      } catch (err: unknown) {
        syncErrMsg = err instanceof Error ? err.message : 'Ralat sambungan';
        newParticipant.syncError = syncErrMsg;
      }
    }

    // Save locally
    const updated = [newParticipant, ...participants];
    setParticipants(updated);
    saveParticipants(updated);
    setIsSubmitting(false);

    setLatestRegistered(newParticipant);
    setIsSuccessModalOpen(true);

    if (synced) {
      showToast(
        'success',
        'Pendaftaran Berjaya & Disimpan ke Google Sheet!',
        `Data ${formData.nama} telah direkodkan dalam Google Sheet.`
      );
    } else if (config.sheetUrl && config.sheetUrl.trim()) {
      showToast(
        'warning',
        'Disimpan Tempatan (Ralat Google Sheet)',
        'Maklumat anda selamat disimpan secara tempatan.'
      );
    } else {
      showToast(
        'warning',
        'Disimpan ke Sistem Tempatan',
        'Maklumat pendaftaran anda selamat disimpan.'
      );
    }
  };

  const handleSaveConfig = (newConfig: SheetConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    showToast(
      'success',
      'Tetapan Google Sheet Disimpan',
      newConfig.sheetUrl
        ? 'Pautan Google Sheet sedia digunakan untuk pendaftaran.'
        : 'Pautan dikosongkan.'
    );
  };

  const handleSyncAll = async () => {
    if (!config.sheetUrl || !config.sheetUrl.trim()) {
      setIsSettingsModalOpen(true);
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    const updated = [...participants];

    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].syncedToSheet) {
        const res = await sendParticipantToSheet(updated[i], config.sheetUrl);
        if (res.success) {
          updated[i].syncedToSheet = true;
          updated[i].syncError = undefined;
          successCount++;
        }
      }
    }

    setParticipants(updated);
    saveParticipants(updated);
    setIsSyncing(false);

    if (successCount > 0) {
      showToast(
        'success',
        'Penyegerakan Selesai',
        `${successCount} pendaftaran telah berjaya dihantar ke Google Sheet.`
      );
    } else {
      showToast(
        'warning',
        'Tiada Data Baharu',
        'Semua peserta telah pun tersimpan di Google Sheet.'
      );
    }
  };

  const handleDeleteParticipant = (id: string) => {
    const updated = participants.filter((p) => p.id !== id);
    setParticipants(updated);
    saveParticipants(updated);
    showToast('success', 'Rekod Dipadam', 'Rekod peserta telah dikeluarkan dari senarai tempatan.');
  };

  const handleExportCsv = () => {
    exportToCSV(participants);
    showToast(
      'success',
      'Fail Dimuat Turun',
      'Fail senarai peserta dalam format CSV/Excel telah dimuat turun.'
    );
  };

  const hasSheetConfigured = Boolean(config.sheetUrl && config.sheetUrl.trim());

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Header with Unified PENTADBIR button */}
      <Header
        participantCount={participants.length}
        onOpenAdmin={handleOpenAdmin}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
          <div
            className={`rounded-2xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-500'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900/90 text-white border-amber-500'
                : 'bg-rose-900/90 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-black text-sm">{toastMessage.title}</div>
              <div className="text-xs opacity-90 mt-0.5">{toastMessage.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Welcome & Program Info Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase">
                <Footprints className="w-4 h-4" />
                Aktiviti Komuniti Sihat
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Program Briskwalk Komuniti
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Anjuran Panel Penasihat Klinik Kesihatan. Terbuka kepada semua penduduk setempat.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Penyertaan Percuma</span>
            </div>
          </div>

          {/* Quick Highlight Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Kesihatan</div>
                <div className="text-sm font-extrabold text-slate-800">Kuatkan Jantung</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Sasaran</div>
                <div className="text-sm font-extrabold text-slate-800">10,000 Langkah</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">Ganjaran</div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  Cenderahati, Sijil & <span className="text-amber-800 underline decoration-amber-400 font-extrabold">Cabutan Bertuah</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Core Registration Form */}
        <RegistrationForm
          onSubmit={handleRegistrationSubmit}
          isSubmitting={isSubmitting}
          hasSheetConfigured={hasSheetConfigured}
          onOpenSettings={handleOpenAdmin}
          participants={participants}
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-700">
            © {new Date().getFullYear()} Panel Penasihat Klinik Kesihatan • Program Briskwalk
          </p>
          <p className="text-slate-400">
            Sistem Pendaftaran Digital Komuniti Sihat • Bersepadu dengan Google Sheets
          </p>
        </div>
      </footer>

      {/* Admin Protected Modal (Password Protected: 1984) */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAuthenticated={isAdminAuthenticated}
        onAuthenticate={handleAdminAuthenticate}
        onLogout={handleAdminLogout}
        participantCount={participants.length}
        hasSheetConfigured={hasSheetConfigured}
        onOpenParticipantsList={() => setIsListModalOpen(true)}
        onOpenSheetSettings={() => setIsSettingsModalOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <SuccessModal
          participant={latestRegistered}
          syncedToSheet={Boolean(latestRegistered?.syncedToSheet)}
          onClose={() => setIsSuccessModalOpen(false)}
        />
      )}

      {/* Google Sheet Settings Modal */}
      {isSettingsModalOpen && (
        <SheetSettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {/* Participants Records Modal */}
      {isListModalOpen && (
        <ParticipantsListModal
          participants={participants}
          onClose={() => setIsListModalOpen(false)}
          onExportCsv={handleExportCsv}
          onSyncAll={handleSyncAll}
          onDelete={handleDeleteParticipant}
          isSyncing={isSyncing}
          hasSheetConfigured={hasSheetConfigured}
          onOpenSettings={() => {
            setIsListModalOpen(false);
            setIsSettingsModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

