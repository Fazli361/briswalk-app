import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Download, Terminal, CheckCircle2, FileCode, Layers, Activity, RefreshCw } from 'lucide-react';
import { CODE_GS_CONTENT, INDEX_HTML_CONTENT, SPREADSHEET_ID, SPREADSHEET_URL, WEB_APP_URL } from '../gasSourceCode';
import { testGoogleSheetConnection } from '../services/api';

export const GasManager: React.FC = () => {
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<'fix' | 'code_gs' | 'index_html'>('fix');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ checked: boolean; connected: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      const res = await testGoogleSheetConnection();
      setTestResult({ checked: true, connected: res.connected, message: res.message });
    } catch {
      setTestResult({ checked: true, connected: false, message: 'Ralat menguji sambungan.' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyCodeGs = () => {
    navigator.clipboard.writeText(CODE_GS_CONTENT);
    setCopiedCodeGs(true);
    setTimeout(() => setCopiedCodeGs(false), 2000);
  };

  const handleCopyIndexHtml = () => {
    navigator.clipboard.writeText(INDEX_HTML_CONTENT);
    setCopiedIndexHtml(true);
    setTimeout(() => setCopiedIndexHtml(false), 2000);
  };

  const handleDownloadCodeGs = () => {
    const element = document.createElement('a');
    const file = new Blob([CODE_GS_CONTENT], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'Code.gs';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadIndexHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([INDEX_HTML_CONTENT], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = 'Index.html';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Panduan & Integrasi Google Apps Script
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Penyelesaian SyntaxError di Google Apps Script
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Format rasmi Google Apps Script: <strong>Code.gs</strong> (Skrip Backend) & <strong>Index.html</strong> (Antaramuka Web).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            <span>Buka Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={WEB_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>Buka Web App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Susunan Lajur Tersasar Diagnostic Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-amber-950">
                Data Tersasar di Google Sheet? (Lajur UMUR Terisi No. Telefon)
              </h2>
              <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded text-[10px] font-bold self-start">
                Auto-Fixer Disediakan
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Punca:</strong> Skrip Web App lama menghantar senarai tanpa nilai <code>UMUR</code>, menyebabkan nilai Nombor Telefon masuk ke Lajur E (UMUR) dan semua maklumat keluarga berganjak 1 petak ke kiri.
            </p>
            <div className="p-3.5 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 space-y-2">
              <p className="font-semibold text-slate-900">
                Cara Baiki 400+ Rekod Sedia Ada Secara Automatik (Dalam 3 Saat):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                <li>Buka Apps Script projek anda di Google Sheet.</li>
                <li>Salin kod <strong>Code.gs</strong> yang terkini di tab di bawah dan tampal ke dalam fail <code>Code.gs</code> anda.</li>
                <li>Di bahagian atas Apps Script, pilih fungsi <strong>betulkanSusunanLajurSheet</strong> dari senarai dropdown fungsi.</li>
                <li>Klik butang <strong>Run (▶️)</strong>. Skrip akan automatik mengira umur dari IC, memindahkan nombor telefon ke lajur telefon, dan menyusun semula semua lajur dengan sempurna!</li>
                <li>Akhir sekali, klik <strong>Deploy &gt; Manage deployments &gt; Pensel ✏️ &gt; Version: New version &gt; Deploy</strong> supaya pendaftaran seterusnya masuk ke susunan yang betul.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Target Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pangkalan Data Spreadsheet Terpaut
            </span>
          </div>
          <p className="font-mono text-xs text-slate-700 break-all">
            Spreadsheet ID: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{SPREADSHEET_ID}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            {testLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{testLoading ? 'Menguji...' : 'Uji Sambungan Web App'}</span>
          </button>

          <button
            onClick={handleCopyCodeGs}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            {copiedCodeGs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCodeGs ? 'Code.gs Disalin!' : 'Salin Code.gs'}</span>
          </button>

          <button
            onClick={handleCopyIndexHtml}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            {copiedIndexHtml ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedIndexHtml ? 'Index.html Disalin!' : 'Salin Index.html'}</span>
          </button>
        </div>
      </div>

      {/* Connection Test Result Banner */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
          testResult.connected 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${testResult.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{testResult.message}</span>
          </div>
          <button 
            onClick={() => setTestResult(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('fix')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'fix'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Panduan Langkah Demi Langkah (3 Minit)
        </button>

        <button
          onClick={() => setActiveTab('code_gs')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'code_gs'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Lihat Kod: Code.gs
        </button>

        <button
          onClick={() => setActiveTab('index_html')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'index_html'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Lihat Kod: Index.html
        </button>
      </div>

      {/* TAB 1: STEP BY STEP GUIDE */}
      {activeTab === 'fix' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Langkah Menetapkan Google Apps Script Dengan Bersih & Tanpa Ralat
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Hanya 3 minit untuk setup kedua-dua fail di Google Apps Script editor.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Kemas Kini fail <code>Code.gs</code>
                  </h3>
                </div>
                <button
                  onClick={handleCopyCodeGs}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCodeGs ? 'Disalin!' : 'Salin Code.gs'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Padam semua isi dalam <code>Code.gs</code> di Apps Script dan tampal kod dari butang di atas. Simpan fail (Ctrl+S / Cmd+S).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Cipta fail baharu: <code>Index.html</code>
                  </h3>
                </div>
                <button
                  onClick={handleCopyIndexHtml}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedIndexHtml ? 'Disalin!' : 'Salin Index.html'}</span>
                </button>
              </div>
              <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
                <li>Di sebelah kiri editor Apps Script (bahagian Files), klik ikon tambah <strong>+</strong> &gt; Pilih <strong>HTML</strong>.</li>
                <li>Namakan fail sebagai <code>Index</code> (Apps Script automatik jadikan ia <code>Index.html</code>).</li>
                <li>Tampal kod <code>Index.html</code> dan simpan (Ctrl+S / Cmd+S).</li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Jalankan <code>sheetSetup()</code> & Berikan Kebenaran (Permission)
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Pilih fungsi <strong>sheetSetup</strong> di toolbar atas dan klik <strong>Run</strong> (▶️). Luluskan <em>Authorization</em> Google akaun anda.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Deploy Web App (New Version)
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Klik <strong>Deploy</strong> &gt; <strong>Manage deployments</strong> &gt; Klik ikon pensel ✏️ pada deployment sedia ada &gt; Pilih <strong>Version: New version</strong> &gt; Klik <strong>Deploy</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CODE.GS */}
      {activeTab === 'code_gs' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-xs">
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span className="font-mono font-bold text-xs text-white">Code.gs</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCodeGs}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                title="Muat Turun"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyCodeGs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {copiedCodeGs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodeGs ? 'Disalin!' : 'Salin Kod'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto max-h-[550px]">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
              <code>{CODE_GS_CONTENT}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: INDEX.HTML */}
      {activeTab === 'index_html' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-xs">
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-xs text-white">Index.html</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadIndexHtml}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                title="Muat Turun"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyIndexHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {copiedIndexHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndexHtml ? 'Disalin!' : 'Salin Kod'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto max-h-[550px]">
            <pre className="text-xs font-mono text-sky-300 leading-relaxed">
              <code>{INDEX_HTML_CONTENT}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
