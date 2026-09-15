import React, { useState, useEffect } from 'react';
import { Trophy, Search, ChevronDown, ChevronUp, UserCheck, Heart, Baby, Users, Calendar, CloudDownload } from 'lucide-react';
import { KeluargaStatsItem } from '../types';
import { StorageService } from '../services/storage';
import { fetchDataFromGoogleSheet } from '../services/api';

export const FamilyLeaderboard: React.FC = () => {
  const [families, setFamilies] = useState<KeluargaStatsItem[]>(() => StorageService.getKeluargaPalingRamai());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFamId, setExpandedFamId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setFamilies(StorageService.getKeluargaPalingRamai());
    };
    window.addEventListener('briswalk_data_updated', handleUpdate);
    return () => window.removeEventListener('briswalk_data_updated', handleUpdate);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchDataFromGoogleSheet();
      setFamilies(StorageService.getKeluargaPalingRamai());
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredFamilies = families.filter(fam => {
    const q = searchTerm.toLowerCase();
    return (
      fam.idKeluarga.toLowerCase().includes(q) ||
      fam.namaKetua.toLowerCase().includes(q) ||
      fam.icKetua.includes(q)
    );
  });

  const topFamily = families.length > 0 ? families[0] : null;

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Kategori Khas
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kedudukan Keluarga Paling Ramai
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kedudukan dikira automatik bersama umur & pecahan ahli keluarga sah dari sheet PESERTA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Sedut data terkini dari Google Sheet"
          >
            <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Menyedut...' : 'Sedut Data Sheet'}</span>
          </button>

          <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            Jumlah Keluarga: <span className="font-bold text-slate-900">{families.length}</span>
          </div>
        </div>
      </div>

      {/* Champion Card */}
      {topFamily ? (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold uppercase tracking-wider">
                <Trophy className="w-3 h-3 text-amber-400" />
                Mendahului Carta
              </span>
              <span className="font-mono text-xs text-slate-400">
                {topFamily.idKeluarga}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {topFamily.namaKetua}
            </h2>
            <div className="text-xs text-slate-400 font-mono">
              IC: {topFamily.icKetua} • Breakdown: {topFamily.breakdown.ketua} Ketua, {topFamily.breakdown.isteri} Isteri, {topFamily.breakdown.anak} Anak
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:px-6 text-center shrink-0 min-w-[120px]">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {topFamily.totalPeserta}
            </div>
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">
              Ahli Berdaftar
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Carta Keluarga Bersedia</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Belum ada keluarga didaftarkan. Pendaftaran keluarga baharu akan dipaparkan secara automatik di sini.
          </p>
        </div>
      )}

      {/* Search Input Bar */}
      {families.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari mengikut ID Keluarga (FAM-XXXX), Nama Ketua atau No. IC..."
            className="w-full px-2 py-1.5 text-xs sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>
      )}

      {/* Leaderboard List */}
      {families.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredFamilies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tiada rekod keluarga dijumpai sepadan dengan carian.
            </div>
          ) : (
            filteredFamilies.map((fam, index) => {
              const isExpanded = expandedFamId === fam.idKeluarga;
              const rank = index + 1;

              return (
                <div key={fam.idKeluarga} className="transition-colors">
                  <div
                    onClick={() => setExpandedFamId(isExpanded ? null : fam.idKeluarga)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                          rank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                            : rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : rank === 3
                            ? 'bg-slate-100 text-slate-700'
                            : 'text-slate-400 bg-slate-50'
                        }`}
                      >
                        #{rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {fam.namaKetua}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {fam.idKeluarga}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          IC: <span className="font-mono">{fam.icKetua}</span> • {fam.breakdown.ketua} Ketua + {fam.breakdown.isteri} Isteri + {fam.breakdown.anak} Anak
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-bold text-slate-900 font-mono block leading-tight">
                          {fam.totalPeserta}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Ahli
                        </span>
                      </div>

                      <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Member List with Ages */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Susunan Rasmi Ahli Keluarga ({fam.ahliSenarai.length} Orang)
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Susunan: Ketua → Isteri → Anak mengikut umur
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {fam.ahliSenarai.map((ahli) => {
                          const isKetua = ahli.displayRole.startsWith('KETUA');
                          const isIsteri = ahli.displayRole.startsWith('ISTERI');
                          const isAnak = ahli.displayRole.startsWith('ANAK');

                          return (
                            <div
                              key={ahli.idPeserta}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-xs transition-colors ${
                                isKetua
                                  ? 'bg-slate-900 text-white border-slate-800'
                                  : isIsteri
                                  ? 'bg-rose-50/50 text-slate-900 border-rose-200'
                                  : 'bg-white text-slate-900 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isKetua
                                      ? 'bg-slate-800 text-amber-300'
                                      : isIsteri
                                      ? 'bg-rose-100 text-rose-600'
                                      : 'bg-sky-100 text-sky-600'
                                  }`}
                                >
                                  {isKetua ? (
                                    <UserCheck className="w-4 h-4" />
                                  ) : isIsteri ? (
                                    <Heart className="w-4 h-4" />
                                  ) : (
                                    <Baby className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span
                                    className={`font-semibold text-xs block truncate ${
                                      isKetua ? 'text-white' : 'text-slate-900'
                                    }`}
                                  >
                                    {ahli.nama}
                                  </span>
                                  <div
                                    className={`flex items-center gap-1.5 text-[10px] font-mono ${
                                      isKetua ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                                  >
                                    <span>{ahli.idPeserta}</span>
                                    <span>•</span>
                                    <span
                                      className={`font-bold font-sans ${
                                        isKetua
                                          ? 'text-amber-300'
                                          : isIsteri
                                          ? 'text-rose-700'
                                          : 'text-sky-700'
                                      }`}
                                    >
                                      {ahli.umur || 0} Tahun
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider font-mono shrink-0 ${
                                  isKetua
                                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                                    : isIsteri
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-sky-100 text-sky-800 border border-sky-200 font-bold'
                                }`}
                              >
                                {ahli.displayRole || (ahli.statusKeluarga === 'KETUA' ? 'KETUA' : ahli.hubunganKetua)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
