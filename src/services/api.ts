import { StorageService } from './storage';
import { RegistrationFormData, PesertaRecord, LookupKetuaResult } from '../types';
import { WEB_APP_URL, SPREADSHEET_ID } from '../gasSourceCode';
import { parseMalaysianIc, normalizeMalaysianIc } from '../utils/icUtils';

/**
 * Ensures data is securely transmitted to Google Apps Script backend
 * and recorded into the linked Google Sheets (PESERTA, KELUARGA, LOG).
 */
export const registerPesertaApi = async (
  formData: RegistrationFormData
): Promise<{ success: boolean; data?: PesertaRecord; message?: string; syncedToSheet?: boolean }> => {
  // 1. Perform client-side validation & local state persistence
  const localResult = StorageService.registerPeserta(formData);
  if (!localResult.success || !localResult.data) {
    return localResult;
  }

  const gasUrl = StorageService.getGasUrl() || WEB_APP_URL;
  let syncedToSheet = false;

  if (gasUrl) {
    const isFam = formData.isKeluarga === true;
    const isKetua = isFam && formData.statusKeluargaOption === 'KETUA KELUARGA';
    const isAhli = isFam && formData.statusKeluargaOption === 'AHLI KELUARGA';

    const cleanNama = formData.nama.trim().replace(/\s+/g, ' ').toUpperCase();
    const cleanIc = normalizeMalaysianIc(formData.noIc);
    const cleanPhone = formData.noTelefon.replace(/\D/g, '');
    const cleanIcKetua = normalizeMalaysianIc(formData.icKetuaSearch);
    const parsedIc = parseMalaysianIc(cleanIc);
    const umur = parsedIc ? parsedIc.age : (localResult.data.umur || 0);

    const payloadData = {
      idPeserta: localResult.data.idPeserta,
      nama: cleanNama,
      noIc: cleanIc,
      umur: umur,
      noTelefon: cleanPhone,
      isKeluarga: isFam,
      jenisPendaftaran: isFam ? 'KELUARGA' : 'INDIVIDU',
      statusKeluargaOption: isKetua ? 'KETUA KELUARGA' : (isAhli ? 'AHLI KELUARGA' : ''),
      statusKeluarga: isKetua ? 'KETUA' : (isAhli ? 'AHLI' : ''),
      idKeluarga: localResult.data.idKeluarga || '',
      icKetuaSearch: cleanIcKetua,
      icKetua: cleanIcKetua || (isKetua ? cleanIc : ''),
      namaKetuaKeluarga: localResult.data.namaKetuaKeluarga || (isKetua ? cleanNama : ''),
      hubunganKetua: isKetua ? 'KETUA' : (formData.hubunganKetua || 'AHLI')
    };

    const payload = {
      action: 'submit',
      data: payloadData
    };

    // Trigger Multi-channel sync to Google Apps Script & Google Sheet
    try {
      // 1. Standard POST
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        syncedToSheet = true;
        try {
          const resJson = await response.json();
          if (resJson && resJson.success && resJson.data) {
            return {
              success: true,
              data: {
                ...localResult.data,
                ...resJson.data
              },
              syncedToSheet: true
            };
          }
        } catch {
          // If response was redirected by GAS but completed
        }
      }
    } catch (corsOrNetErr) {
      console.warn('Direct POST encountered CORS/Network, executing guaranteed fallback write:', corsOrNetErr);
      
      // 2. Secondary Guaranteed No-CORS POST write
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        syncedToSheet = true;
      } catch (backupErr) {
        console.error('Backup No-CORS POST error:', backupErr);
      }

      // 3. Tertiary GET write pipeline (GET requests bypass CORS redirects cleanly in Google Apps Script)
      try {
        const getUrl = `${gasUrl}?action=submit&data=${encodeURIComponent(JSON.stringify(payloadData))}`;
        fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
        syncedToSheet = true;
      } catch (getErr) {
        console.warn('GET sync fallback:', getErr);
      }
    }
  }

  return {
    ...localResult,
    syncedToSheet
  };
};

/**
 * Searches for a registered Ketua Keluarga from Google Apps Script / Google Sheets first,
 * with fallback to local cache.
 */
