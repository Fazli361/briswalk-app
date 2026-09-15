import React, { useState, useEffect } from 'react';
import { Search, Download, ArrowUpDown, Trash2, RotateCcw, CloudDownload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { PesertaRecord } from '../types';
import { StorageService } from '../services/storage';
import { ResetDatabaseModal } from './ResetDatabaseModal';
import { fetchDataFromGoogleSheet } from '../services/api';

export const ParticipantDirectory: React.FC = () => {
  const [pesertaList, setPesertaList] = useState<PesertaRecord[]>(() => StorageService.getPesertaList());
  const [filterType, setFilterType] = useState<'ALL' | 'INDIVIDU' | 'KELUARGA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Auto-listen to storage updates across the entire app
  useEffect(() => {
    const handleStorageUpdate = () => {
      setPesertaList(StorageService.getPesertaList());
    };
    window.addEventListener('briswalk_data_updated', handleStorageUpdate);
    return () => window.removeEventListener('briswalk_data_updated', handleStorageUpdate);
  }, []);

  const handleSyncFromSheet = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetchDataFromGoogleSheet();
      setPesertaList(StorageService.getPesertaList());
      if (res.success) {
        setSyncFeedback({
          type: 'ok',
          msg: res.message
        });
        setTimeout(() => setSyncFeedback(null), 6000);
      } else {
        setSyncFeedback({
          type: 'err',
          msg: res.message
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'err',
        msg: 'Ralat: ' + (err.message || 'Tidak dapat menghubungi sheet')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmClearAll = () => {
    StorageService.clearAllData();
    setPesertaList([]);
  };

  const handleRestoreSamples = () => {
    if (window.confirm('Adakah anda ingin memuatkan semula data contoh sistem?')) {
      StorageService.resetToDefault();
      setPesertaList(StorageService.getPesertaList());
    }
  };

  const totalPeserta = pesertaList.length;
  const totalIndividu = pesertaList.filter(p => p.jenisPendaftaran === 'INDIVIDU').length;
  const totalKeluargaPeserta = pesertaList.filter(p => p.jenisPendaftaran === 'KELUARGA').length;

  // Build a map of member id to hierarchical role (KETUA, ISTERI, ANAK 1, ANAK 2...)
  const familyRoleMap = React.useMemo(() => {
    const map: { [idPeserta: string]: { displayRole: string; isKetua: boolean; isIsteri: boolean; isAnak: boolean } } = {};
    const families = StorageService.getKeluargaPalingRamai();
    families.forEach(fam => {
      fam.ahliSenarai.forEach(ahli => {
        map[ahli.idPeserta] = {
          displayRole: ahli.displayRole,
          isKetua: ahli.displayRole.startsWith('KETUA'),
          isIsteri: ahli.displayRole.startsWith('ISTERI'),
          isAnak: ahli.displayRole.startsWith('ANAK')
        };
      });
    });
    return map;
  }, [pesertaList]);

  const filteredList = pesertaList
    .filter(p => {
      if (filterType === 'INDIVIDU') return p.jenisPendaftaran === 'INDIVIDU';
      if (filterType === 'KELUARGA') return p.jenisPendaftaran === 'KELUARGA';
      return true;
    })
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        p.nama.toLowerCase().includes(q) ||
        p.noIc.includes(q) ||
        p.noTelefon.includes(q) ||
        p.idPeserta.toLowerCase().includes(q) ||
        p.idKeluarga.toLowerCase().includes(q) ||
        p.namaKetuaKeluarga.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const cmp = a.idPeserta.localeCompare(b.idPeserta);
      return sortAsc ? cmp : -cmp;
    });

  const exportCSV = () => {
    const headers = ['ID Peserta', 'Tarikh Daftar', 'Nama Penuh', 'No. IC', 'Umur', 'No. Telefon', 'Jenis Pendaftaran', 'ID Keluarga', 'Status Keluarga', 'Hubungan', 'Nama Ketua'];
    const rows = filteredList.map(p => [
      p.idPeserta,
      p.tarikhDaftar,
      `"${p.nama}"`,
      `'${p.noIc}`,
      p.umur || 0,
      `'${p.noTelefon}`,
      p.jenisPendaftaran,
      p.idKeluarga || '',
      p.statusKeluarga || '',
      p.hubunganKetua || '',
      `"${p.namaKetuaKeluarga || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BRIS_WALK_Peserta_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Pengkalan Data
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Superadmin Mode
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Direktori Peserta BRIS WALK
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pangkalan data peserta lengkap dengan umur automatik dari No. IC & disegerakkan ke Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BUTANG SEDUT DATA DARI GOOGLE SHEET */}
          <button
            onClick={handleSyncFromSheet}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0"
            title="Sedut semua pendaftaran terbaru terus dari Google Sheet rasmi"
          >
            <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce text-amber-200' : ''}`} />
            <span>{isSyncing ? 'Sedang Menyedut Data...' : 'Sedut Data DARI SHEET'}</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredList.length === 0}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Muat Turun CSV</span>
          </button>

          {/* Safe Reset Button with RESET confirmation modal */}
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kosongkan semua data peserta (Perlu taip RESET)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Kosongkan Semua</span>
          </button>

          {pesertaList.length === 0 && (
            <button
              onClick={handleRestoreSamples}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Muat semula data contoh jika perlu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          syncFeedback.type === 'ok'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          {syncFeedback.type === 'ok' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="flex-1 text-xs sm:text-sm font-semibold">
            {syncFeedback.msg}
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalPeserta})
          </button>
          <button
            onClick={() => setFilterType('INDIVIDU')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterType === 'INDIVIDU'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Individu ({totalIndividu})
          </button>
          <button
            onClick={() => setFilterType('KELUARGA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filterType === 'KELUARGA'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Keluarga ({totalKeluargaPeserta})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, IC, ID, umur, telefon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>ID Peserta</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Nama Penuh</th>
                <th className="py-3 px-4">No. Kad Pengenalan</th>
                <th className="py-3 px-4">Umur</th>
                <th className="py-3 px-4">No. Telefon</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">ID Keluarga</th>
                <th className="py-3 px-4">Status / Hubungan</th>
                <th className="py-3 px-4">Kehadiran</th>
                <th className="py-3 px-4">Tarikh Daftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-600 text-sm">Tiada rekod peserta dijumpai</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? 'Tiada peserta yang sepadan dengan carian anda.' : 'Pangkalan data peserta kini kosong dan sedia untuk pendaftaran rasmi sebenar.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isFam = p.jenisPendaftaran === 'KELUARGA';
                  return (
                    <tr key={p.idPeserta} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {p.idPeserta}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.nama}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {p.noIc}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                          {p.umur || 0} thn
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {p.noTelefon}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isFam ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {p.jenisPendaftaran}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isFam ? (
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {p.idKeluarga}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isFam ? (
                          (() => {
                            const roleInfo = familyRoleMap[p.idPeserta];
                            const label = roleInfo?.displayRole || (p.statusKeluarga === 'KETUA' ? 'KETUA' : p.hubunganKetua || 'AHLI');
                            const isKetua = label.startsWith('KETUA');
                            const isIsteri = label.startsWith('ISTERI');
                            const isAnak = label.startsWith('ANAK');

                            return (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                                isKetua
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : isIsteri
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isAnak
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {label}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.kehadiran && p.kehadiran.includes('HADIR') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>{p.kehadiran}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {p.tarikhDaftar}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      <ResetDatabaseModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirmReset={handleConfirmClearAll}
      />
    </div>
  );
};
