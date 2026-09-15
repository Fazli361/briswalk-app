export interface GasFile {
  name: string;
  type: 'gs' | 'html';
  description: string;
  code: string;
}

export const SPREADSHEET_ID = '1dPYIMwN25zKblXLOB6itVENq5lc8CuoXN8Vap3C7uiY';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby7gJLMFBnnSlw-Dt1Wb3Ghjpmuvc35Np2FsFRwY-IunDg4KRQhhOC7MO2RyzXVfU2h/exec';

export const CODE_GS_CONTENT = `/**
 * =========================================================================
 * BRIS WALK - SISTEM PENDAFTARAN PESERTA & KELUARGA
 * Google Apps Script Web App & Spreadsheet Backend
 * Spreadsheet ID: ${SPREADSHEET_ID}
 * =========================================================================
 */

var CONFIG = {
  SPREADSHEET_ID: '${SPREADSHEET_ID}',
  SHEETS: {
    PESERTA: 'PESERTA',
    KELUARGA: 'KELUARGA',
    SETTINGS: 'SETTINGS',
    LOG: 'LOG'
  },
  SYSTEM_NAME: 'BRIS WALK',
  PROGRAM_NAME: 'BRIS WALK',
  LOCK_TIMEOUT_MS: 30000
};

/**
 * Akses Spreadsheet secara pintar
 */
function getDatabaseSpreadsheet() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    Logger.log('Active spreadsheet tiada, buka melalui ID: ' + e.toString());
  }

  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  throw new Error('Spreadsheet ID belum ditetapkan dalam CONFIG.SPREADSHEET_ID');
}

/**
 * 1. INTI SISTEM: Sediakan 4 Sheet Rasmi (Jalankan fungsi ini dahulu)
 */
function sheetSetup() {
  var ss = getDatabaseSpreadsheet();

  // 1. SHEET PESERTA (Termasuk lajur UMUR & KEHADIRAN)
  var pSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (!pSheet) pSheet = ss.insertSheet(CONFIG.SHEETS.PESERTA);
  var pHeaders = [
    'ID_PESERTA',
    'TARIKH_DAFTAR',
    'NAMA',
    'NO_IC',
    'UMUR',
    'NO_TELEFON',
    'JENIS_PENDAFTARAN',
    'STATUS_KELUARGA',
    'ID_KELUARGA',
    'IC_KETUA_KELUARGA',
    'NAMA_KETUA_KELUARGA',
    'HUBUNGAN_KETUA',
    'KEHADIRAN'
  ];
  pSheet.getRange(1, 1, 1, pHeaders.length).setValues([pHeaders]);
  pSheet.setFrozenRows(1);
  formatHeaderRow(pSheet, pHeaders.length);
  // Format No. IC, Telefon, IC Ketua sebagai Plain Text supaya '0' di depan tidak hilang
  try {
    pSheet.getRange("D:D").setNumberFormat("@");
    pSheet.getRange("F:F").setNumberFormat("@");
    pSheet.getRange("J:J").setNumberFormat("@");
  } catch (e) {}

  // 2. SHEET KELUARGA
  var kSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);
  if (!kSheet) kSheet = ss.insertSheet(CONFIG.SHEETS.KELUARGA);
  var kHeaders = [
    'ID_KELUARGA',
    'IC_KETUA',
    'NAMA_KETUA',
    'UMUR_KETUA',
    'NO_TELEFON_KETUA',
    'TARIKH_DAFTAR',
    'JUMLAH_AHLI'
  ];
  kSheet.getRange(1, 1, 1, kHeaders.length).setValues([kHeaders]);
  kSheet.setFrozenRows(1);
  formatHeaderRow(kSheet, kHeaders.length);
  try {
    kSheet.getRange("B:B").setNumberFormat("@");
    kSheet.getRange("E:E").setNumberFormat("@");
  } catch (e) {}

  // 3. SHEET SETTINGS
  var sSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sSheet) sSheet = ss.insertSheet(CONFIG.SHEETS.SETTINGS);
  var sHeaders = ['KEY', 'VALUE'];
  sSheet.getRange(1, 1, 1, sHeaders.length).setValues([sHeaders]);
  if (sSheet.getLastRow() <= 1) {
    sSheet.appendRow(['SYSTEM_NAME', CONFIG.SYSTEM_NAME]);
    sSheet.appendRow(['PROGRAM_NAME', CONFIG.PROGRAM_NAME]);
  }
  sSheet.setFrozenRows(1);
  formatHeaderRow(sSheet, sHeaders.length);

  // 4. SHEET LOG
  var lSheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
  if (!lSheet) lSheet = ss.insertSheet(CONFIG.SHEETS.LOG);
  var lHeaders = ['TIMESTAMP', 'ACTION', 'ID_PESERTA', 'NO_IC', 'USER', 'DETAILS'];
  lSheet.getRange(1, 1, 1, lHeaders.length).setValues([lHeaders]);
  lSheet.setFrozenRows(1);
  formatHeaderRow(lSheet, lHeaders.length);

  recordLog('SETUP_SYSTEM', '', '', 'ADMIN', 'Setup 4 sheets selesai (termasuk lajur UMUR)');
  Logger.log('Setup 4 Sheet Berjaya!');
  return { success: true, message: 'Setup Sheet Berjaya! 4 sheet telah sedia.' };
}

function formatHeaderRow(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#0f172a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
}

function recordLog(action, idPeserta, noIc, user, details) {
  try {
    var ss = getDatabaseSpreadsheet();
    var logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
    if (!logSheet) return;
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
    logSheet.appendRow([
      timestamp,
      action || '',
      idPeserta || '',
      noIc || '',
      user || 'SYSTEM',
      details || ''
    ]);
  } catch (e) {}
}

/**
 * Normalise IC (Auto-recover leading zero if truncated by spreadsheet)
 */
function normalizeIc(icString) {
  var clean = (icString || '').toString().replace(/\\D/g, '');
  if (clean.length >= 10 && clean.length <= 11) {
    return ('000000000000' + clean).slice(-12);
  }
  return clean;
}

/**
 * Kira Umur dari No. IC Malaysia (12 Digit)
 */
function calculateAgeFromIc(icString) {
  var clean = normalizeIc(icString);
  if (clean.length !== 12) return 0;

  var yy = parseInt(clean.substring(0, 2), 10);
  var mm = parseInt(clean.substring(2, 4), 10);
  var dd = parseInt(clean.substring(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return 0;

  var currentYear = new Date().getFullYear();
  var current2Digit = currentYear % 100;
  var birthYear = (yy <= current2Digit) ? (2000 + yy) : (1900 + yy);

  return Math.max(0, currentYear - birthYear);
}

/**
 * 2. PENDAFTARAN PESERTA & KELUARGA (Automatik Segerak ke Google Sheet)
 */
function submitRegistration(payload) {
  var lock = LockService.getScriptLock();
  try {
    var acquired = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!acquired) {
      return { success: false, message: 'Sistem sedang sibuk. Sila cuba sebentar lagi.' };
    }

    var ss = getDatabaseSpreadsheet();
    var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
    var keluargaSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);

    if (!pesertaSheet || !keluargaSheet) {
      sheetSetup();
      pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
      keluargaSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);
    }

    var rawNama = (payload.nama || '').toString();
    var nama = rawNama.trim().replace(/\\s+/g, ' ').toUpperCase();
    var noIc = normalizeIc(payload.noIc);
    var noTelefon = (payload.noTelefon || '').toString().replace(/\\D/g, '');
    var umur = payload.umur ? parseInt(payload.umur, 10) : calculateAgeFromIc(noIc);

    // Pengesanan pintar Kategori Keluarga
    var isKeluarga = payload.isKeluarga === true || 
                     payload.isKeluarga === 'true' || 
                     payload.isKeluarga === 'YA' || 
                     payload.isKeluarga === 'ya' || 
                     payload.isKeluarga === 'TRUE' ||
                     payload.jenisPendaftaran === 'KELUARGA';

    var statusKeluargaOption = (payload.statusKeluargaOption || payload.statusKeluarga || '').toString().trim().toUpperCase();
    var icKetuaSearch = normalizeIc(payload.icKetuaSearch || payload.icKetua || payload.icKetuaKeluarga);
    var hubunganKetuaInput = (payload.hubunganKetua || '').toString().trim().toUpperCase();

    // Validasi Asas
    if (!nama || nama.length < 3) {
      return { success: false, message: 'Sila masukkan Nama Penuh yang sah (minimum 3 aksara).' };
    }
    if (!/^[0-9]{12}$/.test(noIc)) {
      return { success: false, message: 'No. Kad Pengenalan mestilah tepat 12 digit nombor.' };
    }
    if (!/^[0-9]{10,11}$/.test(noTelefon)) {
      return { success: false, message: 'No. Telefon mestilah 10 atau 11 digit nombor.' };
    }

    // Semak Duplicate IC dalam Sheet PESERTA (No. Telefon dibenarkan berkongsi / duplicate contohnya bagi ahli keluarga)
    var dataPeserta = pesertaSheet.getDataRange().getValues();
    for (var i = 1; i < dataPeserta.length; i++) {
      var rowIc = normalizeIc(dataPeserta[i][3]);
      if (rowIc === noIc) {
        return { success: false, message: 'No. Kad Pengenalan (' + noIc + ') telah pun berdaftar.' };
      }
    }

    // Jana ID Peserta (cth: PES-0001)
    var maxPesNum = 0;
    for (var p = 1; p < dataPeserta.length; p++) {
      var match = (dataPeserta[p][0] || '').toString().match(/PES-(\\d+)/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxPesNum) maxPesNum = num;
      }
    }
    var idPeserta = payload.idPeserta || ('PES-' + ('0000' + (maxPesNum + 1)).slice(-4));
    var tarikhDaftar = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');

    var jenisPendaftaran = 'INDIVIDU';
    var statusKeluarga = '';
    var idKeluarga = '';
    var icKetuaKeluarga = '';
    var namaKetuaKeluarga = '';
    var hubunganKetua = '';

    if (!isKeluarga) {
      jenisPendaftaran = 'INDIVIDU';
    } else {
      jenisPendaftaran = 'KELUARGA';

      // 1. KETUA KELUARGA
      if (statusKeluargaOption.indexOf('KETUA') !== -1) {
        statusKeluarga = 'KETUA';
        icKetuaKeluarga = noIc;
        namaKetuaKeluarga = nama;
        hubunganKetua = 'KETUA';

        // Semak atau Jana ID Keluarga berasaskan 6 digit akhir No. IC Ketua (cth: FAM-086488)
        var dataKeluarga = keluargaSheet.getDataRange().getValues();
        var existingFamId = null;

        for (var k = 1; k < dataKeluarga.length; k++) {
          var kIc = (dataKeluarga[k][1] || '').toString().replace(/\\D/g, '');
          if (kIc === noIc) {
            existingFamId = dataKeluarga[k][0].toString();
            break;
          }
        }

        idKeluarga = existingFamId || payload.idKeluarga || ('FAM-' + noIc.slice(-6));

        if (!existingFamId) {
          keluargaSheet.appendRow([
            idKeluarga,
            "'" + icKetuaKeluarga,
            namaKetuaKeluarga,
            umur,
            "'" + noTelefon,
            tarikhDaftar,
            1
          ]);
        }
        recordLog('PENDAFTARAN_KETUA', idPeserta, noIc, 'PESERTA', 'Ketua Baru: ' + idKeluarga + ' (Umur: ' + umur + ')');

      // 2. AHLI KELUARGA
      } else {
        statusKeluarga = 'AHLI';
        var ketuaInfo = searchKetuaKeluarga(icKetuaSearch);
        
        if (ketuaInfo.found) {
          idKeluarga = ketuaInfo.idKeluarga;
          icKetuaKeluarga = ketuaInfo.icKetua;
          namaKetuaKeluarga = ketuaInfo.namaKetua;
        } else if (payload.idKeluarga) {
          idKeluarga = payload.idKeluarga;
          icKetuaKeluarga = icKetuaSearch || payload.icKetua || '';
          namaKetuaKeluarga = payload.namaKetuaKeluarga || 'KETUA KELUARGA';
        } else {
          return { success: false, message: 'Ketua keluarga belum berdaftar. Sila minta ketua keluarga membuat pendaftaran terlebih dahulu.' };
        }

        hubunganKetua = (hubunganKetuaInput === 'ISTERI' || hubunganKetuaInput === 'ANAK') ? hubunganKetuaInput : (payload.hubunganKetua || 'AHLI');

        // Validasi Umur Anak vs Ketua
        if (hubunganKetua === 'ANAK') {
          var parentAge = ketuaInfo.umurKetua || calculateAgeFromIc(icKetuaKeluarga) || 40;
          if (umur >= parentAge) {
            return { success: false, message: 'Ralat: Umur anak (' + umur + ' thn) tidak boleh lebih tua atau sama dengan ketua (' + parentAge + ' thn).' };
          }
        }

        recordLog('PENDAFTARAN_AHLI', idPeserta, noIc, 'PESERTA', 'Ahli di bawah ' + idKeluarga + ' (' + hubunganKetua + ', Umur: ' + umur + ')');
      }
    }

    // Masukkan rekod lengkap ke Sheet PESERTA (Termasuk Lajur UMUR)
    pesertaSheet.appendRow([
      idPeserta,
      tarikhDaftar,
      nama,
      "'" + noIc,
      umur,
      "'" + noTelefon,
      jenisPendaftaran,
      statusKeluarga,
      idKeluarga,
      icKetuaKeluarga ? ("'" + icKetuaKeluarga) : '',
      namaKetuaKeluarga,
      hubunganKetua
    ]);

    // Kemaskini jumlah ahli keluarga dalam Sheet KELUARGA
    if (isKeluarga && idKeluarga) {
      updateJumlahAhliKeluarga(ss, idKeluarga);
    }

    recordLog('PENDAFTARAN_BERJAYA', idPeserta, noIc, 'PESERTA', jenisPendaftaran + (idKeluarga ? ' (' + idKeluarga + ')' : ''));

    return {
      success: true,
      data: {
        idPeserta: idPeserta,
        tarikhDaftar: tarikhDaftar,
        nama: nama,
        noIc: noIc,
        umur: umur,
        noTelefon: noTelefon,
        jenisPendaftaran: jenisPendaftaran,
        statusKeluarga: statusKeluarga === 'KETUA' ? 'KETUA KELUARGA' : (statusKeluarga === 'AHLI' ? 'AHLI KELUARGA' : ''),
        idKeluarga: idKeluarga,
        namaKetuaKeluarga: namaKetuaKeluarga,
        hubunganKetua: hubunganKetua
      }
    };
  } catch (err) {
    Logger.log('Ralat submitRegistration: ' + err.toString());
    return { success: false, message: 'Ralat: ' + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. CARIAN KETUA KELUARGA
 */
function searchKetuaKeluarga(icKetuaInput) {
  var cleanedIc = (icKetuaInput || '').toString().replace(/\\D/g, '');
  if (!cleanedIc || cleanedIc.length !== 12) {
    return { found: false, message: 'No. IC mestilah tepat 12 digit.' };
  }

  var umurKetua = calculateAgeFromIc(cleanedIc);
  var ss = getDatabaseSpreadsheet();
  var keluargaSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);
  if (keluargaSheet) {
    var data = keluargaSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if ((data[i][1] || '').toString().replace(/\\D/g, '') === cleanedIc) {
        return {
          found: true,
          idKeluarga: data[i][0].toString(),
          icKetua: cleanedIc,
          namaKetua: data[i][2].toString(),
          umurKetua: data[i][3] ? parseInt(data[i][3], 10) : umurKetua,
          noTelefonKetua: (data[i][4] || data[i][3] || '').toString()
        };
      }
    }
  }

  var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (pesertaSheet) {
    var pData = pesertaSheet.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
      var pIc = (pData[j][3] || '').toString().replace(/\\D/g, '');
      var pStatus = (pData[j][7] || pData[j][6] || '').toString().toUpperCase();
      if (pIc === cleanedIc && (pStatus === 'KETUA' || pStatus === 'KETUA KELUARGA')) {
        return {
          found: true,
          idKeluarga: (pData[j][8] || pData[j][7] || '').toString(),
          icKetua: pIc,
          namaKetua: (pData[j][2] || '').toString(),
          umurKetua: pData[j][4] ? parseInt(pData[j][4], 10) : umurKetua,
          noTelefonKetua: (pData[j][5] || pData[j][4] || '').toString()
        };
      }
    }
  }

  return {
    found: false,
    message: 'Ketua keluarga belum berdaftar. Sila minta ketua keluarga membuat pendaftaran terlebih dahulu.'
  };
}

/**
 * Kemaskini Jumlah Ahli Keluarga Secara Automatik
 */
function updateJumlahAhliKeluarga(ss, idKeluarga) {
  var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  var keluargaSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);
  if (!pesertaSheet || !keluargaSheet) return;

  var pData = pesertaSheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < pData.length; i++) {
    var rowFamId = (pData[i][8] || pData[i][7] || '').toString().trim();
    if (rowFamId === idKeluarga) count++;
  }

  var kData = keluargaSheet.getDataRange().getValues();
  for (var k = 1; k < kData.length; k++) {
    if ((kData[k][0] || '').toString().trim() === idKeluarga) {
      keluargaSheet.getRange(k + 1, 7).setValue(count);
      return;
    }
  }
}

/**
 * 4. KELUARGA PALING RAMAI (LEADERBOARD)
 */
function getKeluargaPalingRamai() {
  var ss = getDatabaseSpreadsheet();
  var keluargaSheet = ss.getSheetByName(CONFIG.SHEETS.KELUARGA);
  var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (!keluargaSheet || !pesertaSheet) return [];

  var kData = keluargaSheet.getDataRange().getValues();
  var pData = pesertaSheet.getDataRange().getValues();
  var list = [];

  for (var i = 1; i < kData.length; i++) {
    var idFam = (kData[i][0] || '').toString();
    if (!idFam) continue;

    var ahliList = [];
    var ketuaName = (kData[i][2] || '').toString();

    for (var j = 1; j < pData.length; j++) {
      var rowFam = (pData[j][8] || pData[j][7] || '').toString();
      if (rowFam === idFam) {
        ahliList.push({
          idPeserta: pData[j][0].toString(),
          nama: pData[j][2].toString(),
          noIc: pData[j][3].toString(),
          umur: pData[j][4] ? parseInt(pData[j][4], 10) : calculateAgeFromIc(pData[j][3]),
          statusKeluarga: (pData[j][7] || pData[j][6] || '').toString(),
          hubunganKetua: (pData[j][11] || pData[j][10] || '').toString()
        });
      }
    }

    list.push({
      idKeluarga: idFam,
      icKetua: (kData[i][1] || '').toString(),
      namaKetua: ketuaName,
      umurKetua: kData[i][3] ? parseInt(kData[i][3], 10) : calculateAgeFromIc(kData[i][1]),
      noTelefon: (kData[i][4] || kData[i][3] || '').toString(),
      totalPeserta: ahliList.length || (parseInt(kData[i][6] || kData[i][5], 10) || 1),
      ahli: ahliList
    });
  }

  list.sort(function(a, b) { return b.totalPeserta - a.totalPeserta; });
  return list;
}

/**
 * 4. FUNGSI PEMBAIKAN KHAS: Baiki Data Tersasar Akibat Ketiadaan Lajur UMUR
 * Jalankan fungsi ini di Apps Script Editor sekiranya lajur 'UMUR' diisi nombor telefon
 * dan lajur-lajur berikutnya beranjak ke kiri.
 */
function betulkanSusunanLajurSheet() {
  var ss = getDatabaseSpreadsheet();
  var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (!pesertaSheet) {
    return { success: false, message: 'Sheet PESERTA tidak dijumpai!' };
  }

  // 1. Pastikan Header Rasmi di Baris 1
  var officialHeaders = [
    'ID_PESERTA',
    'TARIKH_DAFTAR',
    'NAMA',
    'NO_IC',
    'UMUR',
    'NO_TELEFON',
    'JENIS_PENDAFTARAN',
    'STATUS_KELUARGA',
    'ID_KELUARGA',
    'IC_KETUA_KELUARGA',
    'NAMA_KETUA_KELUARGA',
    'HUBUNGAN_KETUA',
    'KEHADIRAN'
  ];
  pesertaSheet.getRange(1, 1, 1, officialHeaders.length).setValues([officialHeaders]);
  formatHeaderRow(pesertaSheet, officialHeaders.length);

  var lastRow = pesertaSheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, message: 'Tiada data untuk dibaiki.' };
  }

  // 2. Baca seluruh data
  var range = pesertaSheet.getRange(2, 1, lastRow - 1, officialHeaders.length);
  var values = range.getValues();
  var fixedCount = 0;

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var idPeserta = (row[0] || '').toString().trim();
    var tarikh = row[1];
    var nama = (row[2] || '').toString().trim();
    var rawIc = (row[3] || '').toString().trim();
    var noIc = normalizeIc(rawIc);

    var colE = (row[4] || '').toString().trim(); // Sepatutnya UMUR
    var colF = (row[5] || '').toString().trim(); // Sepatutnya NO_TELEFON
    var colG = (row[6] || '').toString().trim(); // Sepatutnya JENIS_PENDAFTARAN
    var colH = (row[7] || '').toString().trim(); // Sepatutnya STATUS_KELUARGA
    var colI = (row[8] || '').toString().trim(); // Sepatutnya ID_KELUARGA
    var colJ = (row[9] || '').toString().trim(); // Sepatutnya IC_KETUA_KELUARGA
    var colK = (row[10] || '').toString().trim(); // Sepatutnya NAMA_KETUA_KELUARGA
    var colL = (row[11] || '').toString().trim(); // Sepatutnya HUBUNGAN_KETUA
    var kehadiran = (row[12] || '').toString().trim();

    // Semak sama ada baris ini tersasar:
    // Ciri baris tersasar: Col E adalah nombor telefon (panjang digit >= 8 atau > 120),
    // manakala Col F berisi perkataan 'INDIVIDU' atau 'KELUARGA', atau Col G berisi 'KETUA'/'AHLI'
    var isShifted = (colE.replace(/\D/g, '').length >= 8 || parseInt(colE, 10) > 120) &&
                    (/INDIVIDU|KELUARGA/i.test(colF) || /KETUA|AHLI/i.test(colG) || /^FAM-\d+/i.test(colH));

    if (isShifted) {
      // 1. Bersihkan nombor telefon (dari Col E)
      var cleanPhone = colE.replace(/\D/g, '');
      if (cleanPhone.indexOf('60') === 0) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.indexOf('1') === 0) cleanPhone = '0' + cleanPhone;

      // 2. Kira Umur tepat dari No. IC
      var umur = calculateAgeFromIc(noIc);

      // 3. Pulihkan susunan ke lajur yang sepatutnya
      var jenisPendaftaran = colF.toUpperCase().trim();
      var statusKeluarga = colG.toUpperCase().trim();
      var idKeluarga = colH.toUpperCase().trim();
      var icKetua = normalizeIc(colI);
      var namaKetua = colJ.toUpperCase().trim();
      var hubungan = colK.toUpperCase().trim();

      // Format semula baris
      row[0] = idPeserta;
      row[1] = tarikh;
      row[2] = nama;
      row[3] = "'" + noIc;
      row[4] = umur;
      row[5] = "'" + cleanPhone;
      row[6] = jenisPendaftaran;
      row[7] = statusKeluarga;
      row[8] = idKeluarga;
      row[9] = icKetua ? ("'" + icKetua) : '';
      row[10] = namaKetua;
      row[11] = hubungan;
      row[12] = kehadiran;

      fixedCount++;
    } else {
      // Jika tidak tersasar, pastikan format IC & Telefon selamat sebagai plain text
      row[3] = "'" + noIc;
      if (colF) {
        var p = colF.replace(/\D/g, '');
        if (p.indexOf('60') === 0) p = p.substring(2);
        if (p.indexOf('1') === 0) p = '0' + p;
        row[5] = "'" + p;
      }
      if (colI && /^\d+$/.test(colI)) {
        row[9] = "'" + normalizeIc(colI);
      }
    }
  }

  // Tulis semula kesemua baris serentak
  range.setValues(values);

  // Kunci format Plain Text
  try {
    pesertaSheet.getRange("D:D").setNumberFormat("@");
    pesertaSheet.getRange("F:F").setNumberFormat("@");
    pesertaSheet.getRange("J:J").setNumberFormat("@");
  } catch (fmtErr) {}

  recordLog('BAIKI_SUSUNAN', '', '', 'ADMIN', 'Berjaya membaiki ' + fixedCount + ' rekod yang tersasar');
  Logger.log('Pembaikan Selesai! Sebanyak ' + fixedCount + ' baris telah dibetulkan.');
  return {
    success: true,
    message: 'Pembaikan selesai! Sebanyak ' + fixedCount + ' rekod peserta telah disusun semula dengan tepat.',
    fixedCount: fixedCount
  };
}

/**
 * 5. FUNGSI PENGESAHAN KEHADIRAN (HARI KEJADIAN)
 * Kemaskini lajur 'KEHADIRAN' (Lajur M / Kolum 13) dalam Sheet PESERTA
 */
function markAttendance(payload) {
  var ss = getDatabaseSpreadsheet();
  var pesertaSheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (!pesertaSheet) {
    return { success: false, message: 'Sheet PESERTA tidak dijumpai' };
  }

  var updates = payload.updates || (payload.data && payload.data.updates) || [];
  if (!Array.isArray(updates) || updates.length === 0) {
    if (payload.noIc || payload.idPeserta) {
      updates = [{
        idPeserta: payload.idPeserta,
        noIc: payload.noIc,
        kehadiran: payload.kehadiran || 'HADIR'
      }];
    } else {
      return { success: false, message: 'Tiada senarai peserta untuk dikemaskini' };
    }
  }

  // Cari indeks lajur KEHADIRAN secara dinamik atau gunakan Kolum 13 (M)
  var headers = pesertaSheet.getRange(1, 1, 1, Math.max(pesertaSheet.getLastColumn(), 13)).getValues()[0];
  var colKehadiran = 13;
  for (var h = 0; h < headers.length; h++) {
    if ((headers[h] || '').toString().trim().toUpperCase() === 'KEHADIRAN') {
      colKehadiran = h + 1;
      break;
    }
  }

  // Pastikan Kolum KEHADIRAN mempunyai Header jika belum ada
  var headerVal = pesertaSheet.getRange(1, colKehadiran).getValue();
  if (!headerVal || headerVal.toString().trim() === '') {
    pesertaSheet.getRange(1, colKehadiran).setValue('KEHADIRAN');
  }

  var lastRow = pesertaSheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, message: 'Tiada data dalam Sheet PESERTA' };
  }

  var data = pesertaSheet.getRange(2, 1, lastRow - 1, Math.max(colKehadiran, 13)).getValues();
  var updatedCount = 0;

  // Cipta lookup map untuk kemaskini pantas
  var updateMap = {};
  for (var u = 0; u < updates.length; u++) {
    var item = updates[u];
    var icKey = normalizeIc(item.noIc);
    if (icKey) updateMap[icKey] = item.kehadiran || 'HADIR';
    if (item.idPeserta) updateMap[item.idPeserta.toString().trim().toUpperCase()] = item.kehadiran || 'HADIR';
  }

  for (var i = 0; i < data.length; i++) {
    var rowId = (data[i][0] || '').toString().trim().toUpperCase();
    var rowIc = normalizeIc(data[i][3]);

    if (updateMap[rowIc] !== undefined || updateMap[rowId] !== undefined) {
      var statusKehadiran = updateMap[rowIc] !== undefined ? updateMap[rowIc] : updateMap[rowId];
      // Tulis terus ke sel lajur kehadiran
      pesertaSheet.getRange(i + 2, colKehadiran).setValue(statusKehadiran);
      updatedCount++;
    }
  }

  recordLog('SAH_KEHADIRAN', '', '', 'URUS_SETIA', 'Kehadiran ' + updatedCount + ' peserta telah disahkan');
  return {
    success: true,
    message: 'Berjaya mengemaskini kehadiran ' + updatedCount + ' peserta.',
    updatedCount: updatedCount
  };
}

/**
 * 5B. SKRIP PEMBERSIHAN AUTOMATIK DATA KELUARGA
 * Menyelaraskan status Individu vs Keluarga & membina ID unik berasaskan No. IC Ketua
 */
function betulkanDataKeluarga() {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.PESERTA);
  if (!sheet) {
    return { success: false, message: "Tab 'PESERTA' tidak dijumpai!" };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, message: "Tiada data peserta untuk dibersihkan." };
  }

  var headers = data[0];
  var colIndex = {
    nama: headers.indexOf("NAMA"),
    noIc: headers.indexOf("NO_IC"),
    jenis: headers.indexOf("JENIS_PENDAFTARAN"),
    status: headers.indexOf("STATUS_KELUARGA"),
    idKeluarga: headers.indexOf("ID_KELUARGA"),
    icKetua: headers.indexOf("IC_KETUA_KELUARGA"),
    namaKetua: headers.indexOf("NAMA_KETUA_KELUARGA"),
    hubungan: headers.indexOf("HUBUNGAN_KETUA")
  };

  var ketuaDenganTanggungan = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var icKetua = (row[colIndex.icKetua] || "").toString().replace(/[^0-9]/g, "");
    var hubungan = (row[colIndex.hubungan] || "").toString().trim().toUpperCase();
    if (icKetua && hubungan !== "DIRI SENDIRI" && hubungan !== "" && hubungan !== "KETUA") {
      ketuaDenganTanggungan[icKetua] = true;
    }
  }

  var countDitukarIndividu = 0;
  var countKeluargaDibina = 0;

  for (var j = 1; j < data.length; j++) {
    var pRow = data[j];
    var noIc = (pRow[colIndex.noIc] || "").toString().replace(/[^0-9]/g, "");
    var pIcKetua = (pRow[colIndex.icKetua] || "").toString().replace(/[^0-9]/g, "");
    var pHub = (pRow[colIndex.hubungan] || "").toString().trim().toUpperCase();

    // 1. Tanggungan (Isteri / Anak)
    if (pHub !== "DIRI SENDIRI" && pHub !== "" && pHub !== "KETUA" && pIcKetua) {
      pRow[colIndex.jenis] = "KELUARGA";
      pRow[colIndex.status] = "AHLI";
      pRow[colIndex.idKeluarga] = "FAM-" + pIcKetua.slice(-6);
    }
    // 2. Ketua yang ada tanggungan
    else if (ketuaDenganTanggungan[noIc]) {
      pRow[colIndex.jenis] = "KELUARGA";
      pRow[colIndex.status] = "KETUA";
      pRow[colIndex.idKeluarga] = "FAM-" + noIc.slice(-6);
      pRow[colIndex.icKetua] = noIc;
      pRow[colIndex.hubungan] = "DIRI SENDIRI";
      countKeluargaDibina++;
    }
    // 3. Individu seorang diri
    else {
      pRow[colIndex.jenis] = "INDIVIDU";
      pRow[colIndex.status] = "INDIVIDU";
      pRow[colIndex.idKeluarga] = "";
      pRow[colIndex.icKetua] = "";
      pRow[colIndex.namaKetua] = "";
      pRow[colIndex.hubungan] = "DIRI SENDIRI";
      countDitukarIndividu++;
    }
  }

  sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  return {
    success: true,
    message: "Pembersihan Selesai! Individu: " + countDitukarIndividu + ", Keluarga: " + countKeluargaDibina
  };
}

/**
 * 6. WEB APP ROUTING (doGet & doPost)
 */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      return handleApiGet(e);
    }
    try {
      return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle(CONFIG.PROGRAM_NAME + ' - Pendaftaran Peserta')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (tmplErr) {
      return HtmlService.createHtmlOutput(getEmbeddedHtml())
        .setTitle(CONFIG.PROGRAM_NAME + ' - Pendaftaran Peserta')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || 'submit';
    var responseData;

    if (action === 'submit') {
      responseData = submitRegistration(payload.data || payload);
    } else if (action === 'searchKetua') {
      responseData = searchKetuaKeluarga(payload.icKetua || payload.noIc || (payload.data && (payload.data.icKetua || payload.data.noIc)));
    } else if (action === 'getKeluargaPalingRamai' || action === 'getLeaderboard') {
      responseData = { success: true, data: getKeluargaPalingRamai() };
    } else if (action === 'setup') {
      responseData = sheetSetup();
    } else if (action === 'fixShiftedColumns' || action === 'repair' || action === 'betulkan') {
      responseData = betulkanSusunanLajurSheet();
    } else if (action === 'markAttendance' || action === 'attendance' || action === 'sahKehadiran') {
      responseData = markAttendance(payload);
    } else {
      responseData = { success: false, message: 'Aksi tidak sah' };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleApiGet(e) {
  var action = e.parameter.action;
  var result = {};

  if (action === 'submit') {
    var rawData = e.parameter.data;
    var dataObj = {};
    if (rawData) {
      try {
        dataObj = JSON.parse(rawData);
      } catch(pErr) {
        dataObj = e.parameter;
      }
    } else {
      dataObj = e.parameter;
    }
    result = submitRegistration(dataObj);
  } else if (action === 'searchKetua') {
    result = searchKetuaKeluarga(e.parameter.noIc || e.parameter.icKetua);
  } else if (action === 'getLeaderboard' || action === 'getKeluargaPalingRamai') {
    result = { success: true, data: getKeluargaPalingRamai() };
  } else if (action === 'setup') {
    result = sheetSetup();
  } else if (action === 'fixShiftedColumns' || action === 'repair' || action === 'betulkan') {
    result = betulkanSusunanLajurSheet();
  } else if (action === 'markAttendance' || action === 'attendance' || action === 'sahKehadiran') {
    var rawUpdates = e.parameter.updates;
    var updArray = [];
    if (rawUpdates) {
      try { updArray = JSON.parse(rawUpdates); } catch(err) {}
    }
    result = markAttendance({ updates: updArray, noIc: e.parameter.noIc, kehadiran: e.parameter.kehadiran });
  } else {
    result = { success: false, message: 'Aksi tidak dijumpai' };
  }

  var callback = e.parameter.callback;
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 6. UI FALLBACK
 */
function getEmbeddedHtml() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BRIS WALK</title><style>body{font-family:sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:480px;text-align:center;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}h1{font-size:24px;margin-bottom:8px;font-weight:800}.status{background:#dcfce7;color:#166534;padding:8px 16px;border-radius:8px;font-weight:700;display:inline-block;margin:16px 0;font-size:14px}p{color:#64748b;font-size:14px;line-height:1.6}a{color:#0284c7;text-decoration:none;font-weight:700}</style></head><body><div class="card"><h1>BRIS WALK Backend</h1><div class="status">✓ API & Backend Sedia Digunakan</div><p>Sistem pangkalan data Google Sheet telah aktif dan bersambung dengan sokongan lajur UMUR automatik.</p></div></body></html>';
}
`;