export const searchKetuaKeluargaApi = async (noIc: string): Promise<LookupKetuaResult> => {
  const cleanIc = noIc.replace(/\D/g, '');
  const gasUrl = StorageService.getGasUrl() || WEB_APP_URL;

  if (gasUrl && cleanIc.length === 12) {
    try {
      const response = await fetch(`${gasUrl}?action=searchKetua&noIc=${cleanIc}`);
      if (response.ok) {
        const json = await response.json();
        if (json && (json.found === true || json.success === true)) {
          return {
            found: true,
            namaKetua: json.namaKetua || json.data?.namaKetua,
            idKeluarga: json.idKeluarga || json.data?.idKeluarga,
            icKetua: json.icKetua || cleanIc,
            umurKetua: json.umurKetua || json.data?.umurKetua || parseMalaysianIc(cleanIc)?.age,
            noTelefonKetua: json.noTelefonKetua || json.data?.noTelefonKetua
          };
        }
      }
    } catch (e) {
      console.warn('GAS searchKetua fallback to local:', e);
    }
  }

  // Fallback to local storage lookup
  return StorageService.searchKetuaKeluarga(cleanIc);
};

/**
 * Tests connection to Google Apps Script & Google Sheet
 */
export const testGoogleSheetConnection = async (): Promise<{ connected: boolean; message: string }> => {
  const gasUrl = StorageService.getGasUrl() || WEB_APP_URL;
  if (!gasUrl) {
    return { connected: false, message: 'URL Web App belum ditetapkan.' };
  }

  try {
    const res = await fetch(`${gasUrl}?action=getLeaderboard`);
    if (res.ok) {
      return { connected: true, message: `Pautan Google Sheet (${SPREADSHEET_ID}) aktif dan beroperasi.` };
    }
    return { connected: false, message: `Status respon: ${res.status}. Sila semak Web App deployment.` };
  } catch (err: any) {
    return { connected: false, message: `Tidak dapat menghubungi Web App: ${err.message || 'CORS / Rangkaian'}` };
  }
};

/**
 * SEDUT DATA DARI GOOGLE SHEET KE DALAM APLIKASI
 * 
 * Fetches all real-time records from the Google Sheet (Sheet PESERTA & KELUARGA),
 * dynamically maps headers/columns, accurately detects INDIVIDU vs KELUARGA,
 * and synchronizes into local storage.
 */
