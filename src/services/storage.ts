import { PesertaRecord, KeluargaRecord, LogRecord, RegistrationFormData, LookupKetuaResult, KeluargaStatsItem, SortedAhliItem } from '../types';
import { parseMalaysianIc, normalizeMalaysianIc, validateChildAgeRelationship } from '../utils/icUtils';

const STORAGE_KEYS = {
  PESERTA: 'briswalk_peserta_v1',
  KELUARGA: 'briswalk_keluarga_v1',
  LOGS: 'briswalk_logs_v1',
  GAS_WEBAPP_URL: 'briswalk_gas_url_v1',
};

// Initial realistic data matching specifications (with accurate age calculation)
const INITIAL_PESERTA: PesertaRecord[] = [
  {
    idPeserta: 'PES-0001',
    tarikhDaftar: '2026-08-20 08:30:00',
    nama: 'AHMAD BIN ALI',
    noIc: '800101081234',
    umur: 46,
    noTelefon: '0123456789',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'KETUA',
    idKeluarga: 'FAM-0001',
    icKetuaKeluarga: '800101081234',
    namaKetuaKeluarga: 'AHMAD BIN ALI',
    hubunganKetua: 'KETUA'
  },
  {
    idPeserta: 'PES-0002',
    tarikhDaftar: '2026-08-20 08:35:10',
    nama: 'SITI NURHALIZA BINTI OMAR',
    noIc: '830512085678',
    umur: 43,
    noTelefon: '0139876543',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'AHLI',
    idKeluarga: 'FAM-0001',
    icKetuaKeluarga: '800101081234',
    namaKetuaKeluarga: 'AHMAD BIN ALI',
    hubunganKetua: 'ISTERI'
  },
  {
    idPeserta: 'PES-0003',
    tarikhDaftar: '2026-08-20 08:40:22',
    nama: 'MUHAMMAD DANISH BIN AHMAD',
    noIc: '100415083321',
    umur: 16,
    noTelefon: '0198765432',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'AHLI',
    idKeluarga: 'FAM-0001',
    icKetuaKeluarga: '800101081234',
    namaKetuaKeluarga: 'AHMAD BIN ALI',
    hubunganKetua: 'ANAK'
  },
  {
    idPeserta: 'PES-0004',
    tarikhDaftar: '2026-08-20 09:15:00',
    nama: 'ZULKIFLI BIN ISMAIL',
    noIc: '780315034567',
    umur: 48,
    noTelefon: '0171234567',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'KETUA',
    idKeluarga: 'FAM-0002',
    icKetuaKeluarga: '780315034567',
    namaKetuaKeluarga: 'ZULKIFLI BIN ISMAIL',
    hubunganKetua: 'KETUA'
  },
  {
    idPeserta: 'PES-0005',
    tarikhDaftar: '2026-08-20 09:20:00',
    nama: 'NOR AINI BINTI MOHD',
    noIc: '810722037890',
    umur: 45,
    noTelefon: '0179876543',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'AHLI',
    idKeluarga: 'FAM-0002',
    icKetuaKeluarga: '780315034567',
    namaKetuaKeluarga: 'ZULKIFLI BIN ISMAIL',
    hubunganKetua: 'ISTERI'
  },
  {
    idPeserta: 'PES-0006',
    tarikhDaftar: '2026-08-20 09:25:00',
    nama: 'AIMAN BIN ZULKIFLI',
    noIc: '080910031122',
    umur: 18,
    noTelefon: '0174445556',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'AHLI',
    idKeluarga: 'FAM-0002',
    icKetuaKeluarga: '780315034567',
    namaKetuaKeluarga: 'ZULKIFLI BIN ISMAIL',
    hubunganKetua: 'ANAK'
  },
  {
    idPeserta: 'PES-0007',
    tarikhDaftar: '2026-08-20 09:30:00',
    nama: 'AISYAH BINTI ZULKIFLI',
    noIc: '121105039988',
    umur: 14,
    noTelefon: '0176667778',
    jenisPendaftaran: 'KELUARGA',
    statusKeluarga: 'AHLI',
    idKeluarga: 'FAM-0002',
    icKetuaKeluarga: '780315034567',
    namaKetuaKeluarga: 'ZULKIFLI BIN ISMAIL',
    hubunganKetua: 'ANAK'
  },
  {
    idPeserta: 'PES-0008',
    tarikhDaftar: '2026-08-20 10:00:00',
    nama: 'TAN CHEE KEONG',
    noIc: '900808086677',
    umur: 36,
    noTelefon: '0165551234',
    jenisPendaftaran: 'INDIVIDU',
    statusKeluarga: '',
    idKeluarga: '',
    icKetuaKeluarga: '',
    namaKetuaKeluarga: '',
    hubunganKetua: ''
  }
];