export const INDEX_HTML_CONTENT = `<!DOCTYPE html>
<html lang="ms">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BRIS WALK - Pendaftaran Peserta</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --primary: #0f172a;
      --accent: #0284c7;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 16px; min-height: 100vh; }
    .wrap { max-width: 520px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; color: #334155; }
    .req { color: #dc2626; }
    input, select { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: 14px; outline: none; background: #f8fafc; color: #0f172a; }
    input:focus, select:focus { border-color: var(--accent); background: #ffffff; }
    .age-badge { background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 8px; margin-top: 6px; display: inline-block; border: 1px solid #bbf7d0; }
    .radio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .radio-btn { border: 1px solid var(--border); padding: 12px; border-radius: 10px; cursor: pointer; text-align: center; font-size: 12px; font-weight: 700; display: block; }
    .radio-btn input { display: none; }
    .radio-btn.active { border-color: #0f172a; background: #0f172a; color: white; }
    .search-row { display: flex; gap: 8px; }
    .btn-search { padding: 10px 16px; background: #0f172a; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; }
    .lookup-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-top: 12px; text-align: center; }
    .lookup-box h4 { font-size: 16px; color: #166534; margin: 4px 0 12px; }
    .confirm-btn-row { display: flex; gap: 8px; justify-content: center; }
    .btn-yes { background: #16a34a; color: white; padding: 8px 16px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px; }
    .btn-no { background: #fee2e2; color: #dc2626; padding: 8px 16px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px; }
    .btn-submit { width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 10px; }
    .btn-submit:hover { background: #1e293b; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert { padding: 12px; border-radius: 10px; font-size: 13px; margin-top: 14px; }
    .alert-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
    .alert-ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
    .hidden { display: none !important; }
    .receipt { text-align: center; padding: 10px 0; }
    .receipt-id { font-family: monospace; font-size: 24px; font-weight: 800; background: #f1f5f9; padding: 8px 16px; border-radius: 8px; display: inline-block; margin: 12px 0; border: 1px dashed #cbd5e1; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1 class="brand">BRIS WALK</h1>
      <p class="brand-sub">Sistem Pendaftaran Rasmi Peserta & Keluarga</p>
    </div>

    <!-- Kotak Kejayaan (Resit Rasmi) -->
    <div id="successBox" class="card hidden receipt">
      <div style="font-size: 40px; color: #16a34a;">✓</div>
      <h2 style="font-size: 18px; margin-top: 8px;">Pendaftaran Berjaya!</h2>
      <p style="font-size: 13px; color: #64748b;">Sila simpan ID Peserta rasmi anda:</p>
      <div id="resIdPeserta" class="receipt-id">PES-0000</div>
      <p id="resNama" style="font-weight: 700; margin-bottom: 4px;"></p>
      <p id="resUmur" style="font-size: 13px; color: #166534; font-weight: bold; margin-bottom: 4px;"></p>
      <p id="resKeluargaInfo" style="font-size: 12px; color: #64748b; margin-bottom: 16px;"></p>
      <button onclick="location.reload()" class="btn-submit">Daftar Peserta Baharu</button>
    </div>

    <!-- Borang Pendaftaran -->
    <form id="regForm" class="card" onsubmit="handleFormSubmit(event)">
      <div class="form-group">
        <label>Nama Penuh <span class="req">*</span></label>
        <input type="text" id="nama" required placeholder="NAMA PENUH SEPERTI DALAM IC" oninput="this.value = this.value.toUpperCase()">
      </div>

      <div class="form-group">
        <label>No. Kad Pengenalan <span class="req">*</span></label>
        <input type="tel" inputmode="numeric" id="noIc" required maxlength="12" placeholder="880101081234 (12 digit)" oninput="updateIcAge(this.value)">
        <div id="icAgeDisplay" class="age-badge hidden">✓ Umur: <span id="ageVal">0</span> Tahun</div>
      </div>

      <div class="form-group">
        <label>No. Telefon <span class="req">*</span></label>
        <input type="tel" inputmode="numeric" id="noTelefon" required maxlength="11" placeholder="0123456789" oninput="this.value = this.value.replace(/\\D/g, '')">
      </div>

      <div class="form-group">
        <label>Jenis Pendaftaran <span class="req">*</span></label>
        <div class="radio-grid">
          <div id="optIndividu" class="radio-btn active" onclick="setJenis('INDIVIDU')">INDIVIDU</div>
          <div id="optKeluarga" class="radio-btn" onclick="setJenis('KELUARGA')">KELUARGA</div>
        </div>
      </div>

      <div id="keluargaWrap" class="hidden">
        <div class="form-group">
          <label>Status Dalam Keluarga <span class="req">*</span></label>
          <div class="radio-grid">
            <div id="optKetua" class="radio-btn active" onclick="setStatus('KETUA')">KETUA KELUARGA</div>
            <div id="optAhli" class="radio-btn" onclick="setStatus('AHLI')">AHLI KELUARGA</div>
          </div>
        </div>

        <div id="ahliWrap" class="hidden">
          <div class="form-group">
            <label>Carian IC Ketua Keluarga <span class="req">*</span></label>
            <div class="search-row">
              <input type="tel" inputmode="numeric" id="icKetuaInput" maxlength="12" placeholder="No. IC 12 digit Ketua" oninput="this.value = this.value.replace(/\\D/g, '')">
              <button type="button" class="btn-search" onclick="cariKetua()">Cari Ketua</button>
            </div>
          </div>

          <div id="lookupFound" class="lookup-box hidden">
            <p style="font-size: 11px; font-weight: 700; color: #15803d;">KETUA KELUARGA DIJUMPAI:</p>
            <h4 id="foundNamaKetua">-</h4>
            <div id="confirmGroup" class="confirm-btn-row">
              <button type="button" class="btn-yes" onclick="sahkanKetua(true)">✓ YA, BETUL</button>
              <button type="button" class="btn-no" onclick="sahkanKetua(false)">✕ BUKAN</button>
            </div>
          </div>

          <div id="hubunganWrap" class="form-group hidden" style="margin-top: 14px;">
            <label>Hubungan Dengan Ketua <span class="req">*</span></label>
            <select id="hubunganSelect">
              <option value="">-- Pilih Hubungan --</option>
              <option value="ISTERI">ISTERI</option>
              <option value="ANAK">ANAK</option>
            </select>
          </div>
        </div>
      </div>

      <div id="alertBox" class="alert hidden"></div>

      <button type="submit" id="btnSubmit" class="btn-submit">Hantar Pendaftaran</button>
    </form>
  </div>

  <script>
    var isKeluarga = false;
    var statusKeluarga = 'KETUA';
    var ketuaSah = null;
    var currentAge = 0;

    function updateIcAge(raw) {
      var clean = raw.replace(/\\D/g, '');
      document.getElementById('noIc').value = clean;
      if (clean.length === 12) {
        var yy = parseInt(clean.substring(0, 2), 10);
        var curY = new Date().getFullYear();
        var birthY = (yy <= (curY % 100)) ? (2000 + yy) : (1900 + yy);
        currentAge = curY - birthY;
        document.getElementById('ageVal').innerText = currentAge;
        document.getElementById('icAgeDisplay').classList.remove('hidden');
      } else {
        document.getElementById('icAgeDisplay').classList.add('hidden');
      }
    }

    function setJenis(t) {
      isKeluarga = (t === 'KELUARGA');
      document.getElementById('optIndividu').className = isKeluarga ? 'radio-btn' : 'radio-btn active';
      document.getElementById('optKeluarga').className = isKeluarga ? 'radio-btn active' : 'radio-btn';
      document.getElementById('keluargaWrap').className = isKeluarga ? '' : 'hidden';
    }

    function setStatus(s) {
      statusKeluarga = s;
      document.getElementById('optKetua').className = (s === 'KETUA') ? 'radio-btn active' : 'radio-btn';
      document.getElementById('optAhli').className = (s === 'AHLI') ? 'radio-btn active' : 'radio-btn';
      document.getElementById('ahliWrap').className = (s === 'AHLI') ? '' : 'hidden';
    }

    function cariKetua() {
      var ic = document.getElementById('icKetuaInput').value.trim();
      if (ic.length !== 12) {
        alert('Sila masukkan No. IC 12 digit ketua keluarga');
        return;
      }
      google.script.run.withSuccessHandler(function(res) {
        if (res && res.found) {
          ketuaSah = res;
          document.getElementById('foundNamaKetua').innerText = res.namaKetua + ' (' + res.idKeluarga + ')';
          document.getElementById('lookupFound').classList.remove('hidden');
        } else {
          ketuaSah = null;
          alert(res ? res.message : 'Ketua keluarga tidak dijumpai');
        }
      }).searchKetuaKeluarga(ic);
    }

    function sahkanKetua(betul) {
      if (betul) {
        document.getElementById('confirmGroup').innerHTML = '<span style="color:#15803d;font-weight:bold;font-size:12px;">✓ DISAHKAN</span>';
        document.getElementById('hubunganWrap').classList.remove('hidden');
      } else {
        ketuaSah = null;
        document.getElementById('lookupFound').classList.add('hidden');
        document.getElementById('hubunganWrap').classList.add('hidden');
      }
    }

    function handleFormSubmit(e) {
      e.preventDefault();
      var nama = document.getElementById('nama').value.trim();
      var noIc = document.getElementById('noIc').value.trim();
      var noTelefon = document.getElementById('noTelefon').value.trim();
      var hubungan = '';

      if (isKeluarga && statusKeluarga === 'AHLI') {
        if (!ketuaSah) {
          alert('Sila sahkan ketua keluarga terlebih dahulu.');
          return;
        }
        hubungan = document.getElementById('hubunganSelect').value;
        if (!hubungan) {
          alert('Sila pilih hubungan (ISTERI atau ANAK).');
          return;
        }
        if (hubungan === 'ANAK' && ketuaSah.umurKetua && currentAge >= ketuaSah.umurKetua) {
          alert('Umur anak (' + currentAge + ' thn) tidak boleh lebih tua atau sama dengan ketua (' + ketuaSah.umurKetua + ' thn).');
          return;
        }
      }

      var btn = document.getElementById('btnSubmit');
      btn.disabled = true;
      btn.innerText = 'Memproses...';

      var payload = {
        nama: nama,
        noIc: noIc,
        umur: currentAge,
        noTelefon: noTelefon,
        isKeluarga: isKeluarga,
        statusKeluargaOption: statusKeluarga,
        icKetuaSearch: ketuaSah ? ketuaSah.icKetua : '',
        hubunganKetua: hubungan
      };

      google.script.run.withSuccessHandler(function(res) {
        btn.disabled = false;
        btn.innerText = 'Hantar Pendaftaran';
        if (res && res.success) {
          document.getElementById('regForm').classList.add('hidden');
          document.getElementById('successBox').classList.remove('hidden');
          document.getElementById('resIdPeserta').innerText = res.data.idPeserta;
          document.getElementById('resNama').innerText = res.data.nama;
          document.getElementById('resUmur').innerText = 'Umur: ' + (res.data.umur || currentAge) + ' Tahun';
          if (res.data.idKeluarga) {
            document.getElementById('resKeluargaInfo').innerText = 'ID Keluarga: ' + res.data.idKeluarga + ' | Status: ' + res.data.statusKeluarga;
          }
        } else {
          var ab = document.getElementById('alertBox');
          ab.className = 'alert alert-err';
          ab.innerText = res ? res.message : 'Ralat tidak diketahui';
          ab.classList.remove('hidden');
        }
      }).withFailureHandler(function(err) {
        btn.disabled = false;
        btn.innerText = 'Hantar Pendaftaran';
        alert('Ralat pelayan: ' + err.message);
      }).submitRegistration(payload);
    }
  </script>
</body>
</html>
`;

export const GAS_FILES: GasFile[] = [
  {
    name: 'Code.gs',
    type: 'gs',
    description: 'Skrip Utama Google Apps Script: Pangkalan Data, Validasi Umur, Leaderboard, doGet & doPost.',
    code: CODE_GS_CONTENT
  },
  {
    name: 'Index.html',
    type: 'html',
    description: 'Antara Muka HTML / UI Pendaftaran (Bina fail baru jenis HTML di Apps Script).',
    code: INDEX_HTML_CONTENT
  }
];

export const ALL_GAS_COMBINED_CODE = CODE_GS_CONTENT;
