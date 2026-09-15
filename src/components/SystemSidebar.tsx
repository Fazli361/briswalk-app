import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { SPREADSHEET_ID } from '../gasSourceCode';
import { CloudDownload, CheckCircle, RefreshCw } from 'lucide-react';
import { fetchDataFromGoogleSheet } from '../services/api';

export const SystemSidebar: React.FC = () => {
  const [pesertaList, setPesertaList] = useState(() => StorageService.getPesertaList());
  const [keluargaList, setKeluargaList] = useState(() => StorageService.getKeluargaPalingRamai());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => StorageService.getLastSyncTime());

  const refreshState = () => {
    setPesertaList(StorageService.getPesertaList());
    setKeluargaList(StorageService.getKeluargaPalingRamai());
    setLastSync(StorageService.getLastSyncTime());
  };

  useEffect(() => {
    window.addEventListener('briswalk_data_updated', refreshState);
    return () => window.removeEventListener('briswalk_data_updated', refreshState);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchDataFromGoogleSheet();
      refreshState();
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPeserta = pesertaList.length;
  const topFamily = keluargaList.length > 0 ? keluargaList[0] : null;
  const recentList = [...pesertaList].reverse().slice(0, 4);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <aside className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Pusat Kawalan
          </span>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Ringkasan Sistem
          </h2>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          title="Sedut data terkini dari Google Sheet"
        >
          <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
        </button>
      </div>

      {/* Stat Card 1: Jumlah Peserta */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Jumlah Peserta Berdaftar
        </span>
        <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
          {totalPeserta} <span className="text-xs text-slate-400 font-sans font-normal">orang</span>
        </div>
      </div>

      {/* Stat Card 2: Keluarga Teramai */}
      <div className="bg-sky-50/50 border border-sky-200/80 rounded-xl p-4">
        <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
          Keluarga Teramai
        </span>
        {topFamily ? (
          <div className="mt-1">
            <div className="text-sm font-bold text-slate-900">
              {topFamily.idKeluarga} ({topFamily.totalPeserta} Ahli)
            </div>
            <div className="text-xs text-slate-600 truncate mt-0.5">
              Ketua: <span className="font-semibold">{topFamily.namaKetua}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 mt-1">Belum ada keluarga</div>
        )}
      </div>

      {/* Quick Sync Superadmin Button */}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
      >
        <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
        <span>{isSyncing ? 'Menyedut Dari Sheet...' : 'Sedut Data DARI SHEET'}</span>
      </button>

      {/* Recent Registrations List */}
      <div className="space-y-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Pendaftaran Terkini
        </span>

        {recentList.length === 0 ? (
          <div className="text-xs text-slate-400 py-3 text-center">
            Belum ada rekod pendaftaran.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentList.map((item) => {
              const isKetua = item.statusKeluarga === 'KETUA';
              const isIndividu = item.jenisPendaftaran === 'INDIVIDU';

              return (
                <div key={item.idPeserta} className="py-2.5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isKetua
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : isIndividu
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {getInitials(item.nama)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {item.nama}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {item.idPeserta} • {isIndividu ? 'Individu' : item.statusKeluarga === 'KETUA' ? 'Ketua' : item.hubunganKetua}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Database Connection Footer */}
      <div className="pt-4 border-t border-slate-100 text-center space-y-1 mt-auto">
        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Spreadsheet Sync: <strong className="text-emerald-700 font-semibold">AKTIF</strong></span>
        </div>
        {lastSync && (
          <div className="text-[10px] text-slate-400">
            Sedutan Terakhir: {new Date(lastSync).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>
    </aside>
  );
};
