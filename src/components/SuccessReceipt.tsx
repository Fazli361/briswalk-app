import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Copy, Printer, Plus, Database, Calendar } from 'lucide-react';
import { PesertaRecord } from '../types';

interface SuccessReceiptProps {
  peserta: PesertaRecord;
  onRegisterAgain: () => void;
  onViewLeaderboard: () => void;
}

export const SuccessReceipt: React.FC<SuccessReceiptProps> = ({
  peserta,
  onRegisterAgain
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  }, []);

  const handleCopySummary = () => {
    let text = `PENDAFTARAN BERJAYA - BRIS WALK\n`;
    text += `Nama: ${peserta.nama}\n`;
    text += `No. IC: ${peserta.noIc}\n`;
    text += `Umur: ${peserta.umur || 0} Tahun\n`;
    text += `ID Peserta: ${peserta.idPeserta}\n`;
    if (peserta.jenisPendaftaran === 'KELUARGA') {
      text += `Status: ${peserta.statusKeluarga === 'KETUA' ? 'KETUA KELUARGA' : 'AHLI KELUARGA'}\n`;
      text += `Nama Ketua: ${peserta.namaKetuaKeluarga || peserta.nama}\n`;
      text += `ID Keluarga: ${peserta.idKeluarga}\n`;
      if (peserta.hubunganKetua && peserta.hubunganKetua !== 'KETUA') {
        text += `Hubungan: ${peserta.hubunganKetua}\n`;
      }
    } else {
      text += `Jenis: PENDAFTARAN INDIVIDU\n`;
    }
    text += `Tarikh: ${peserta.tarikhDaftar}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isKeluarga = peserta.jenisPendaftaran === 'KELUARGA';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Header Notification */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Pendaftaran Disahkan
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                <Database className="w-3 h-3 text-sky-600" />
                Disimpan ke Google Sheet
              </span>
              <span className="text-xs text-slate-500 font-mono font-semibold">
                {peserta.tarikhDaftar}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
              Slip Pengesahan Rasmi
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              ID Peserta Rasmi
            </span>
            <span className="text-2xl font-black font-mono text-slate-950 bg-slate-100 px-4 py-1.5 rounded-2xl inline-block mt-1 border-2 border-slate-200">
              {peserta.idPeserta}
            </span>
          </div>
        </div>

        {/* Structured Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              Nama Peserta
            </span>
            <span className="text-base font-black text-slate-950 block mt-1">
              {peserta.nama}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              No. IC & Umur
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-black font-mono text-slate-950">
                {peserta.noIc}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {peserta.umur || 0} Tahun
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              Jenis Pendaftaran
            </span>
            <span className="text-base font-black text-slate-950 block mt-1">
              {isKeluarga ? 'Keluarga' : 'Individu'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              No. Telefon
            </span>
            <span className="text-base font-black font-mono text-slate-950 block mt-1">
              {peserta.noTelefon}
            </span>
          </div>

          {isKeluarga && (
            <>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Status Keluarga & ID
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-black text-slate-950 font-mono">
                    {peserta.idKeluarga}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-white">
                    {peserta.statusKeluarga === 'KETUA' ? 'KETUA KELUARGA' : `AHLI (${peserta.hubunganKetua})`}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Nama Ketua Keluarga
                </span>
                <span className="text-base font-black text-slate-950 block mt-1">
                  {peserta.namaKetuaKeluarga || peserta.nama}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Minimal Actions Row */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleCopySummary}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Telah Disalin!' : 'Salin Maklumat'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Slip</span>
          </button>

          <button
            onClick={onRegisterAgain}
            className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Daftar Peserta Lain</span>
          </button>
        </div>
      </div>
    </div>
  );
};