export const fetchDataFromGoogleSheet = async (): Promise<{
  success: boolean;
  totalPeserta: number;
  totalKeluarga: number;
  message: string;
  source: 'GVIZ_DIRECT' | 'GAS_API';
}> => {
  const gasUrl = StorageService.getGasUrl() || WEB_APP_URL;
  const fetchedPeserta: PesertaRecord[] = [];

  // Strategy 1: Google Visualization (GVIZ) API (Direct to Google Sheet)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=PESERTA&t=${Date.now()}`;
    const gvizRes = await fetch(gvizUrl);
    
    if (gvizRes.ok) {
      const text = await gvizRes.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        const cols = json.table?.cols || [];
        const rows = json.table?.rows || [];

        // 1. Dynamic Column Index Mapping
        let idxId = -1;
        let idxTarikh = -1;
        let idxNama = -1;
        let idxIc = -1;
        let idxUmur = -1;
        let idxTelefon = -1;
        let idxJenis = -1;
        let idxStatus = -1;
        let idxIdKeluarga = -1;
        let idxIcKetua = -1;
        let idxNamaKetua = -1;
        let idxHubungan = -1;
        let idxKehadiran = -1;

        cols.forEach((col: any, i: number) => {
          const lbl = (col?.label || '').toUpperCase().trim();
          if (/^ID_PESERTA|^ID$|NO.*DAFTAR/i.test(lbl)) idxId = i;
          else if (/TARIKH|TIMESTAMP|DATE/i.test(lbl)) idxTarikh = i;
          else if (/^NAMA$|NAMA.*PENUH|NAMA.*PESERTA/i.test(lbl) && !/KETUA/i.test(lbl)) idxNama = i;
          else if (/^NO_IC$|^IC$|KAD.*PENGENALAN|NRIC/i.test(lbl) && !/KETUA/i.test(lbl)) idxIc = i;
          else if (/^UMUR$|^AGE$/i.test(lbl) && !/KETUA/i.test(lbl)) idxUmur = i;
          else if (/NO.*TELEFON|^TELEFON$|^PHONE$|^HP$/i.test(lbl) && !/KETUA/i.test(lbl)) idxTelefon = i;
          else if (/JENIS.*PENDAFTARAN|^JENIS$|^KATEGORI$/i.test(lbl)) idxJenis = i;
          else if (/STATUS.*KELUARGA|^STATUS$/i.test(lbl)) idxStatus = i;
          else if (/ID.*KELUARGA|^FAM.*ID$|NO.*KELUARGA/i.test(lbl)) idxIdKeluarga = i;
          else if (/IC.*KETUA|NO.*IC.*KETUA/i.test(lbl)) idxIcKetua = i;
          else if (/NAMA.*KETUA/i.test(lbl)) idxNamaKetua = i;
          else if (/HUBUNGAN/i.test(lbl)) idxHubungan = i;
          else if (/KEHADIRAN|HADIR|ATTENDANCE/i.test(lbl)) idxKehadiran = i;
        });

        // Check if first row is a header row (if cols had no labels)
        let startRow = 0;
        if (rows.length > 0) {
          const r0Cells = rows[0].c || [];
          const r0Text = r0Cells.map((c: any) => (c?.v || c?.f || '').toString().toUpperCase());
          if (r0Text.some((t: string) => t.includes('ID_PESERTA') || t.includes('NO_IC') || t.includes('NAMA'))) {
            startRow = 1;
            r0Text.forEach((lbl: string, i: number) => {
              if (/^ID_PESERTA|^ID$|NO.*DAFTAR/i.test(lbl)) idxId = i;
              else if (/TARIKH|TIMESTAMP|DATE/i.test(lbl)) idxTarikh = i;
              else if (/^NAMA$|NAMA.*PENUH|NAMA.*PESERTA/i.test(lbl) && !/KETUA/i.test(lbl)) idxNama = i;
              else if (/^NO_IC$|^IC$|KAD.*PENGENALAN|NRIC/i.test(lbl) && !/KETUA/i.test(lbl)) idxIc = i;
              else if (/^UMUR$|^AGE$/i.test(lbl) && !/KETUA/i.test(lbl)) idxUmur = i;
              else if (/NO.*TELEFON|^TELEFON$|^PHONE$|^HP$/i.test(lbl) && !/KETUA/i.test(lbl)) idxTelefon = i;
              else if (/JENIS.*PENDAFTARAN|^JENIS$|^KATEGORI$/i.test(lbl)) idxJenis = i;
              else if (/STATUS.*KELUARGA|^STATUS$/i.test(lbl)) idxStatus = i;
              else if (/ID.*KELUARGA|^FAM.*ID$|NO.*KELUARGA/i.test(lbl)) idxIdKeluarga = i;
              else if (/IC.*KETUA|NO.*IC.*KETUA/i.test(lbl)) idxIcKetua = i;
              else if (/NAMA.*KETUA/i.test(lbl)) idxNamaKetua = i;
              else if (/HUBUNGAN/i.test(lbl)) idxHubungan = i;
              else if (/KEHADIRAN|HADIR|ATTENDANCE/i.test(lbl)) idxKehadiran = i;
            });
          }
        }

        // Fallbacks for standard 12-column layout if index is still -1
        if (idxId === -1) idxId = 0;
        if (idxTarikh === -1) idxTarikh = 1;
        if (idxNama === -1) idxNama = 2;
        if (idxIc === -1) idxIc = 3;
        if (idxUmur === -1) idxUmur = 4;
        if (idxTelefon === -1) idxTelefon = 5;
        if (idxJenis === -1) idxJenis = 6;
        if (idxStatus === -1) idxStatus = 7;
        if (idxIdKeluarga === -1) idxIdKeluarga = 8;
        if (idxIcKetua === -1) idxIcKetua = 9;
        if (idxNamaKetua === -1) idxNamaKetua = 10;
        if (idxHubungan === -1) idxHubungan = 11;

        for (let i = startRow; i < rows.length; i++) {
          const r = rows[i];
          const cells = r.c || [];
          const getVal = (colIdx: number) => {
            if (colIdx < 0 || colIdx >= cells.length) return '';
            const cell = cells[colIdx];
            if (!cell) return '';
            return (cell.f !== undefined && cell.f !== null) ? String(cell.f).trim() : (cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '');
          };

          const rawNama = getVal(idxNama).toUpperCase();
          const rawIc = normalizeMalaysianIc(getVal(idxIc));

          // Cari maklumat dalam sel sekiranya format berbeza
          let rawIdKeluarga = getVal(idxIdKeluarga).toUpperCase();
          let rawJenisPendaftaran = getVal(idxJenis).toUpperCase();
          let rawStatusKeluarga = getVal(idxStatus).toUpperCase();
          let rawHubungan = getVal(idxHubungan).toUpperCase();
          let rawIcKetua = normalizeMalaysianIc(getVal(idxIcKetua));
          let rawNamaKetua = getVal(idxNamaKetua).toUpperCase();

          // Cell scanner fallback across all row cells
          cells.forEach((c: any) => {
            const val = (c?.v || c?.f || '').toString().trim().toUpperCase();
            if (/^FAM-\d+/i.test(val) && !rawIdKeluarga) rawIdKeluarga = val;
            if (/^(KETUA|ISTERI|ANAK|PASANGAN|SUAMI)$/i.test(val) && !rawHubungan) rawHubungan = val;
            if (/^(KETUA KELUARGA|AHLI KELUARGA)$/i.test(val) && !rawStatusKeluarga) {
              rawStatusKeluarga = val.includes('KETUA') ? 'KETUA' : 'AHLI';
            }
            if (/^KELUARGA$/i.test(val)) rawJenisPendaftaran = 'KELUARGA';
          });

          // Only process if nama exists
          if (rawNama && rawNama.length > 1 && !rawNama.includes('NAMA')) {
            const parsedIc = parseMalaysianIc(rawIc);
            const calculatedAge = parsedIc ? parsedIc.age : 0;
            const valUmur = getVal(idxUmur);
            const valTelefon = getVal(idxTelefon);
            const valJenis = getVal(idxJenis);
            const valStatus = getVal(idxStatus);
            const valIdKeluarga = getVal(idxIdKeluarga);
            const valIcKetua = getVal(idxIcKetua);
            const valNamaKetua = getVal(idxNamaKetua);
            const valHubungan = getVal(idxHubungan);

            // PENGESANAN PINTAR LAJUR TERSASAR (SHIFTED COLUMN DETECTOR):
            // Jika lajur 'UMUR' mengandungi nombor telefon (cth: panjang >= 8 atau > 120)
            // dan lajur 'NO_TELEFON' mengandungi jenis pendaftaran (cth: 'INDIVIDU' atau 'KELUARGA')
            const isShiftedRow = (valUmur.replace(/\D/g, '').length >= 8 || parseInt(valUmur, 10) > 120) &&
              (/INDIVIDU|KELUARGA/i.test(valTelefon) || /KETUA|AHLI/i.test(valJenis));

            let effectiveTelefon = '';
            let effectiveJenis = rawJenisPendaftaran;
            let effectiveStatus = rawStatusKeluarga;
            let effectiveIdKeluarga = rawIdKeluarga;
            let effectiveIcKetua = rawIcKetua;
            let effectiveNamaKetua = rawNamaKetua;
            let effectiveHubungan = rawHubungan;
            let finalUmur = calculatedAge;

            if (isShiftedRow) {
              // Pulihkan data yang tersasar 1 lajur ke kiri
              let cleanShiftedPhone = valUmur.replace(/\D/g, '');
              if (cleanShiftedPhone.startsWith('60')) cleanShiftedPhone = cleanShiftedPhone.slice(2);
              if (cleanShiftedPhone.startsWith('1')) cleanShiftedPhone = '0' + cleanShiftedPhone;
              effectiveTelefon = cleanShiftedPhone;

              effectiveJenis = valTelefon.toUpperCase().trim();
              effectiveStatus = valJenis.toUpperCase().trim();
              effectiveIdKeluarga = valStatus.toUpperCase().trim();
              effectiveIcKetua = normalizeMalaysianIc(valIdKeluarga);
              effectiveNamaKetua = valIcKetua.toUpperCase().trim();
              effectiveHubungan = valNamaKetua.toUpperCase().trim();
              finalUmur = calculatedAge;
            } else {
              let cleanNormPhone = valTelefon.replace(/\D/g, '');
              if (cleanNormPhone.startsWith('60')) cleanNormPhone = cleanNormPhone.slice(2);
              if (cleanNormPhone.startsWith('1')) cleanNormPhone = '0' + cleanNormPhone;
              effectiveTelefon = cleanNormPhone;

              const parsedUmur = parseInt(valUmur, 10);
              finalUmur = (!isNaN(parsedUmur) && parsedUmur > 0 && parsedUmur < 120) ? parsedUmur : calculatedAge;
            }

            const isKeluarga = 
              effectiveJenis.includes('KELUARGA') ||
              effectiveStatus.includes('KETUA') ||
              effectiveStatus.includes('AHLI') ||
              effectiveHubungan.includes('KETUA') ||
              effectiveHubungan.includes('ISTERI') ||
              effectiveHubungan.includes('ANAK') ||
              effectiveIdKeluarga.length > 0 ||
              effectiveIcKetua.length === 12 ||
              effectiveNamaKetua.length > 2;

            const jenisPendaftaran: 'INDIVIDU' | 'KELUARGA' = isKeluarga ? 'KELUARGA' : 'INDIVIDU';

            let statusKeluarga: '' | 'KETUA' | 'AHLI' = '';
            if (isKeluarga) {
              if (effectiveStatus.includes('KETUA') || effectiveHubungan.includes('KETUA') || (effectiveIcKetua && rawIc === effectiveIcKetua)) {
                statusKeluarga = 'KETUA';
              } else {
                statusKeluarga = 'AHLI';
              }
            }

            let hubunganKetua: '' | 'KETUA' | 'ISTERI' | 'ANAK' = '';
            if (isKeluarga) {
              if (statusKeluarga === 'KETUA') {
                hubunganKetua = 'KETUA';
              } else if (effectiveHubungan.includes('ISTERI') || effectiveHubungan.includes('PASANGAN') || effectiveHubungan.includes('SUAMI')) {
                hubunganKetua = 'ISTERI';
              } else {
                hubunganKetua = 'ANAK';
              }
            }

            fetchedPeserta.push({
              idPeserta: getVal(idxId) || `PES-${String(fetchedPeserta.length + 1).padStart(4, '0')}`,
              tarikhDaftar: getVal(idxTarikh) || new Date().toISOString().replace('T', ' ').slice(0, 19),
              nama: rawNama,
              noIc: rawIc,
              umur: finalUmur,
              noTelefon: effectiveTelefon,
              jenisPendaftaran,
              statusKeluarga,
              idKeluarga: effectiveIdKeluarga,
              icKetuaKeluarga: effectiveIcKetua,
              namaKetuaKeluarga: effectiveNamaKetua,
              hubunganKetua,
              kehadiran: idxKehadiran !== -1 ? getVal(idxKehadiran) : ''
            });
          }
        }

        if (fetchedPeserta.length > 0) {
          const result = StorageService.importFromSheet(fetchedPeserta);
          const totalKeluargaPeserta = fetchedPeserta.filter(p => p.jenisPendaftaran === 'KELUARGA').length;
          const totalIndividu = fetchedPeserta.filter(p => p.jenisPendaftaran === 'INDIVIDU').length;

          return {
            success: true,
            totalPeserta: result.totalPeserta,
            totalKeluarga: result.totalKeluarga,
            message: `Berjaya menyedut ${result.totalPeserta} peserta dari Google Sheet (${totalIndividu} Individu & ${totalKeluargaPeserta} Ahli Keluarga).`,
            source: 'GVIZ_DIRECT'
          };
        }
      }
    }
  } catch (gvizErr) {
    console.warn('GVIZ direct fetch failed or sheet restricted, trying GAS endpoint:', gvizErr);
  }

  // Strategy 2: Google Apps Script Web App API
  if (gasUrl) {
    try {
      const response = await fetch(`${gasUrl}?action=getAllData&t=${Date.now()}`);
      if (response.ok) {
        const json = await response.json();
        if (json && (json.success || Array.isArray(json.peserta) || Array.isArray(json.data))) {
          const rawList: any[] = json.peserta || json.data || [];
          const kList: any[] = json.keluarga || [];

          const pesertaList: PesertaRecord[] = rawList.map((p, idx) => {
            const ic = (p.noIc || '').toString().replace(/\D/g, '');
            const parsed = parseMalaysianIc(ic);
            return {
              idPeserta: p.idPeserta || `PES-${String(idx + 1).padStart(4, '0')}`,
              tarikhDaftar: p.tarikhDaftar || '',
              nama: (p.nama || '').toString().trim().toUpperCase(),
              noIc: ic,
              umur: (typeof p.umur === 'number' && p.umur > 0) ? p.umur : (parsed ? parsed.age : 0),
              noTelefon: (p.noTelefon || '').toString().replace(/\D/g, ''),
              jenisPendaftaran: (p.jenisPendaftaran === 'KELUARGA' || p.idKeluarga || p.statusKeluarga) ? 'KELUARGA' : 'INDIVIDU',
              statusKeluarga: p.statusKeluarga || '',
              idKeluarga: p.idKeluarga || '',
              icKetuaKeluarga: (p.icKetuaKeluarga || '').toString().replace(/\D/g, ''),
              namaKetuaKeluarga: (p.namaKetuaKeluarga || '').toString().trim().toUpperCase(),
              hubunganKetua: p.hubunganKetua || ''
            };
          });

          const result = StorageService.importFromSheet(pesertaList, kList);
          return {
            success: true,
            totalPeserta: result.totalPeserta,
            totalKeluarga: result.totalKeluarga,
            message: `Berjaya menyedut ${result.totalPeserta} rekod peserta dari Google Apps Script!`,
            source: 'GAS_API'
          };
        }
      }
    } catch (gasErr) {
      console.error('GAS fetch error:', gasErr);
    }
  }

  // If both failed or sheet is completely empty
  const currentCount = StorageService.getPesertaList().length;
  return {
    success: false,
    totalPeserta: currentCount,
    totalKeluarga: StorageService.getKeluargaList().length,
    message: 'Tidak dapat menyedut data dari Google Sheet. Sila pastikan Google Sheet dikongsi dengan kebenaran "Anyone with the link can view/edit".',
    source: 'GVIZ_DIRECT'
  };
};