const INITIAL_KELUARGA: KeluargaRecord[] = [
  {
    idKeluarga: 'FAM-0001',
    icKetua: '800101081234',
    namaKetua: 'AHMAD BIN ALI',
    umurKetua: 46,
    noTelefonKetua: '0123456789',
    tarikhDaftar: '2026-08-20 08:30:00',
    jumlahAhli: 3
  },
  {
    idKeluarga: 'FAM-0002',
    icKetua: '780315034567',
    namaKetua: 'ZULKIFLI BIN ISMAIL',
    umurKetua: 48,
    noTelefonKetua: '0171234567',
    tarikhDaftar: '2026-08-20 09:15:00',
    jumlahAhli: 4
  }
];

const INITIAL_LOGS: LogRecord[] = [
  {
    timestamp: '2026-08-20 08:30:00',
    action: 'PENDAFTARAN_KETUA_KELUARGA',
    idPeserta: 'PES-0001',
    noIc: '800101081234',
    user: 'WEB_APP',
    details: 'Ketua Keluarga: FAM-0001'
  }
];

export class StorageService {
  static getPesertaList(): PesertaRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PESERTA);
      if (data === null) {
        localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
        return [];
      }
      const list: any[] = JSON.parse(data);
      // Ensure umur is populated for all records
      return list.map(item => {
        if (typeof item.umur !== 'number') {
          const parsed = parseMalaysianIc(item.noIc);
          item.umur = parsed ? parsed.age : 0;
        }
        return item;
      });
    } catch {
      return [];
    }
  }

  static getKeluargaList(): KeluargaRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KELUARGA);
      if (data === null) {
        localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify([]));
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static getLogs(): LogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data === null) {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static getGasUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.GAS_WEBAPP_URL) || '';
  }

  static setGasUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.GAS_WEBAPP_URL, url.trim());
  }

  static addLog(action: string, idPeserta: string, noIc: string, details: string) {
    const logs = this.getLogs();
    const newLog: LogRecord = {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action,
      idPeserta,
      noIc,
      user: 'WEB_APP',
      details
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 100)));
  }

  /**
   * Search for Ketua Keluarga by 12-digit IC
   */
  static searchKetuaKeluarga(icInput: string): LookupKetuaResult {
    const cleanedIc = normalizeMalaysianIc(icInput);
    if (cleanedIc.length !== 12) {
      return { found: false, message: 'No. Kad Pengenalan mestilah 12 digit nombor.' };
    }

    const icInfo = parseMalaysianIc(cleanedIc);
    const umurKetua = icInfo ? icInfo.age : 0;

    const keluargaList = this.getKeluargaList();
    const foundInKeluarga = keluargaList.find(k => normalizeMalaysianIc(k.icKetua) === cleanedIc);

    if (foundInKeluarga) {
      return {
        found: true,
        idKeluarga: foundInKeluarga.idKeluarga,
        namaKetua: foundInKeluarga.namaKetua,
        icKetua: foundInKeluarga.icKetua,
        umurKetua: foundInKeluarga.umurKetua || umurKetua,
        noTelefonKetua: foundInKeluarga.noTelefonKetua
      };
    }

    // Secondary check in PESERTA sheet for status KETUA
    const pesertaList = this.getPesertaList();
    const foundInPeserta = pesertaList.find(
      p => normalizeMalaysianIc(p.noIc) === cleanedIc && p.statusKeluarga === 'KETUA'
    );

    if (foundInPeserta && foundInPeserta.idKeluarga) {
      return {
        found: true,
        idKeluarga: foundInPeserta.idKeluarga,
        namaKetua: foundInPeserta.nama,
        icKetua: foundInPeserta.noIc,
        umurKetua: foundInPeserta.umur || umurKetua,
        noTelefonKetua: foundInPeserta.noTelefon
      };
    }

    return {
      found: false,
      message: 'Ketua keluarga belum berdaftar. Sila minta ketua keluarga membuat pendaftaran terlebih dahulu.'
    };
  }

  /**
   * Local submission engine with strict validations matching Apps Script backend
   */
  static registerPeserta(formData: RegistrationFormData): { success: boolean; message?: string; data?: PesertaRecord } {
    // 1. Clean & format input
    const nama = formData.nama.trim().replace(/\s+/g, ' ').toUpperCase();
    const noIc = formData.noIc.replace(/\D/g, '');
    const noTelefon = formData.noTelefon.replace(/\D/g, '');
    const isKeluarga = formData.isKeluarga === true;

    // 2. Strict Validations
    if (!nama || nama.length < 3) {
      return { success: false, message: 'Sila masukkan Nama Penuh yang sah (sekurang-kurangnya 3 aksara).' };
    }

    if (!/^[0-9]{12}$/.test(noIc)) {
      return { success: false, message: 'No. Kad Pengenalan mestilah tepat 12 digit nombor sahaja.' };
    }

    const icParsed = parseMalaysianIc(noIc);
    if (!icParsed || !icParsed.isValid) {
      return { success: false, message: icParsed?.errorMessage || 'Format No. Kad Pengenalan tidak sah.' };
    }
    const umur = icParsed.age;

    if (!/^[0-9]{10,11}$/.test(noTelefon)) {
      return { success: false, message: 'No. Telefon mestilah 10 atau 11 digit nombor sahaja.' };
    }

    const pesertaList = this.getPesertaList();

    // Check duplicate IC (No. Kad Pengenalan mesti unik, No. Telefon dibenarkan sama/duplicate)
    if (pesertaList.some(p => normalizeMalaysianIc(p.noIc) === noIc)) {
      return { success: false, message: `No. Kad Pengenalan ini (${noIc}) telah pun berdaftar.` };
    }

    // Generate new PES-XXXX
    let maxPesNum = 0;
    pesertaList.forEach(p => {
      const match = p.idPeserta.match(/PES-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxPesNum) maxPesNum = num;
      }
    });
    const idPeserta = `PES-${String(maxPesNum + 1).padStart(4, '0')}`;
    const now = new Date();
    const tarikhDaftar = now.toISOString().replace('T', ' ').slice(0, 19);

    let jenisPendaftaran: 'INDIVIDU' | 'KELUARGA' = 'INDIVIDU';
    let statusKeluarga: '' | 'KETUA' | 'AHLI' = '';
    let idKeluarga = '';
    let icKetuaKeluarga = '';
    let namaKetuaKeluarga = '';
    let hubunganKetua: '' | 'KETUA' | 'ISTERI' | 'ANAK' = '';

    const keluargaList = this.getKeluargaList();

    if (!isKeluarga) {
      // Individual registration
      jenisPendaftaran = 'INDIVIDU';
      statusKeluarga = '';
      idKeluarga = '';
      icKetuaKeluarga = '';
      namaKetuaKeluarga = '';
      hubunganKetua = '';
    } else {
      jenisPendaftaran = 'KELUARGA';

      if (formData.statusKeluargaOption === 'KETUA KELUARGA') {
        // Family Head
        statusKeluarga = 'KETUA';
        icKetuaKeluarga = noIc;
        namaKetuaKeluarga = nama;
        hubunganKetua = 'KETUA';

        // Generate FAM-XXXX based on Ketua's 6 last digits of IC for uniqueness and consistency
        idKeluarga = `FAM-${noIc.slice(-6)}`;

        // Check if this family ID already exists or update
        const existingKeluargaIndex = keluargaList.findIndex(k => k.idKeluarga === idKeluarga || k.icKetua === noIc);
        if (existingKeluargaIndex >= 0) {
          keluargaList[existingKeluargaIndex].namaKetua = nama;
          keluargaList[existingKeluargaIndex].umurKetua = umur;
          keluargaList[existingKeluargaIndex].noTelefonKetua = noTelefon;
          localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify(keluargaList));
        } else {
          // Create new family record
          const newKeluarga: KeluargaRecord = {
            idKeluarga,
            icKetua: noIc,
            namaKetua: nama,
            umurKetua: umur,
            noTelefonKetua: noTelefon,
            tarikhDaftar,
            jumlahAhli: 1
          };
          keluargaList.push(newKeluarga);
          localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify(keluargaList));
        }
        this.addLog('PENDAFTARAN_KETUA_KELUARGA', idPeserta, noIc, `Ketua Keluarga: ${idKeluarga} (Umur: ${umur})`);

      } else if (formData.statusKeluargaOption === 'AHLI KELUARGA') {
        // Family Member
        statusKeluarga = 'AHLI';
        const searchRes = this.searchKetuaKeluarga(formData.icKetuaSearch);
        if (!searchRes.found || !searchRes.idKeluarga) {
          return {
            success: false,
            message: 'Ketua keluarga belum berdaftar. Sila minta ketua keluarga membuat pendaftaran terlebih dahulu.'
          };
        }

        if (!formData.hubunganKetua || (formData.hubunganKetua !== 'ISTERI' && formData.hubunganKetua !== 'ANAK')) {
          return {
            success: false,
            message: 'Hubungan dengan Ketua Keluarga mestilah sama ada ISTERI atau ANAK sahaja.'
          };
        }

        // Smart Anti-Fraud Age Validation for ANAK
        if (formData.hubunganKetua === 'ANAK') {
          const parentAge = searchRes.umurKetua || parseMalaysianIc(searchRes.icKetua || '')?.age || 40;
          const ageCheck = validateChildAgeRelationship(parentAge, umur);
          if (!ageCheck.valid) {
            return {
              success: false,
              message: ageCheck.message || 'Umur tidak munasabah untuk status anak.'
            };
          }
        }

        idKeluarga = searchRes.idKeluarga;
        icKetuaKeluarga = searchRes.icKetua || formData.icKetuaSearch;
        namaKetuaKeluarga = searchRes.namaKetua || '';
        hubunganKetua = formData.hubunganKetua;

        this.addLog('PENDAFTARAN_AHLI_KELUARGA', idPeserta, noIc, `Ahli ${idKeluarga} (${hubunganKetua}, Umur: ${umur})`);
      } else {
        return { success: false, message: 'Sila pilih status anda dalam keluarga.' };
      }
    }

    // Create participant record
    const newPeserta: PesertaRecord = {
      idPeserta,
      tarikhDaftar,
      nama,
      noIc,
      umur,
      noTelefon,
      jenisPendaftaran,
      statusKeluarga,
      idKeluarga,
      icKetuaKeluarga,
      namaKetuaKeluarga,
      hubunganKetua
    };

    pesertaList.push(newPeserta);
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(pesertaList));

    // Update JUMLAH_AHLI in Keluarga list
    if (isKeluarga && idKeluarga) {
      const totalMembers = pesertaList.filter(p => p.idKeluarga === idKeluarga).length;
      const kIndex = keluargaList.findIndex(k => k.idKeluarga === idKeluarga);
      if (kIndex >= 0) {
        keluargaList[kIndex].jumlahAhli = totalMembers;
        localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify(keluargaList));
      }
    }

    this.addLog('PENDAFTARAN_PESERTA', idPeserta, noIc, `Pendaftaran ${jenisPendaftaran} (${idPeserta})`);

    return {
      success: true,
      data: newPeserta
    };
  }

  /**
   * Susun Ahli Keluarga Mengikut Hierarki Rasmi:
   * 1. KETUA
   * 2. ISTERI (jika ada)
   * 3. ANAK 1, ANAK 2, ANAK 3... (disusun mengikut UMUR tertua ke termuda)
   */
  static sortFamilyMembers(members: PesertaRecord[]): SortedAhliItem[] {
    const ketuas: PesertaRecord[] = [];
    const isteris: PesertaRecord[] = [];
    const anaks: PesertaRecord[] = [];

    members.forEach(m => {
      const hub = (m.hubunganKetua || '').toUpperCase().trim();
      const stat = (m.statusKeluarga || '').toUpperCase().trim();

      if (stat === 'KETUA' || hub === 'KETUA') {
        ketuas.push(m);
      } else if (hub === 'ISTERI' || hub === 'PASANGAN' || hub === 'SUAMI') {
        isteris.push(m);
      } else if (hub === 'ANAK') {
        anaks.push(m);
      } else {
        // Jika tidak dinyatakan tetapi ada dalam keluarga:
        // Jika IC sama dengan IC Ketua -> KETUA, jika umur dewasa -> ISTERI/KETUA, selainnya ANAK
        if (m.noIc && m.icKetuaKeluarga && m.noIc === m.icKetuaKeluarga) {
          ketuas.push(m);
        } else if (m.umur && m.umur >= 25 && ketuas.length > 0 && isteris.length === 0) {
          isteris.push(m);
        } else {
          anaks.push(m);
        }
      }
    });

    // Sekiranya tiada KETUA dikesan secara eksplisit, pilih ahli dewasa tertua sebagai Ketua
    if (ketuas.length === 0 && members.length > 0) {
      if (isteris.length > 0) {
        ketuas.push(isteris.shift()!);
      } else {
        // Ambil ahli tertua
        const sortedByAge = [...anaks].sort((a, b) => (b.umur || 0) - (a.umur || 0));
        if (sortedByAge.length > 0) {
          const eldest = sortedByAge[0];
          const idx = anaks.findIndex(x => x.idPeserta === eldest.idPeserta);
          if (idx >= 0) anaks.splice(idx, 1);
          ketuas.push(eldest);
        }
      }
    }

    // Susun Isteri mengikut umur tertua
    isteris.sort((a, b) => (b.umur || 0) - (a.umur || 0));

    // SUSUN ANAK MENGIKUT UMUR TERTUA KE TERMUDA (contoh: 18 thn -> 15 thn -> 10 thn -> 4 thn)
    anaks.sort((a, b) => (b.umur || 0) - (a.umur || 0));

    const result: SortedAhliItem[] = [];
    let order = 1;

    // 1. KETUA KELUARGA
    ketuas.forEach(k => {
      result.push({
        ...k,
        statusKeluarga: 'KETUA',
        hubunganKetua: 'KETUA',
        displayRole: 'KETUA',
        orderIndex: order++
      });
    });

    // 2. ISTERI
    isteris.forEach((ist, idx) => {
      result.push({
        ...ist,
        statusKeluarga: 'AHLI',
        hubunganKetua: 'ISTERI',
        displayRole: isteris.length > 1 ? `ISTERI ${idx + 1}` : 'ISTERI',
        orderIndex: order++
      });
    });

    // 3. ANAK 1, ANAK 2, ANAK 3... (mengikut umur tertua)
    anaks.forEach((ank, idx) => {
      result.push({
        ...ank,
        statusKeluarga: 'AHLI',
        hubunganKetua: 'ANAK',
        displayRole: `ANAK ${idx + 1}`,
        orderIndex: order++
      });
    });

    return result;
  }

  /**
   * Calculate "Keluarga Paling Ramai" dynamically strictly based on PESERTA records
   */
  static getKeluargaPalingRamai(): KeluargaStatsItem[] {
    const pesertaList = this.getPesertaList();
    const rawFamMap: { [famId: string]: PesertaRecord[] } = {};
    const famMetaMap: { [famId: string]: { namaKetua: string; icKetua: string; noTelefonKetua: string; umurKetua?: number } } = {};

    pesertaList.forEach(p => {
      if (!p.idKeluarga) return;

      if (!rawFamMap[p.idKeluarga]) {
        rawFamMap[p.idKeluarga] = [];
        famMetaMap[p.idKeluarga] = {
          namaKetua: p.namaKetuaKeluarga || '',
          icKetua: p.icKetuaKeluarga || '',
          noTelefonKetua: '',
          umurKetua: undefined
        };
      }

      rawFamMap[p.idKeluarga].push(p);

      if (p.statusKeluarga === 'KETUA' || p.hubunganKetua === 'KETUA') {
        famMetaMap[p.idKeluarga].namaKetua = p.nama;
        famMetaMap[p.idKeluarga].icKetua = p.noIc;
        famMetaMap[p.idKeluarga].umurKetua = p.umur;
        famMetaMap[p.idKeluarga].noTelefonKetua = p.noTelefon;
      }
    });

    const results: KeluargaStatsItem[] = Object.entries(rawFamMap).map(([idKeluarga, rawMembers]) => {
      // Susun ahli keluarga: KETUA -> ISTERI -> ANAK 1, ANAK 2, ANAK 3 (ikut umur)
      const sortedAhli = this.sortFamilyMembers(rawMembers);
      
      const breakdown = {
        ketua: sortedAhli.filter(a => a.displayRole.startsWith('KETUA')).length,
        isteri: sortedAhli.filter(a => a.displayRole.startsWith('ISTERI')).length,
        anak: sortedAhli.filter(a => a.displayRole.startsWith('ANAK')).length
      };

      const meta = famMetaMap[idKeluarga];
      const ketuaItem = sortedAhli.find(a => a.displayRole === 'KETUA');

      return {
        idKeluarga,
        namaKetua: ketuaItem ? ketuaItem.nama : (meta.namaKetua || 'KETUA KELUARGA'),
        icKetua: ketuaItem ? ketuaItem.noIc : meta.icKetua,
        umurKetua: ketuaItem ? ketuaItem.umur : meta.umurKetua,
        noTelefonKetua: ketuaItem ? ketuaItem.noTelefon : meta.noTelefonKetua,
        totalPeserta: sortedAhli.length,
        breakdown,
        ahliSenarai: sortedAhli
      };
    });

    return results.sort((a, b) => b.totalPeserta - a.totalPeserta);
  }

  static resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(INITIAL_PESERTA));
    localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify(INITIAL_KELUARGA));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    window.dispatchEvent(new CustomEvent('briswalk_data_updated'));
  }

  /**
   * Import / Synchronize fresh data fetched directly from Google Sheet
   * Automatically classifies INDIVIDU vs KELUARGA, links family members, and calculates ages.
   */
  static importFromSheet(freshPeserta: PesertaRecord[], freshKeluarga?: KeluargaRecord[]): { totalPeserta: number; totalKeluarga: number } {
    // 1. Sanitize, calculate IC age and clean fields
    const sanitizedList: PesertaRecord[] = freshPeserta.map((p, idx) => {
      const cleanIc = normalizeMalaysianIc(p.noIc);
      const parsed = parseMalaysianIc(cleanIc);
      const calculatedUmur = parsed ? parsed.age : 0;
      const umur = (typeof p.umur === 'number' && p.umur > 0) ? p.umur : calculatedUmur;

      const rawJenis = (p.jenisPendaftaran || '').toString().toUpperCase();
      const rawStatus = (p.statusKeluarga || '').toString().toUpperCase();
      const rawHubungan = (p.hubunganKetua || '').toString().toUpperCase();
      const cleanIdKeluarga = (p.idKeluarga || '').toString().trim().toUpperCase();
      const cleanIcKetua = normalizeMalaysianIc(p.icKetuaKeluarga);
      const cleanNamaKetua = (p.namaKetuaKeluarga || '').toString().trim().toUpperCase();

      // PENGESAHAN STATUS KELUARGA VS INDIVIDU
      const hasFamilyFlag = 
        rawJenis.includes('KELUARGA') ||
        rawStatus.includes('KETUA') ||
        rawStatus.includes('AHLI') ||
        rawHubungan.includes('KETUA') ||
        rawHubungan.includes('ISTERI') ||
        rawHubungan.includes('ANAK') ||
        rawHubungan.includes('PASANGAN') ||
        rawHubungan.includes('SUAMI') ||
        cleanIdKeluarga.length > 0 ||
        cleanIcKetua.length === 12 ||
        cleanNamaKetua.length > 2;

      const isKeluarga = hasFamilyFlag;
      const jenisPendaftaran: 'INDIVIDU' | 'KELUARGA' = isKeluarga ? 'KELUARGA' : 'INDIVIDU';

      let statusKeluarga: '' | 'KETUA' | 'AHLI' = '';
      if (isKeluarga) {
        if (rawStatus.includes('KETUA') || rawHubungan.includes('KETUA') || (cleanIcKetua && cleanIc === cleanIcKetua)) {
          statusKeluarga = 'KETUA';
        } else {
          statusKeluarga = 'AHLI';
        }
      }

      let hubunganKetua: '' | 'KETUA' | 'ISTERI' | 'ANAK' = '';
      if (isKeluarga) {
        if (statusKeluarga === 'KETUA') {
          hubunganKetua = 'KETUA';
        } else if (rawHubungan.includes('ISTERI') || rawHubungan.includes('PASANGAN') || rawHubungan.includes('SUAMI')) {
          hubunganKetua = 'ISTERI';
        } else {
          hubunganKetua = 'ANAK';
        }
      }

      return {
        idPeserta: p.idPeserta || `PES-${String(idx + 1).padStart(4, '0')}`,
        tarikhDaftar: p.tarikhDaftar || new Date().toISOString().replace('T', ' ').slice(0, 19),
        nama: (p.nama || '').toString().trim().toUpperCase(),
        noIc: cleanIc,
        umur: umur,
        noTelefon: (p.noTelefon || '').toString().replace(/\D/g, ''),
        jenisPendaftaran,
        statusKeluarga,
        idKeluarga: cleanIdKeluarga,
        icKetuaKeluarga: cleanIcKetua,
        namaKetuaKeluarga: cleanNamaKetua,
        hubunganKetua,
        kehadiran: (p.kehadiran || '').toString().trim()
      };
    });

    // 2. AUTO-GROUP & RECONCILE FAMILIES
    // Pastikan semua ahli dalam keluarga yang sama mendapat ID Keluarga yang seragam
    const ketuaIcToFamId: { [ic: string]: string } = {};
    const ketuaNameToFamId: { [name: string]: string } = {};
    let nextFamNum = 1;

    // First pass: Kumpul ID Keluarga dari Ketua yang sedia ada
    sanitizedList.forEach(p => {
      if (p.jenisPendaftaran === 'KELUARGA') {
        if (p.idKeluarga && /^FAM-\d+/i.test(p.idKeluarga)) {
          const match = p.idKeluarga.match(/FAM-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= nextFamNum) nextFamNum = num + 1;
          }
          if (p.statusKeluarga === 'KETUA' || p.hubunganKetua === 'KETUA') {
            if (p.noIc) ketuaIcToFamId[p.noIc] = p.idKeluarga;
            if (p.nama) ketuaNameToFamId[p.nama] = p.idKeluarga;
          }
          if (p.icKetuaKeluarga) ketuaIcToFamId[p.icKetuaKeluarga] = p.idKeluarga;
        }
      }
    });

    // Second pass: Jana FAM-ID untuk Ketua yang belum ada ID Keluarga
    sanitizedList.forEach(p => {
      if (p.jenisPendaftaran === 'KELUARGA') {
        if (!p.idKeluarga) {
          if (p.icKetuaKeluarga && ketuaIcToFamId[p.icKetuaKeluarga]) {
            p.idKeluarga = ketuaIcToFamId[p.icKetuaKeluarga];
          } else if (p.statusKeluarga === 'KETUA' || p.hubunganKetua === 'KETUA') {
            const generatedId = `FAM-${String(nextFamNum++).padStart(4, '0')}`;
            p.idKeluarga = generatedId;
            if (p.noIc) ketuaIcToFamId[p.noIc] = generatedId;
            if (p.nama) ketuaNameToFamId[p.nama] = generatedId;
          }
        }
      }
    });

    // Third pass: Padankan ahli keluarga (ANAK / ISTERI) kepada ID Keluarga Ketua mereka
    sanitizedList.forEach(p => {
      if (p.jenisPendaftaran === 'KELUARGA' && !p.idKeluarga) {
        if (p.icKetuaKeluarga && ketuaIcToFamId[p.icKetuaKeluarga]) {
          p.idKeluarga = ketuaIcToFamId[p.icKetuaKeluarga];
        } else if (p.namaKetuaKeluarga && ketuaNameToFamId[p.namaKetuaKeluarga]) {
          p.idKeluarga = ketuaNameToFamId[p.namaKetuaKeluarga];
        } else {
          // Jika tiada ketua padanan, jadikan kumpulan keluarga tersendiri
          const generatedId = `FAM-${String(nextFamNum++).padStart(4, '0')}`;
          p.idKeluarga = generatedId;
          if (p.icKetuaKeluarga) ketuaIcToFamId[p.icKetuaKeluarga] = generatedId;
        }
      }
    });

    // 3. Bina senarai keluarga yang lengkap
    const cleanKeluarga: KeluargaRecord[] = [];
    const famMap: { [id: string]: PesertaRecord[] } = {};

    sanitizedList.forEach(p => {
      if (p.jenisPendaftaran === 'KELUARGA' && p.idKeluarga) {
        if (!famMap[p.idKeluarga]) famMap[p.idKeluarga] = [];
        famMap[p.idKeluarga].push(p);
      }
    });

    Object.entries(famMap).forEach(([famId, members]) => {
      const sortedAhli = this.sortFamilyMembers(members);
      const ketua = sortedAhli.find(a => a.displayRole === 'KETUA') || sortedAhli[0];
      
      cleanKeluarga.push({
        idKeluarga: famId,
        icKetua: ketua.noIc,
        namaKetua: ketua.nama,
        umurKetua: ketua.umur,
        noTelefonKetua: ketua.noTelefon,
        tarikhDaftar: ketua.tarikhDaftar,
        jumlahAhli: sortedAhli.length
      });
    });

    // 4. Simpan dalam storan aplikasi
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(sanitizedList));
    localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify(cleanKeluarga));
    localStorage.setItem('briswalk_last_sync_time', new Date().toISOString());

    // 5. Rekod Log
    const totalKeluargaPeserta = sanitizedList.filter(p => p.jenisPendaftaran === 'KELUARGA').length;
    const totalIndividu = sanitizedList.filter(p => p.jenisPendaftaran === 'INDIVIDU').length;

    this.addLog(
      'SEDUT_DATA_GOOGLE_SHEET',
      'ALL',
      '-',
      `Berjaya sedut ${sanitizedList.length} peserta: ${totalIndividu} Individu, ${totalKeluargaPeserta} Ahli Keluarga (${cleanKeluarga.length} Kumpulan Keluarga)`
    );

    // 6. Maklumkan kepada semua komponen
    window.dispatchEvent(new CustomEvent('briswalk_data_updated', {
      detail: { count: sanitizedList.length, keluargaCount: cleanKeluarga.length }
    }));

    return {
      totalPeserta: sanitizedList.length,
      totalKeluarga: cleanKeluarga.length
    };
  }

  static getLastSyncTime(): string | null {
    return localStorage.getItem('briswalk_last_sync_time');
  }

  /**
   * Kemaskini status kehadiran peserta (individu atau kumpulan keluarga)
   */
  static updateAttendance(
    pesertaUpdates: { idPeserta?: string; noIc: string; hadir: boolean }[]
  ): { success: boolean; updatedCount: number; list: PesertaRecord[] } {
    const pesertaList = this.getPesertaList();
    let updatedCount = 0;
    const nowStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

    pesertaUpdates.forEach(update => {
      const cleanIc = normalizeMalaysianIc(update.noIc);
      const foundIdx = pesertaList.findIndex(p => 
        (update.idPeserta && p.idPeserta === update.idPeserta) || 
        normalizeMalaysianIc(p.noIc) === cleanIc
      );

      if (foundIdx >= 0) {
        if (update.hadir) {
          pesertaList[foundIdx].kehadiran = pesertaList[foundIdx].kehadiran && pesertaList[foundIdx].kehadiran?.includes('HADIR')
            ? pesertaList[foundIdx].kehadiran
            : `HADIR (${nowStr})`;
        } else {
          pesertaList[foundIdx].kehadiran = '';
        }
        updatedCount++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(pesertaList));
    this.addLog(
      'SAH_KEHADIRAN',
      '-',
      '-',
      `Status kehadiran ${updatedCount} peserta telah dikemaskini`
    );

    window.dispatchEvent(new CustomEvent('briswalk_data_updated'));
    return { success: true, updatedCount, list: pesertaList };
  }

  /**
   * Clear all records to zero (completely blank)
   */
  static clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.KELUARGA, JSON.stringify([]));
    const cleanLog: LogRecord[] = [{
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: 'RESET_SEMUA_DATA',
      idPeserta: '-',
      noIc: '-',
      user: 'SUPERADMIN',
      details: 'Semua rekod peserta & keluarga telah dikosongkan'
    }];
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(cleanLog));
    window.dispatchEvent(new CustomEvent('briswalk_data_updated'));
  }
}
