import React, { useState } from 'react';
import {
  User,
  CreditCard,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Footprints,
  CloudCheck,
  CloudOff,
} from 'lucide-react';
import { Participant } from '../types';

interface RegistrationFormProps {
  onSubmit: (participantData: { nama: string; noKp: string; noTel: string }) => Promise<void>;
  isSubmitting: boolean;
  hasSheetConfigured: boolean;
  onOpenSettings: () => void;
  participants: Participant[];
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSubmit,
  isSubmitting,
  hasSheetConfigured,
  onOpenSettings,
  participants,
}) => {
  const [nama, setNama] = useState('');
  const [noKp, setNoKp] = useState('');
  const [noTel, setNoTel] = useState('');

  // Error states
  const [errors, setErrors] = useState<{
    nama?: string;
    noKp?: string;
    noTel?: string;
  }>({});

  // Real-time uppercase handler for Nama
  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically convert to uppercase as per user requirement
    const value = e.target.value.toUpperCase();
    setNama(value);
    if (errors.nama) {
      setErrors((prev) => ({ ...prev, nama: undefined }));
    }
  };

  // Check for duplicate IC in existing participants
  const duplicateParticipant =
    noKp.length === 12
      ? participants.find(
          (p) => p.noKp.replace(/\D/g, '') === noKp.replace(/\D/g, '')
        )
      : undefined;
  const isDuplicateKp = Boolean(duplicateParticipant);

  // Real-time 12-digit numbers-only handler for No Kad Pengenalan
  const handleNoKpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers, max 12 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
    setNoKp(cleaned);
    if (errors.noKp) {
      setErrors((prev) => ({ ...prev, noKp: undefined }));
    }
  };

  // Real-time 10 or 11 digit numbers-only handler for No Telefon
  const handleNoTelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers, max 11 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
    setNoTel(cleaned);
    if (errors.noTel) {
      setErrors((prev) => ({ ...prev, noTel: undefined }));
    }
  };

  // Helper format for Malaysian IC preview (e.g. 900101-01-5555)
  const formatIcPreview = (val: string) => {
    if (!val) return '';
    if (val.length <= 6) return val;
    if (val.length <= 8) return `${val.slice(0, 6)}-${val.slice(6)}`;
    return `${val.slice(0, 6)}-${val.slice(6, 8)}-${val.slice(8, 12)}`;
  };

  // Helper format for Phone preview
  const formatPhonePreview = (val: string) => {
    if (!val) return '';
    if (val.startsWith('011')) {
      if (val.length <= 3) return val;
      if (val.length <= 7) return `${val.slice(0, 3)}-${val.slice(3)}`;
      return `${val.slice(0, 3)}-${val.slice(3, 7)} ${val.slice(7)}`;
    } else {
      if (val.length <= 3) return val;
      if (val.length <= 6) return `${val.slice(0, 3)}-${val.slice(3)}`;
      return `${val.slice(0, 3)}-${val.slice(3, 6)} ${val.slice(6)}`;
    }
  };

  const validate = (): boolean => {
    const newErrors: { nama?: string; noKp?: string; noTel?: string } = {};

    // Validate Nama
    if (!nama.trim()) {
      newErrors.nama = 'Sila masukkan nama penuh anda.';
    } else if (nama.trim().length < 3) {
      newErrors.nama = 'Nama mesti sekurang-kurangnya 3 aksara.';
    }

    // Validate No KP (exact 12 digits numeric only)
    if (!noKp) {
      newErrors.noKp = 'Sila masukkan Nombor Kad Pengenalan.';
    } else if (noKp.length !== 12) {
      newErrors.noKp = `Nombor Kad Pengenalan mesti tepat 12 digit (Kini: ${noKp.length} digit).`;
    } else if (isDuplicateKp && duplicateParticipant) {
      newErrors.noKp = `No. Kad Pengenalan ini telah pun didaftarkan oleh "${duplicateParticipant.nama}". Satu Kad Pengenalan untuk 1 penyertaan sahaja.`;
    }

    // Validate No Tel (10 or 11 digits numeric only)
    if (!noTel) {
      newErrors.noTel = 'Sila masukkan Nombor Telefon.';
    } else if (noTel.length < 10 || noTel.length > 11) {
      newErrors.noTel = `Nombor Telefon mestilah 10 atau 11 digit sahaja (Kini: ${noTel.length} digit).`;
    } else if (!noTel.startsWith('0')) {
      newErrors.noTel = 'Nombor telefon hendaklah bermula dengan angka 0 (cth: 012...)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    await onSubmit({
      nama: nama.trim(),
      noKp,
      noTel,
    });

    // Reset fields on success
    setNama('');
    setNoKp('');
    setNoTel('');
    setErrors({});
  };

  const isKpComplete = noKp.length === 12;
  const isTelComplete = noTel.length === 10 || noTel.length === 11;
  const isNamaValid = nama.trim().length >= 3;

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
      {/* Banner / Card Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-6 sm:px-8 sm:py-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
            <Footprints className="w-7 h-7 text-emerald-100" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-200">
              Pendaftaran Rasmi
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Borang Pendaftaran Peserta
            </h2>
          </div>
        </div>
        <p className="text-emerald-100 text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
          Sila lengkapkan maklumat diri anda di bawah. Maklumat akan terus disimpan ke pangkalan data Google Sheets.
        </p>

        {/* Form Status Info */}
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            {hasSheetConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-white font-medium border border-emerald-300/30">
                <CloudCheck className="w-4 h-4 text-emerald-200" />
                Sistem Dalam Talian (Google Sheets Aktif)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white font-medium border border-white/30">
                <CloudCheck className="w-4 h-4 text-emerald-200" />
                Sistem Pendaftaran Sedia Digunakan
              </span>
            )}
          </div>
          <span className="text-emerald-100/90 font-medium">
            * Semua medan di bawah adalah wajib
          </span>
        </div>
      </div>

      {/* The Main Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 md:p-10 space-y-7 sm:space-y-8" noValidate>
        {/* Field 1: NAMA PENUH */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="field-nama"
              className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800"
            >
              <User className="w-5 h-5 text-emerald-600" />
              Nama Penuh
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              Automatik Huruf Besar
            </span>
          </div>

          <div className="relative">
            <input
              id="field-nama"
              type="text"
              required
              value={nama}
              onChange={handleNamaChange}
              placeholder="CONTOH: MOHD AIMAN BIN ISMAIL"
              autoComplete="name"
              className={`w-full py-4 px-4 sm:py-5 sm:px-5 rounded-2xl border-2 text-lg sm:text-xl font-bold uppercase tracking-wide transition-all outline-none ${
                errors.nama
                  ? 'border-rose-500 bg-rose-50/40 focus:ring-4 focus:ring-rose-500/20'
                  : isNamaValid
                  ? 'border-emerald-500 bg-emerald-50/20 focus:ring-4 focus:ring-emerald-500/20'
                  : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20'
              }`}
            />
            {isNamaValid && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>

          {errors.nama ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 mt-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.nama}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">
              Sila taip nama seperti di dalam Kad Pengenalan (MyKad).
            </p>
          )}
        </div>

        {/* Field 2: NO KAD PENGENALAN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="field-nokp"
              className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800"
            >
              <CreditCard className="w-5 h-5 text-emerald-600" />
              No. Kad Pengenalan (MyKad)
              <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md transition-colors ${
                isDuplicateKp
                  ? 'bg-rose-100 text-rose-800'
                  : isKpComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : noKp.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isDuplicateKp ? 'Telah Didaftarkan' : `${noKp.length} / 12 Digit (Nombor Sahaja)`}
            </span>
          </div>

          <div className="relative">
            <input
              id="field-nokp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              required
              value={noKp}
              onChange={handleNoKpChange}
              placeholder="Contoh: 900101015555"
              className={`w-full py-4 px-4 sm:py-5 sm:px-5 rounded-2xl border-2 text-lg sm:text-xl font-bold tracking-wider transition-all outline-none font-mono ${
                isDuplicateKp
                  ? 'border-rose-500 bg-rose-50/60 focus:ring-4 focus:ring-rose-500/20 text-rose-950'
                  : errors.noKp
                  ? 'border-rose-500 bg-rose-50/40 focus:ring-4 focus:ring-rose-500/20'
                  : isKpComplete
                  ? 'border-emerald-500 bg-emerald-50/20 focus:ring-4 focus:ring-emerald-500/20'
                  : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20'
              }`}
            />
            {isDuplicateKp ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            ) : isKpComplete ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : null}
          </div>

          {/* Formatted IC Visual Helper & Error Display */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm">
            {errors.noKp ? (
              <p className="flex items-center gap-1.5 font-semibold text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.noKp}
              </p>
            ) : isDuplicateKp ? (
              <p className="flex items-center gap-1.5 font-bold text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Nombor Kad Pengenalan ini telah didaftarkan sebelum ini!
              </p>
            ) : (
              <p className="text-slate-500">
                Hanya 12 angka nombor tanpa tanda sempang (-) atau aksara lain.
              </p>
            )}

            {noKp.length > 0 && (
              <div className="font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold self-start sm:self-auto">
                Format: <span className={isDuplicateKp ? 'text-rose-700' : 'text-emerald-700'}>{formatIcPreview(noKp)}</span>
              </div>
            )}
          </div>

          {/* Prominent Duplicate Warning Box */}
          {isDuplicateKp && duplicateParticipant && (
            <div className="mt-2 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
              <div className="p-1 bg-rose-200 text-rose-800 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-rose-950 text-sm">
                  Penyertaan Ditolak: No. Kad Pengenalan Bertindih
                </p>
                <p className="text-rose-800 leading-relaxed">
                  Peserta atas nama <strong className="font-bold underline text-rose-950">{duplicateParticipant.nama}</strong> telah menggunakan No. Kad Pengenalan ini ({formatIcPreview(duplicateParticipant.noKp)}). 
                  Peraturan program menetapkan <strong>1 Kad Pengenalan hanya untuk 1 penyertaan sahaja</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Field 3: NO TELEFON */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="field-notel"
              className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800"
            >
              <Phone className="w-5 h-5 text-emerald-600" />
              No. Telefon
              <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md transition-colors ${
                isTelComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : noTel.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {noTel.length} / 10-11 Digit (Nombor Sahaja)
            </span>
          </div>

          <div className="relative">
            <input
              id="field-notel"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={11}
              required
              value={noTel}
              onChange={handleNoTelChange}
              placeholder="Contoh: 0123456789 atau 01112345678"
              autoComplete="tel"
              className={`w-full py-4 px-4 sm:py-5 sm:px-5 rounded-2xl border-2 text-lg sm:text-xl font-bold tracking-wider transition-all outline-none font-mono ${
                errors.noTel
                  ? 'border-rose-500 bg-rose-50/40 focus:ring-4 focus:ring-rose-500/20'
                  : isTelComplete
                  ? 'border-emerald-500 bg-emerald-50/20 focus:ring-4 focus:ring-emerald-500/20'
                  : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20'
              }`}
            />
            {isTelComplete && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Formatted Phone Visual Helper & Error Display */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm">
            {errors.noTel ? (
              <p className="flex items-center gap-1.5 font-semibold text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.noTel}
              </p>
            ) : (
              <p className="text-slate-500">
                Masukkan 10 atau 11 angka nombor telefon (cth: 012... atau 011...).
              </p>
            )}

            {noTel.length > 0 && (
              <div className="font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold self-start sm:self-auto">
                Pratonton: <span className="text-emerald-700">{formatPhonePreview(noTel)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: SUBMIT */}
        <div className="pt-3">
          <button
            type="submit"
            id="btn-submit-registration"
            disabled={isSubmitting || isDuplicateKp}
            className={`w-full py-5 px-6 sm:py-6 sm:px-8 rounded-2xl font-black text-lg sm:text-xl text-white shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : isDuplicateKp
                ? 'bg-rose-600 cursor-not-allowed opacity-90 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-700/25 hover:shadow-emerald-700/40'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>SEDANG MENYIMPAN KE GOOGLE SHEETS...</span>
              </>
            ) : isDuplicateKp ? (
              <>
                <AlertCircle className="w-6 h-6" />
                <span>NO. KP TELAH DIDAFTARKAN (1 PENYERTAAN SAHAJA)</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>HANTAR PENDAFTARAN (SUBMIT)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