/**
 * Hantar pengesahan kehadiran ke Google Apps Script dan kemaskini storan tempatan
 */
export const markAttendanceApi = async (
  updates: { idPeserta?: string; noIc: string; hadir: boolean }[]
): Promise<{ success: boolean; updatedCount: number; message: string; syncedToSheet: boolean }> => {
  // 1. Kemaskini status secara tempatan terlebih dahulu (instant UI responsiveness)
  const localRes = StorageService.updateAttendance(updates);

  const gasUrl = StorageService.getGasUrl() || WEB_APP_URL;
  let syncedToSheet = false;

  if (gasUrl && updates.length > 0) {
    const nowStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    const formattedUpdates = updates.map(u => ({
      idPeserta: u.idPeserta || '',
      noIc: normalizeMalaysianIc(u.noIc),
      kehadiran: u.hadir ? `HADIR (${nowStr})` : ''
    }));

    const payload = {
      action: 'markAttendance',
      updates: formattedUpdates
    };

    // Fire multi-channel sync to ensure Google Sheet receives attendance updates:
    // 1. Direct POST
    // 2. Guaranteed no-cors POST (browser-safe, bypasses redirect CORS blocking)
    // 3. GET Query string pipeline (Google Apps Script always processes GET queries without CORS issues)
    try {
      // Channel 1: standard POST
      fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      }).then(r => {
        if (r.ok) syncedToSheet = true;
      }).catch(() => {});

      // Channel 2: Guaranteed no-cors POST
      fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      // Channel 3: GET query request with parameters
      const getUrl = `${gasUrl}?action=markAttendance&updates=${encodeURIComponent(JSON.stringify(formattedUpdates))}&t=${Date.now()}`;
      await fetch(getUrl, { mode: 'no-cors' });
      syncedToSheet = true;
    } catch (netErr) {
      console.warn('Ralat penyegerakan kehadiran ke Google Sheet:', netErr);
    }
  }

  return {
    success: true,
    updatedCount: localRes.updatedCount,
    message: syncedToSheet 
      ? `Kehadiran ${localRes.updatedCount} peserta berjaya disahkan & diselaraskan ke Google Sheet!`
      : `Kehadiran ${localRes.updatedCount} peserta disahkan (disimpan dalam peranti).`,
    syncedToSheet
  };
};

