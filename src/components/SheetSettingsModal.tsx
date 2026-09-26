import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertTriangle,
  Users,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { SheetConfig } from '../types';
import {
  DEFAULT_SHEET_URL,
  fetchParticipantsFromSheet,
} from '../services/sheetService';

interface SheetSettingsModalProps {
  config: SheetConfig;
  onSave: (newConfig: SheetConfig) => void;
  onClose: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl || '');
  const [scriptUrl, setScriptUrl] = useState(
    config.scriptUrl || config.sheetUrl || DEFAULT_SHEET_URL
  );
  const [maxParticipants, setMaxParticipants] = useState<number>(
    config.maxParticipants && config.maxParticipants > 0 ? config.maxParticipants : 100
  );
  const [limitEnabled, setLimitEnabled] = useState<boolean>(config.limitEnabled ?? true);

  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Validation helpers
  const isSpreadsheetPastedInScript = scriptUrl.includes('docs.google.com/spreadsheets');
  const isScriptPastedInSpreadsheet = spreadsheetUrl.includes('script.google.com');

  const sampleAppsScript = `// ====================================================================
// SKRIP GOOGLE APPS SCRIPT - BORANG PENDAFTARAN BRISKWALK PPKK
// ====================================================================
// PANDUAN PENTING:
// 1. Buka Google Sheets anda > Klik Extensions > Apps Script
// 2. Padam SEMUA kod yang ada > Tampal kod ini > Tekan butang Simpan (Disket)
// 3. Klik "Deploy" (butang biru atas kanan) > "New deployment"
// 4. Pilih Jenis: "Web app"
// 5. Execute as: "Me"
// 6. Who has access: "Anyone" (SANGAT PENTING: Pilih "Anyone"!)
// 7. Klik "Deploy", klik "Authorize access" dan salin Web App URL ke aplikasi!

function doPost(e) {
  return handleRegistration(e);
}

function doGet(e) {
  // Jika dibuka untuk baca data pendaftaran (segerak ke app)
  if (e && e.parameter && e.parameter.action === 'read') {
    return readParticipants(e);
  }
  // Jika penghantaran menggunakan kaedah GET fallback
  if (e && e.parameter && (e.parameter.nama || e.parameter.id || e.parameter.noKp)) {
    return handleRegistration(e);
  }
  // Paparan status semakan biasa
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "Google Apps Script Web App Briskwalk berfungsi dengan baik!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleRegistration(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {}

  try {
    var data = {};
    // Baca data dari POST body
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {}
    }
    // Baca parameter borang URL-encoded
    if (e && e.parameter) {
      for (var key in e.parameter) {
        if (!data[key]) data[key] = e.parameter[key];
      }
    }

    // Buka Google Sheet (aktif atau melalui URL)
    var doc = null;
    var targetUrl = data.spreadsheetUrl || data.sheetUrl || "";
    if (targetUrl && targetUrl.indexOf("docs.google.com") !== -1) {
      try {
        doc = SpreadsheetApp.openByUrl(targetUrl);
      } catch (e) {
        doc = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      doc = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!doc) {
      throw new Error("Gagal membuka Google Sheet. Pastikan Apps Script ini dicipta di dalam Google Sheet anda.");
    }

    var sheet = doc.getActiveSheet();

    // Sediakan tajuk lajur automatik jika helaian masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Tarikh & Masa", "Nama Penuh", "No. Kad Pengenalan", "No. Telefon", "ID Pendaftaran"]);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#d1fae5").setFontColor("#065f46");
      sheet.setFrozenRows(1);
    }

    var nama = (data.nama || "").toString().trim();
    var noKp = (data.noKp || "").toString().trim();
    var noTel = (data.noTel || "").toString().trim();
    var id = (data.id || "").toString().trim();
    var tarikhMasa = data.tarikhMasa || new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" });

    // Jangan masukkan data jika kosong
    if (!nama && !noKp) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "empty",
        status: "empty",
        message: "Tiada data nama atau KP."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Semakan No. Kad Pengenalan Bertindih (1 KP = 1 Pendaftaran Sahaja)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1 && noKp) {
      var existingKps = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      var cleanNewKp = noKp.replace(/\\D/g, "");
      for (var i = 0; i < existingKps.length; i++) {
        var existingKp = String(existingKps[i][0]).replace(/\\D/g, "");
        if (existingKp && existingKp === cleanNewKp) {
          return ContentService.createTextOutput(JSON.stringify({
            result: "duplicate",
            status: "duplicate",
            message: "No. Kad Pengenalan ini telah berdaftar dalam Google Sheet."
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Masukkan baris pendaftaran ke Google Sheet
    // Tanda petik ' di hadapan noKp & noTel menjamin digit sifar (0) tidak dipadam oleh Sheet
    sheet.appendRow([tarikhMasa, nama, "'" + noKp, "'" + noTel, id]);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      status: "success",
      nama: nama,
      message: "Data peserta berjaya dimasukkan ke Google Sheet"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function readParticipants(e) {
  try {
    var doc = null;
    var targetUrl = (e && e.parameter && (e.parameter.spreadsheetUrl || e.parameter.sheetUrl)) || "";
    if (targetUrl && targetUrl.indexOf("docs.google.com") !== -1) {
      try { doc = SpreadsheetApp.openByUrl(targetUrl); } catch(err) { doc = SpreadsheetApp.getActiveSpreadsheet(); }
    } else {
      doc = SpreadsheetApp.getActiveSpreadsheet();
    }
    if (!doc) throw new Error("Spreadsheet tidak ditemui");

    var sheet = doc.getActiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    var list = [];
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      if (row[1] || row[2]) {
        var rawTime = row[0];
        var formattedTime = "";
        if (rawTime instanceof Date) {
          formattedTime = Utilities.formatDate(rawTime, "Asia/Kuala_Lumpur", "dd/MM/yyyy, hh:mm a");
        } else {
          formattedTime = String(rawTime || "").replace(/^'/, "");
        }
        list.push({
          id: row[4] ? String(row[4]) : ("GS-" + i),
          timestamp: formattedTime || new Date().toISOString(),
          nama: String(row[1] || "").trim(),
          noKp: String(row[2] || "").replace(/'/g, "").trim(),
          noTel: String(row[3] || "").replace(/'/g, "").trim(),
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: list }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(sampleAppsScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSwapUrls = () => {
    const temp = spreadsheetUrl;
    setSpreadsheetUrl(scriptUrl);
    setScriptUrl(temp);
  };

  const handleTestConnection = async () => {
    const trimmedScript = scriptUrl.trim();
    if (!trimmedScript) {
      setTestResult({ success: false, message: 'Sila masukkan URL Web App Apps Script.' });
      return;
    }

    if (trimmedScript.includes('docs.google.com/spreadsheets')) {
      setTestResult({
        success: false,
        message:
          'URL di Kotak 2 ialah pautan Google Sheet, bukan Web App Script. Sila semak semula atau klik butang "Tukar Posisi URL".',
      });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    const res = await fetchParticipantsFromSheet(trimmedScript, spreadsheetUrl.trim());
    setTestLoading(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `Sambungan Berjaya! Web App aktif & bersedia menerima pendaftaran (${res.data?.length ?? 0} rekod dikesan dalam Google Sheet).`,
      });
    } else {
      setTestResult({
        success: false,
        message:
          res.error ||
          'Gagal berhubung. Pastikan anda telah klik "Deploy > New deployment" dan tetapkan "Who has access" kepada "Anyone".',
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      spreadsheetUrl: spreadsheetUrl.trim(),
      scriptUrl: scriptUrl.trim(),
      sheetUrl: scriptUrl.trim(),
      maxParticipants: Number(maxParticipants) > 0 ? Number(maxParticipants) : 100,
      limitEnabled,
      autoSync: config.autoSync ?? true,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Tetapan Pangkalan Data Google Sheet</h3>
              <p className="text-xs text-emerald-200 font-medium">
                Pautan Google Sheet &amp; Web App Script untuk kemasukan penyertaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white rounded-xl hover:bg-emerald-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* Penerangan Jelas: 2 URL Diperlukan */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
              <strong className="font-bold">Cara Penyegerakan Berfungsi:</strong>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-700">
                <li>
                  Data hanya akan dihantar ke Google Sheet <strong>apabila peserta menekan butang SUBMIT</strong>.
                </li>
                <li>
                  Bila pengguna membuka aplikasi, sistem akan <strong>automatik membaca data terkini</strong> dari Google Sheet untuk memaparkan bilangan kuota semasa.
                </li>
                <li>
                  Butang <strong>"Segerak Dari Sheet"</strong> di senarai peserta akan memaparkan senarai sepertimana yang ada dalam Google Sheet.
                </li>
              </ul>
            </div>
          </div>

          {/* Alert jika pengguna tersalah tukar posisi URL */}
          {(isSpreadsheetPastedInScript || isScriptPastedInSpreadsheet) && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Kedudukan Pautan Terbalik Dikesan:</strong> Pautan Google Sheet atau Apps
                  Script berada di kotak yang tidak sepatutnya.
                </div>
              </div>
              <button
                type="button"
                onClick={handleSwapUrls}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shrink-0 cursor-pointer shadow-xs transition"
              >
                Tukar Posisi URL Automatik
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* KOTAK 1: URL Fail Google Sheet */}
            <div className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs space-y-3 transition">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label
                  htmlFor="input-spreadsheet-url"
                  className="block text-sm font-black text-slate-900 flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  URL Fail Google Sheet Anda (docs.google.com)
                </label>

                {spreadsheetUrl.trim() && spreadsheetUrl.includes('docs.google.com') && (
                  <a
                    href={spreadsheetUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Sheet Saya</span>
                  </a>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Salin pautan dari bar carian pelayar semasa anda membuka fail Google Sheet.
              </p>

              <input
                id="input-spreadsheet-url"
                type="url"
                value={spreadsheetUrl}
                onChange={(e) => {
                  setSpreadsheetUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-mono outline-none transition ${
                  isScriptPastedInSpreadsheet
                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                    : 'border-slate-300 focus:border-emerald-600 bg-slate-50 focus:bg-white'
                }`}
              />

              {isScriptPastedInSpreadsheet && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Ini adalah URL Apps Script (script.google.com). Sila letakkannya di Kotak 2 di
                  bawah.
                </p>
              )}
            </div>

            {/* KOTAK 2: URL Web App Google Apps Script */}
            <div className="bg-white border-2 border-emerald-600/40 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label
                  htmlFor="input-script-url"
                  className="block text-sm font-black text-slate-900 flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  URL Web App Google Apps Script (script.google.com)
                </label>

                {scriptUrl !== DEFAULT_SHEET_URL && (
                  <button
                    type="button"
                    onClick={() => {
                      setScriptUrl(DEFAULT_SHEET_URL);
                      setTestResult(null);
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                  >
                    Guna URL Skrip Lalai
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                URL ini dijana selepas anda klik <strong>Deploy &gt; New deployment &gt; Web app</strong>{' '}
                dalam Google Apps Script.
              </p>

              <input
                id="input-script-url"
                type="url"
                value={scriptUrl}
                onChange={(e) => {
                  setScriptUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-mono outline-none transition ${
                  isSpreadsheetPastedInScript
                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                    : 'border-slate-300 focus:border-emerald-600 bg-slate-50 focus:bg-white'
                }`}
              />

              {isSpreadsheetPastedInScript && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Ini adalah URL Google Sheet (docs.google.com). Sila letakkannya di Kotak 1 di
                  atas.
                </p>
              )}

              {/* Butang Ujian Sambungan (Hanya semak status, tidak hantar data palsu) */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Uji status sambungan Web App:
                </span>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testLoading || !scriptUrl.trim() || isSpreadsheetPastedInScript}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {testLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>Menyemak status...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      <span>Uji Sambungan Web App</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Results Display */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* 3. Had Kuota Peserta */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      3. Had Kuota Peserta (Maksimum)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Borang akan dikunci automatik bila kuota peserta penuh
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={limitEnabled}
                    onChange={(e) => setLimitEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {limitEnabled && (
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      id="max-participants-input"
                      type="number"
                      min="1"
                      max="10000"
                      value={maxParticipants}
                      onChange={(e) =>
                        setMaxParticipants(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-28 px-3.5 py-2 rounded-xl border-2 border-slate-300 focus:border-emerald-600 text-base font-black text-slate-900 outline-none"
                    />
                    <span className="text-xs text-slate-700 font-extrabold">orang peserta</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">Pilihan Pantas:</span>
                    {[50, 100, 150, 200, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMaxParticipants(preset)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          maxParticipants === preset
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset} {preset === 100 ? 'Orang (Lalai)' : 'Orang'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Butang Simpan Tetapan */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition cursor-pointer active:scale-95"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Tetapan Berjaya Disimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>SIMPAN TETAPAN DATABASE</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Panduan Lengkap & Skrip Google Apps Script */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Kod Google Apps Script &amp; Panduan 3 Langkah
                </h4>
                <p className="text-xs text-slate-500">
                  Pastikan kod ini berada dalam Apps Script Google Sheet anda:
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kod Berjaya Disalin!' : 'Salin Semua Kod Skrip'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                  1
                </span>
                <div className="font-bold text-slate-900">Buka Apps Script</div>
                <div className="text-slate-600 leading-relaxed">
                  Buka Google Sheet anda, klik menu <strong>Extensions &gt; Apps Script</strong>.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                  2
                </span>
                <div className="font-bold text-slate-900">Padam &amp; Tampal Kod</div>
                <div className="text-slate-600 leading-relaxed">
                  Padam semua kod asal di Apps Script, tekan butang <strong>"Salin Semua Kod Skrip"</strong> di atas, tampal dan klik Simpan.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-xs">
                  3
                </span>
                <div className="font-bold text-emerald-950">Deploy Web App (PENTING!)</div>
                <div className="text-emerald-900 leading-relaxed">
                  Klik <strong>Deploy &gt; New deployment &gt; Web app</strong>.<br />
                  Wajib pilih: <strong>Who has access: Anyone</strong>.<br />
                  Salin pautan Web App dan tampal di <strong>Kotak 2</strong> di atas!
                </div>
              </div>
            </div>

            {/* Kotak Paparan Skrip */}
            <div className="bg-slate-950 rounded-2xl p-4 text-slate-200 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono text-emerald-400 font-bold">Google Apps Script (Code.gs)</span>
                <span className="text-[11px] text-slate-400">Siap sedia untuk disalin</span>
              </div>
              <pre className="text-[11px] font-mono overflow-x-auto pt-3 text-emerald-300 leading-relaxed max-h-48">
                {sampleAppsScript}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
