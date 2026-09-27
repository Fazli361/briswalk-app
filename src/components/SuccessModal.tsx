import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, User, CreditCard, Phone, Calendar, ArrowRight, Share2, Printer } from 'lucide-react';
import { Participant } from '../types';

interface SuccessModalProps {
  participant: Participant | null;
  onClose: () => void;
  syncedToSheet: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  participant,
  onClose,
  syncedToSheet,
}) => {
  useEffect(() => {
    if (participant) {
      // Fire celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback if canvas is not available
      }
    }
  }, [participant]);

  if (!participant) return null;

  const formatIc = (val: string) => {
    if (val.length === 12) {
      return `${val.slice(0, 6)}-${val.slice(6, 8)}-${val.slice(8, 12)}`;
    }
    return val;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Pengesahan Pendaftaran Program Briskwalk',
          text: `Pendaftaran Berjaya: ${participant.nama} bagi Program Briskwalk Panel Penasihat Klinik Kesihatan.`,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Pengesahan Pendaftaran Program Briskwalk PPKK\nNama: ${participant.nama}\nNo KP: ${participant.noKp}\nNo Tel: ${participant.noTel}\nTarikh: ${new Date(
          participant.timestamp
        ).toLocaleString('ms-MY')}`
      );
      alert('Maklumat pendaftaran disalin ke papan keratan (clipboard)!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-emerald-600 px-6 py-6 sm:px-8 sm:py-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pendaftaran Berjaya!
          </h3>
          <p className="text-emerald-100 text-sm sm:text-base mt-1 font-medium">
            Terima kasih, data anda telah direkodkan.
          </p>

          {syncedToSheet ? (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-700/80 text-emerald-100 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              Tersimpan Terus ke Google Sheets
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600/80 text-amber-100 border border-amber-300/30">
              <span className="w-2 h-2 rounded-full bg-amber-300"></span>
              Disimpan Selamat di Sistem Tempatan
            </div>
          )}
        </div>

        {/* Participant Receipt Card */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2 flex justify-between items-center">
              <span>Slip Pendaftaran Peserta</span>
              <span className="font-mono text-slate-500">ID: #{participant.id.slice(0, 8)}</span>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500 font-semibold">Nama Penuh:</div>
                <div className="text-base sm:text-lg font-black text-slate-900 uppercase">
                  {participant.nama}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500 font-semibold">No. Kad Pengenalan:</div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {formatIc(participant.noKp)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500 font-semibold">No. Telefon:</div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {participant.noTel}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1 border-t border-slate-200/80">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500">
                Masa Daftar: {new Date(participant.timestamp).toLocaleString('ms-MY')}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
              Salin / Kongsi
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Cetak Slip
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <span>Daftar Peserta Seterusnya</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
