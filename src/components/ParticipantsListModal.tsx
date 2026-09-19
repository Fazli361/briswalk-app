import React, { useState } from 'react';
import {
  X,
  Users,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Participant } from '../types';

interface ParticipantsListModalProps {
  participants: Participant[];
  onClose: () => void;
  onExportCsv: () => void;
  onSyncAll: () => Promise<void>;
  onDelete: (id: string) => void;
  isSyncing: boolean;
  hasSheetConfigured: boolean;
  onOpenSettings: () => void;
}

export const ParticipantsListModal: React.FC<ParticipantsListModalProps> = ({
  participants,
  onClose,
  onExportCsv,
  onSyncAll,
  onDelete,
  isSyncing,
  hasSheetConfigured,
  onOpenSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = participants.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      p.nama.toLowerCase().includes(term) ||
      p.noKp.includes(term) ||
      p.noTel.includes(term)
    );
  });

  const unsyncedCount = participants.filter((p) => !p.syncedToSheet).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Senarai Peserta Briskwalk</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  {participants.length} Orang
                </span>
              </div>
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

        {/* Action Bar: Search & Export & Sync */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, No KP, No Tel..."
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {unsyncedCount > 0 && (
              <button
                type="button"
                onClick={hasSheetConfigured ? onSyncAll : onOpenSettings}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Hantar ke Sheet ({unsyncedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExportCsv}
              disabled={participants.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {participants.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-base text-slate-600">Belum ada peserta yang berdaftar.</p>
              <p className="text-xs text-slate-400 mt-1">
                Data pendaftaran akan dipaparkan di sini sebaik sahaja peserta mengisi borang.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600">
                Tiada padanan untuk carian "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">Nama Penuh</th>
                    <th className="py-3 px-4">No. Kad Pengenalan</th>
                    <th className="py-3 px-4">No. Telefon</th>
                    <th className="py-3 px-4">Masa Daftar</th>
                    <th className="py-3 px-4">Status Sheet</th>
                    <th className="py-3 px-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                        {p.nama}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {p.noKp.length === 12
                          ? `${p.noKp.slice(0, 6)}-${p.noKp.slice(6, 8)}-${p.noKp.slice(8)}`
                          : p.noKp}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {p.noTel}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(p.timestamp).toLocaleDateString('ms-MY', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {p.syncedToSheet ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Disimpan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Tempatan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Padam rekod pendaftaran untuk ${p.nama}?`)) {
                              onDelete(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Padam rekod"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Jumlah {participants.length} rekod disimpan secara selamat.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 text-sm cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
