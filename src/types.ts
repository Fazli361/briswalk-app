export type JenisPendaftaran = 'INDIVIDU' | 'KELUARGA';
export type StatusKeluarga = '' | 'KETUA' | 'AHLI';
export type HubunganKetua = '' | 'KETUA' | 'ISTERI' | 'ANAK';

export interface PesertaRecord {
  idPeserta: string; // PES-0001
  tarikhDaftar: string; // ISO or formatted date
  nama: string; // AUTO UPPERCASE, trimmed
  noIc: string; // 12 digits
  umur: number; // calculated age from IC
  noTelefon: string; // 10-11 digits
  jenisPendaftaran: JenisPendaftaran; // 'INDIVIDU' | 'KELUARGA'
  statusKeluarga: StatusKeluarga; // '' | 'KETUA' | 'AHLI'
  idKeluarga: string; // FAM-0001 or empty
  icKetuaKeluarga: string; // 12 digits or empty
  namaKetuaKeluarga: string; // Name or empty
  hubunganKetua: HubunganKetua; // '' | 'KETUA' | 'ISTERI' | 'ANAK'
  kehadiran?: string; // 'HADIR' | '' or timestamp
}

export interface KeluargaRecord {
  idKeluarga: string; // FAM-0001
  icKetua: string;
  namaKetua: string;
  umurKetua?: number;
  noTelefonKetua: string;
  tarikhDaftar: string;
  jumlahAhli: number; // calculated from PESERTA records
}

export interface LogRecord {
  timestamp: string;
  action: string;
  idPeserta: string;
  noIc: string;
  user: string;
  details: string;
}

export interface RegistrationFormData {
  nama: string;
  noIc: string;
  umur?: number;
  noTelefon: string;
  isKeluarga: boolean | null; // null = unselected, false = TIDAK, true = YA
  statusKeluargaOption: 'KETUA KELUARGA' | 'AHLI KELUARGA' | null;
  icKetuaSearch: string;
  ketuaConfirmed: boolean | null;
  hubunganKetua: 'ISTERI' | 'ANAK' | '';
}

export interface LookupKetuaResult {
  found: boolean;
  message?: string;
  idKeluarga?: string;
  namaKetua?: string;
  icKetua?: string;
  umurKetua?: number;
  noTelefonKetua?: string;
}

export interface SortedAhliItem extends PesertaRecord {
  displayRole: string; // 'KETUA' | 'ISTERI' | 'ANAK 1' | 'ANAK 2' ...
  orderIndex: number;
}

export interface KeluargaStatsItem {
  idKeluarga: string;
  namaKetua: string;
  icKetua: string;
  umurKetua?: number;
  noTelefonKetua: string;
  totalPeserta: number;
  breakdown: {
    ketua: number;
    isteri: number;
    anak: number;
  };
  ahliSenarai: SortedAhliItem[];
}
