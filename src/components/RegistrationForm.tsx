import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  Check, 
  ArrowRight, 
  CreditCard, 
  Phone, 
  RefreshCw, 
  AlertCircle,
  Calendar,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { RegistrationFormData, PesertaRecord } from '../types';
import { registerPesertaApi, searchKetuaKeluargaApi } from '../services/api';
import { parseMalaysianIc, validateChildAgeRelationship } from '../utils/icUtils';

interface RegistrationFormProps {
  onSuccess: (peserta: PesertaRecord) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    nama: '',
    noIc: '',
    noTelefon: '',
    isKeluarga: false,
    statusKeluargaOption: null,
    icKetuaSearch: '',
    ketuaConfirmed: null,
    hubunganKetua: ''
  });

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    namaKetua?: string;
    idKeluarga?: string;
    icKetua?: string;
    umurKetua?: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse Malaysian IC real-time info
  const icInfo = parseMalaysianIc(formData.noIc);

  // Field Handlers
  const handleNamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, nama: e.target.value.toUpperCase() }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numeric digits, exactly max 12
    const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormData(prev => ({ ...prev, noIc: clean }));
    if (errorMsg) setErrorMsg(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numeric digits, max 11
    const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, noTelefon: clean }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleIsKeluargaChange = (isKeluarga: boolean) => {
    setFormData(prev => ({
      ...prev,
      isKeluarga,
      statusKeluargaOption: isKeluarga ? 'KETUA KELUARGA' : null,
      icKetuaSearch: '',
      ketuaConfirmed: null,
      hubunganKetua: ''
    }));
    setLookupAttempted(false);
    setLookupResult(null);
    if (errorMsg) setErrorMsg(null);
  };

  const handleStatusKeluargaChange = (status: 'KETUA KELUARGA' | 'AHLI KELUARGA') => {
    setFormData(prev => ({
      ...prev,
      statusKeluargaOption: status,
      icKetuaSearch: '',
      ketuaConfirmed: null,
      hubunganKetua: ''
    }));
    setLookupAttempted(false);
    setLookupResult(null);
    if (errorMsg) setErrorMsg(null);
  };

  // Ketua Lookup Handler
  const handleSearchKetua = async () => {
    if (formData.icKetuaSearch.length !== 12) {
      setErrorMsg('Sila masukkan 12 digit nombor kad pengenalan Ketua Keluarga.');
      return;
    }

    // Check if user is searching their own IC as Ketua
    if (formData.icKetuaSearch === formData.noIc) {
      setErrorMsg('No. IC Ketua tidak boleh sama dengan No. IC anda sendiri.');
      return;
    }

    setLookupLoading(true);
    setErrorMsg(null);

    try {
      const res = await searchKetuaKeluargaApi(formData.icKetuaSearch);
      setLookupAttempted(true);
      if (res.found && res.namaKetua) {
        setLookupResult({
          found: true,
          namaKetua: res.namaKetua,
          idKeluarga: res.idKeluarga,
          icKetua: res.icKetua,
          umurKetua: res.umurKetua || (parseMalaysianIc(res.icKetua || '')?.age)
        });
        setFormData(prev => ({ ...prev, ketuaConfirmed: null }));
      } else {
        setLookupResult({ found: false });
        setFormData(prev => ({ ...prev, ketuaConfirmed: null }));
      }
    } catch {
      setLookupAttempted(true);
      setLookupResult({ found: false });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmKetua = (confirmed: boolean) => {
    if (confirmed) {
      setFormData(prev => ({ ...prev, ketuaConfirmed: true }));
      setErrorMsg(null);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        ketuaConfirmed: null, 
        icKetuaSearch: '', 
        hubunganKetua: '' 
      }));
      setLookupAttempted(false);
      setLookupResult(null);
    }
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form Validations
    if (!formData.nama.trim() || formData.nama.trim().length < 3) {
      setErrorMsg('Sila masukkan Nama Penuh yang sah (minimum 3 aksara).');
      return;
    }

    if (formData.noIc.length !== 12) {
      setErrorMsg('No. Kad Pengenalan mestilah tepat 12 digit nombor.');
      return;
    }

    if (!icInfo || !icInfo.isValid) {
      setErrorMsg('Format No. Kad Pengenalan tidak sah. Sila semak semula 6 digit tarikh lahir.');
      return;
    }

    if (formData.noTelefon.length < 10) {
      setErrorMsg('No. Telefon mestilah sekurang-kurangnya 10 digit nombor.');
      return;
    }

    if (formData.isKeluarga === null) {
      setErrorMsg('Sila pilih Jenis Pendaftaran (Individu atau Keluarga).');
      return;
    }

    if (formData.isKeluarga === true) {
      if (!formData.statusKeluargaOption) {
        setErrorMsg('Sila pilih Status Dalam Keluarga (Ketua Keluarga atau Ahli Keluarga).');
        return;
      }

      if (formData.statusKeluargaOption === 'AHLI KELUARGA') {
        if (!formData.ketuaConfirmed || !lookupResult?.found) {
          setErrorMsg('Sila buat carian dan sahkan Ketua Keluarga terlebih dahulu.');
          return;
        }

        if (!formData.hubunganKetua) {
          setErrorMsg('Sila pilih hubungan dengan Ketua Keluarga (Isteri atau Anak).');
          return;
        }

        // Anti-Fraud Child Age Check
        if (formData.hubunganKetua === 'ANAK') {
          const parentAge = lookupResult.umurKetua || parseMalaysianIc(lookupResult.icKetua || '')?.age || 40;
          const myAge = icInfo.age;
          const check = validateChildAgeRelationship(parentAge, myAge);
          if (!check.valid) {
            setErrorMsg(check.message || 'Umur tidak munasabah untuk status anak.');
            return;
          }
        }
      }
    }

    setSubmitting(true);

    setTimeout(async () => {
      const result = await registerPesertaApi({
        ...formData,
        umur: icInfo.age
      });
      setSubmitting(false);

      if (result.success && result.data) {
        onSuccess(result.data);
      } else {
        setErrorMsg(result.message || 'Pendaftaran gagal. Sila semak semula maklumat anda.');
      }
    }, 400);
  };

  // Step Calculation
  const isStep1Done = formData.nama.trim().length >= 3 && formData.noIc.length === 12 && formData.noTelefon.length >= 10 && icInfo?.isValid;
  const isStep2Done = formData.isKeluarga !== null;
  const isStep3Done = formData.isKeluarga === false || (formData.isKeluarga === true && (
    formData.statusKeluargaOption === 'KETUA KELUARGA' ||
    (formData.statusKeluargaOption === 'AHLI KELUARGA' && formData.ketuaConfirmed && formData.hubunganKetua)
  ));

  return (
    <div className="w-full">
      {/* Header & Step Bar */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Borang Pendaftaran Peserta
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Isi maklumat di bawah untuk pendaftaran rasmi BRIS WALK.
            </p>
          </div>
          <div className="text-[11px] font-mono text-slate-400 font-medium">
            Format: PES-XXXX / FAM-XXXX
          </div>
        </div>

        {/* Step Progress Line */}
        <div className="flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${isStep1Done ? 'bg-sky-400' : 'bg-slate-700'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${!isStep1Done ? 'bg-slate-800' : isStep2Done ? 'bg-sky-400' : 'bg-slate-700'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${!isStep2Done ? 'bg-slate-800' : isStep3Done ? 'bg-sky-400' : 'bg-slate-700'}`} />
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Error Alert Box */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-950 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Ralat Pendaftaran:</span>
              <span className="font-medium text-rose-900">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Section 1: Maklumat Asas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              01 / Maklumat Asas Peserta
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Wajib diisi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Penuh */}
            <div className="md:col-span-2">
              <label htmlFor="namaInput" className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                Nama Penuh <span className="text-rose-600">*</span>
              </label>
              <input
                id="namaInput"
                type="text"
                required
                value={formData.nama}
                onChange={handleNamaChange}
                placeholder="CONTOH: AHMAD BIN ABDULLAH"
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all uppercase"
              />
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                Nama penuh seperti di dalam Kad Pengenalan / MyKad / MyKid.
              </span>
            </div>

            {/* No. Kad Pengenalan + Auto Age Detection Display */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="icInput" className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  No. Kad Pengenalan <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {formData.noIc.length}/12 digit
                </span>
              </div>
              <div className="relative">
                <input
                  id="icInput"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  required
                  maxLength={12}
                  value={formData.noIc}
                  onChange={handleIcChange}
                  placeholder="Contoh: 880101081234"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-base font-mono font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all"
                />
                <CreditCard className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Realtime Smart Age Badge from IC */}
              {icInfo && icInfo.isValid ? (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <span>Umur: {icInfo.age} Tahun</span>
                        <span className="text-[10px] font-normal text-emerald-700 font-mono">({icInfo.birthDateFormatted})</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Jantina: {icInfo.gender} • Dikira automatik daripada IC
                      </div>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  12 digit nombor tanpa simbol sempang (-). Umur dikesan automatik.
                </span>
              )}
            </div>

            {/* No. Telefon (Numeric Keypad on Mobile) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="phoneInput" className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  No. Telefon <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {formData.noTelefon.length} digit
                </span>
              </div>
              <div className="relative">
                <input
                  id="phoneInput"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel"
                  required
                  maxLength={11}
                  value={formData.noTelefon}
                  onChange={handlePhoneChange}
                  placeholder="Contoh: 0123456789"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-base font-mono font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all"
                />
                <Phone className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                Nombor telefon aktif (10-11 digit). Boleh kongsi nombor yang sama bagi ahli keluarga/anak.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Jenis Pendaftaran */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              02 / Jenis Pendaftaran
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Individu Selection Box */}
            <div
              onClick={() => handleIsKeluargaChange(false)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                formData.isKeluarga === false
                  ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-black uppercase tracking-wide ${formData.isKeluarga === false ? 'text-white' : 'text-slate-950'}`}>
                  Individu
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.isKeluarga === false ? 'border-white bg-white text-slate-950' : 'border-slate-300 bg-white'
                }`}>
                  {formData.isKeluarga === false && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
              <p className={`text-xs ${formData.isKeluarga === false ? 'text-slate-300' : 'text-slate-600'}`}>
                Pendaftaran untuk diri sendiri sahaja tanpa menyertai kategori kumpulan keluarga.
              </p>
            </div>

            {/* Keluarga Selection Box */}
            <div
              onClick={() => handleIsKeluargaChange(true)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                formData.isKeluarga === true
                  ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-black uppercase tracking-wide ${formData.isKeluarga === true ? 'text-white' : 'text-slate-950'}`}>
                  Keluarga
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.isKeluarga === true ? 'border-white bg-white text-slate-950' : 'border-slate-300 bg-white'
                }`}>
                  {formData.isKeluarga === true && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
              <p className={`text-xs ${formData.isKeluarga === true ? 'text-slate-300' : 'text-slate-600'}`}>
                Daftar sebagai Ketua atau Ahli Keluarga untuk merebut anugerah Keluarga Paling Ramai.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Conditional Family Details */}
        {formData.isKeluarga === true && (
          <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                03 / Status Dalam Keluarga
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* KETUA KELUARGA */}
              <div
                onClick={() => handleStatusKeluargaChange('KETUA KELUARGA')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.statusKeluargaOption === 'KETUA KELUARGA'
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className={`w-4 h-4 ${formData.statusKeluargaOption === 'KETUA KELUARGA' ? 'text-white' : 'text-slate-900'}`} />
                    <span className={`text-xs font-black uppercase ${formData.statusKeluargaOption === 'KETUA KELUARGA' ? 'text-white' : 'text-slate-950'}`}>
                      Ketua Keluarga
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.statusKeluargaOption === 'KETUA KELUARGA' ? 'border-white bg-white text-slate-950' : 'border-slate-300 bg-white'
                  }`}>
                    {formData.statusKeluargaOption === 'KETUA KELUARGA' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <p className={`text-xs ${formData.statusKeluargaOption === 'KETUA KELUARGA' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Mencipta ID Keluarga baharu (FAM-XXXX) secara automatik.
                </p>
              </div>

              {/* AHLI KELUARGA */}
              <div
                onClick={() => handleStatusKeluargaChange('AHLI KELUARGA')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.statusKeluargaOption === 'AHLI KELUARGA'
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Users className={`w-4 h-4 ${formData.statusKeluargaOption === 'AHLI KELUARGA' ? 'text-white' : 'text-slate-900'}`} />
                    <span className={`text-xs font-black uppercase ${formData.statusKeluargaOption === 'AHLI KELUARGA' ? 'text-white' : 'text-slate-950'}`}>
                      Ahli Keluarga
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.statusKeluargaOption === 'AHLI KELUARGA' ? 'border-white bg-white text-slate-950' : 'border-slate-300 bg-white'
                  }`}>
                    {formData.statusKeluargaOption === 'AHLI KELUARGA' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <p className={`text-xs ${formData.statusKeluargaOption === 'AHLI KELUARGA' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Daftar sebagai Isteri atau Anak di bawah Ketua Keluarga yang telah berdaftar.
                </p>
              </div>
            </div>

            {/* AHLI KELUARGA: Lookup & Relationship Block */}
            {formData.statusKeluargaOption === 'AHLI KELUARGA' && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150">
                <div>
                  <label htmlFor="icKetuaInput" className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                    No. Kad Pengenalan Ketua Keluarga <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="icKetuaInput"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      value={formData.icKetuaSearch}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setFormData(prev => ({ ...prev, icKetuaSearch: val, ketuaConfirmed: null }));
                        setLookupAttempted(false);
                        setLookupResult(null);
                      }}
                      placeholder="Masukkan 12 digit IC Ketua"
                      className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-mono font-bold text-slate-950 focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                    />
                    <button
                      type="button"
                      disabled={lookupLoading || formData.icKetuaSearch.length !== 12}
                      onClick={handleSearchKetua}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {lookupLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>Cari Ketua</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                    Carian automatik dalam pangkalan data ketua keluarga yang telah mendaftar.
                  </span>
                </div>

                {/* Lookup State: Found */}
                {lookupAttempted && lookupResult?.found && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border-2 border-emerald-500 shadow-xs">
                    <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Ketua Keluarga Dijumpai:
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                      <div>
                        <span className="font-extrabold text-slate-950 text-sm block">
                          {lookupResult.namaKetua}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-xs text-slate-600 font-mono font-bold">
                            ID KELUARGA: {lookupResult.idKeluarga}
                          </span>
                          {typeof lookupResult.umurKetua === 'number' && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              Umur Ketua: {lookupResult.umurKetua} Tahun
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {formData.ketuaConfirmed === true ? (
                          <span className="text-emerald-800 text-xs font-bold bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300 inline-flex items-center gap-1">
                            ✓ DISAHKAN
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmKetua(true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              ✓ Ya, Betul
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmKetua(false)}
                              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                            >
                              Bukan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Relationship Dropdown with Live Anti-Fraud Age Check */}
                    {formData.ketuaConfirmed === true && (
                      <div className="space-y-2 pt-2 animate-in fade-in duration-150">
                        <label htmlFor="hubunganSelect" className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                          Hubungan Dengan Ketua Keluarga <span className="text-rose-600">*</span>
                        </label>
                        <select
                          id="hubunganSelect"
                          required
                          value={formData.hubunganKetua}
                          onChange={(e) => setFormData(prev => ({ ...prev, hubunganKetua: e.target.value as 'ISTERI' | 'ANAK' }))}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-950 focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                        >
                          <option value="">-- Sila Pilih Hubungan --</option>
                          <option value="ISTERI">ISTERI</option>
                          <option value="ANAK">ANAK</option>
                        </select>

                        {/* Visual Helper on Age Comparison */}
                        {formData.hubunganKetua === 'ANAK' && icInfo && lookupResult.umurKetua && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-950 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                              <span>Semakan Umur: <strong>Ketua ({lookupResult.umurKetua} thn)</strong> & <strong>Anak ({icInfo.age} thn)</strong></span>
                            </div>
                            <span className="font-bold font-mono text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                              Beza {lookupResult.umurKetua - icInfo.age} Thn
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Lookup State: Not Found */}
                {lookupAttempted && !lookupResult?.found && (
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 text-rose-950 text-xs space-y-1 animate-in fade-in duration-150">
                    <span className="font-bold text-rose-900 block">Ketua keluarga belum berdaftar.</span>
                    <p className="text-rose-800 font-medium">
                      Sila minta ketua keluarga membuat pendaftaran terlebih dahulu sebelum anda mendaftar sebagai ahli keluarga.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Mengesahkan & Menyimpan...</span>
              </>
            ) : (
              <>
                <span>Hantar Pendaftaran Sekarang</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
