import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Info,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SheetConfig } from '../types';
import { DEFAULT_SHEET_URL } from '../services/sheetService';

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
  const [url, setUrl] = useState(config.sheetUrl || '');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const sampleAppsScript = `// Skrip Google Apps Script untuk Borang Pendaftaran Briskwalk PPKK
// 1. Di Google Sheets, klik "Extensions" (Sambungan) > "Apps Script"
// 2. Padam kod sedia ada, tampal kod di bawah, dan klik Save (ikon disket)
// 3. Klik "Deploy" (Gunakan) > "New deployment" > jenis "Web app"
// 4. Pilih "Execute as: Me" dan "Who has access: Anyone" (Sesiapa sahaja)
// 5. Salin Web App URL tersebut dan tampal dalam aplikasi ini!

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();

    // Jika baris pertama kosong, sediakan tajuk kolum
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Tarikh & Masa", "Nama Penuh", "No. Kad Pengenalan", "No. Telefon", "ID Pendaftaran"]);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#d1fae5");
    }

    var nama = e.parameter.nama || "";
    var noKp = e.parameter.noKp || "";
    var noTel = e.parameter.noTel || "";
    var tarikhMasa = e.parameter.tarikhMasa || new Date().toLocaleString("ms-MY");
    var id = e.parameter.id || "";

    // PERIKSA DUPLIKASI NO. KAD PENGENALAN (1 KP = 1 PENYERTAAN SAHAJA)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1 && noKp) {
      var existingKps = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      var cleanNewKp = String(noKp).replace(/\D/g, "");
      for (var i = 0; i < existingKps.length; i++) {
        var existingKp = String(existingKps[i][0]).replace(/\D/g, "");
        if (existingKp && existingKp === cleanNewKp) {
          return ContentService
            .createTextOutput(JSON.stringify({
              result: "duplicate",
              message: "No. Kad Pengenalan ini telah berdaftar dalam Google Sheet."
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Simpan ke baris baharu (awalan ' supaya nombor bermula 0 kekal)
    sheet.appendRow([tarikhMasa, nama, "'" + noKp, "'" + noTel, id]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", nama: nama }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(sampleAppsScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      sheetUrl: url.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Tetapan Google Sheet</h3>
              <p className="text-xs text-slate-400 font-medium">
                Pautkan borang pendaftaran terus ke hamparan Google Sheets anda
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

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {/* Status info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Simpan Automatik:</span> Setiap kali peserta menekan butang{' '}
              <strong className="font-extrabold text-emerald-800">Submit</strong>, maklumat (Nama, No.
              KP, dan No. Tel) akan terus dihantar dan ditambah sebagai baris baharu dalam Google Sheet anda.
            </div>
          </div>

          {/* Form to enter Sheet URL */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="sheet-url-input"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                Pautan (URL) Google Sheets Web App / Apps Script
              </label>
              <input
                id="sheet-url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 text-sm font-mono text-slate-800 outline-none transition"
              />
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <p>
                  URL Web App Google Apps Script (berakhir dengan{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-semibold">
                    /exec
                  </code>
                  ).
                </p>
                {url !== DEFAULT_SHEET_URL && (
                  <button
                    type="button"
                    onClick={() => setUrl(DEFAULT_SHEET_URL)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold underline shrink-0 cursor-pointer"
                  >
                    Guna URL Rasmi Lalai
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                {showGuide ? 'Tutup Panduan Cara Sambung' : 'Lihat Cara Sambung Google Sheet (Mudah 2 Minit)'}
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Disimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Tetapan</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Guide Section */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Langkah Menghubungkan Google Sheet (Percuma & Pantas)
            </h4>

            <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal list-inside pl-1 font-medium">
              <li className="leading-relaxed">
                Buka Google Sheets baharu di{' '}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold underline inline-flex items-center gap-1"
                >
                  sheets.new <ExternalLink className="w-3 h-3" />
                </a>{' '}
                dan namakan fail contohnya:{' '}
                <span className="font-semibold text-slate-800">
                  "Pendaftaran Briskwalk Panel Penasihat KK"
                </span>
                .
              </li>
              <li className="leading-relaxed">
                Pada menu atas Google Sheet, klik menu{' '}
                <span className="font-bold text-slate-800">Extensions</span> (Sambungan) &gt;{' '}
                <span className="font-bold text-slate-800">Apps Script</span>.
              </li>
              <li className="leading-relaxed">
                Padam semua kod di dalamnya, kemudian tekan butang di bawah untuk{' '}
                <span className="font-bold text-slate-800">Salin Kod Skrip</span> dan tampal di Apps Script.
              </li>
              <li className="leading-relaxed">
                Klik butang biru <span className="font-bold text-slate-800">Deploy</span> (Gunakan) &gt;{' '}
                <span className="font-bold text-slate-800">New deployment</span>.
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-500">
                  <li>Pilih jenis (roda gear): <strong>Web app</strong></li>
                  <li>Execute as: <strong>Me (akaun anda)</strong></li>
                  <li>Who has access: <strong>Anyone (Sesiapa sahaja)</strong></li>
                </ul>
              </li>
              <li className="leading-relaxed">
                Tekan <strong>Deploy</strong>, berikan kebenaran (Authorize Access), dan salin URL Web App yang tertera ke dalam ruangan di atas!
              </li>
            </ol>

            {/* Code Box with Copy Button */}
            <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">Google Apps Script (Code.gs)</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Berjaya Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kod Skrip</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[11px] sm:text-xs font-mono overflow-x-auto pt-3 text-emerald-300/90 leading-relaxed max-h-48">
                {sampleAppsScript}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
