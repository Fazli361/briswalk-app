/**
 * Utility to calculate age, birth year, and gender from Malaysian 12-digit IC (YYMMDD-PB-###G)
 */
export interface IcDetails {
  isValid: boolean;
  age: number;
  birthYear: number;
  birthDateFormatted: string; // e.g. "14 Dis 2005"
  gender: 'LELAKI' | 'PEREMPUAN';
  errorMessage?: string;
}

const MONTH_NAMES_MS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
];

/**
 * Normalise Malaysian IC to ensure strictly 12 digits.
 * If Google Sheet or input stripped the leading '0' (e.g. '040817086585' became 11-digit '40817086585'),
 * this function automatically restores the leading zero(s).
 */
export function normalizeMalaysianIc(rawIc: string | number | null | undefined): string {
  if (rawIc === null || rawIc === undefined) return '';
  const clean = String(rawIc).replace(/\D/g, '');
  if (!clean) return '';
  // If 10 or 11 digits due to leading zero truncation in spreadsheets
  if (clean.length >= 10 && clean.length <= 11) {
    return clean.padStart(12, '0');
  }
  return clean;
}

export function parseMalaysianIc(rawIc: string | number): IcDetails | null {
  const clean = normalizeMalaysianIc(rawIc);
  if (clean.length !== 12) {
    return null;
  }

  const yy = parseInt(clean.substring(0, 2), 10);
  const mm = parseInt(clean.substring(2, 4), 10);
  const dd = parseInt(clean.substring(4, 6), 10);
  const lastDigit = parseInt(clean.substring(11, 12), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return {
      isValid: false,
      age: 0,
      birthYear: 0,
      birthDateFormatted: '',
      gender: 'LELAKI',
      errorMessage: 'Format tarikh lahir dalam No. IC tidak sah.'
    };
  }

  const currentYear = new Date().getFullYear();
  const current2DigitYear = currentYear % 100;

  // Malaysian IC year determination:
  // If YY <= current 2-digit year (e.g. 26), year is 20YY (2000-2026)
  // Else year is 19YY (1927-1999)
  let fullYear: number;
  if (yy <= current2DigitYear) {
    fullYear = 2000 + yy;
  } else {
    fullYear = 1900 + yy;
  }

  const age = Math.max(0, currentYear - fullYear);
  const monthName = MONTH_NAMES_MS[mm - 1] || '';
  const birthDateFormatted = `${dd} ${monthName} ${fullYear}`;
  const gender: 'LELAKI' | 'PEREMPUAN' = (lastDigit % 2 === 0) ? 'PEREMPUAN' : 'LELAKI';

  return {
    isValid: true,
    age,
    birthYear: fullYear,
    birthDateFormatted,
    gender
  };
}

/**
 * Validate age difference between Ketua Keluarga and Anak
 */
export function validateChildAgeRelationship(
  parentAge: number,
  childAge: number
): { valid: boolean; message?: string } {
  // A child cannot be older than or same age as the parent
  if (childAge >= parentAge) {
    return {
      valid: false,
      message: `Tidak munasabah: Umur anak (${childAge} tahun) tidak boleh lebih tua atau sama umur dengan ketua keluarga (${parentAge} tahun).`
    };
  }

  // Minimum biological / logical age gap (e.g. at least 15 years gap)
  const gap = parentAge - childAge;
  if (gap < 14) {
    return {
      valid: false,
      message: `Perbezaan umur antara ketua (${parentAge} thn) dan anak (${childAge} thn) hanya ${gap} tahun. Sila semak semula maklumat pendaftaran.`
    };
  }

  return { valid: true };
}
