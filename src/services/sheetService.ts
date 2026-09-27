import { Participant, SheetConfig } from '../types';

const STORAGE_KEY = 'briskwalk_participants_data';
const CONFIG_KEY = 'briskwalk_sheet_config';

export const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbz4IPBKpqG8bUgOObT2Afsxij9kgjWDNtBC2boa8b522rAkGaAsZWDZ5cFfZIM9qMCQsg/exec';

export const formatDisplayDate = (val?: string): string => {
  if (!val || !val.trim()) return '-';
  const clean = val.replace(/^'/, '').trim();

  // Try standard parse
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Parse DD/MM/YYYY or DD-MM-YYYY format
  const match = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    const timePart = match[4].replace(/^[,\s]+/, '').trim();
    return `${day}/${month}/${year} ${timePart}`.trim();
  }

  return clean;
};

export const getSavedConfig = (): SheetConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let spreadsheetUrl = parsed.spreadsheetUrl || '';
      let scriptUrl = parsed.scriptUrl || '';

      // Backward compatibility: If old sheetUrl was used
      if (!scriptUrl && parsed.sheetUrl) {
        if (parsed.sheetUrl.includes('docs.google.com/spreadsheets')) {
          if (!spreadsheetUrl) spreadsheetUrl = parsed.sheetUrl;
          scriptUrl = DEFAULT_SHEET_URL;
        } else {
          scriptUrl = parsed.sheetUrl;
        }
      }

      if (!scriptUrl) {
        scriptUrl = DEFAULT_SHEET_URL;
      }

      return {
        spreadsheetUrl: spreadsheetUrl.trim(),
        scriptUrl: scriptUrl.trim(),
        sheetUrl: scriptUrl.trim(),
        autoSync: parsed.autoSync ?? true,
        maxParticipants:
          typeof parsed.maxParticipants === 'number' && parsed.maxParticipants > 0
            ? parsed.maxParticipants
            : 100,
        limitEnabled: parsed.limitEnabled ?? true,
      };
    }
  } catch (err) {
    console.error('Failed to read sheet config', err);
  }
  return {
    spreadsheetUrl: '',
    scriptUrl: DEFAULT_SHEET_URL,
    sheetUrl: DEFAULT_SHEET_URL,
    autoSync: true,
    maxParticipants: 100,
    limitEnabled: true,
  };
};

export const saveConfig = (config: SheetConfig): void => {
  try {
    const sanitized: SheetConfig = {
      spreadsheetUrl: config.spreadsheetUrl ? config.spreadsheetUrl.trim() : '',
      scriptUrl: config.scriptUrl ? config.scriptUrl.trim() : DEFAULT_SHEET_URL,
      sheetUrl: config.scriptUrl ? config.scriptUrl.trim() : DEFAULT_SHEET_URL,
      autoSync: config.autoSync ?? true,
      maxParticipants: config.maxParticipants || 100,
      limitEnabled: config.limitEnabled ?? true,
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save sheet config', err);
  }
};

export const getStoredParticipants = (): Participant[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read participants', err);
  }
  return [];
};

export const saveParticipants = (list: Participant[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save participants', err);
  }
};

export const fetchParticipantsFromSheet = async (
  scriptUrl: string,
  spreadsheetUrl?: string
): Promise<{ success: boolean; data?: Participant[]; error?: string }> => {
  const targetScriptUrl = scriptUrl || DEFAULT_SHEET_URL;
  if (!targetScriptUrl || !targetScriptUrl.trim()) {
    return { success: false, error: 'Tiada pautan Google Apps Script.' };
  }

  // If user passed a spreadsheet URL directly
  if (targetScriptUrl.includes('docs.google.com/spreadsheets')) {
    return {
      success: false,
      error: 'URL ini adalah fail Google Sheet biasa, bukan URL Web App Apps Script.',
    };
  }

  try {
    const url = new URL(targetScriptUrl.trim());
    url.searchParams.set('action', 'read');
    if (spreadsheetUrl && spreadsheetUrl.trim()) {
      url.searchParams.set('spreadsheetUrl', spreadsheetUrl.trim());
    }
    url.searchParams.set('_t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: Gagal memuat turun data dari Google Sheet` };
    }

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      if (text.includes('doGet')) {
        return {
          success: false,
          error:
            'Fungsi doGet belum diaktifkan dalam Apps Script Google Sheet. Sila gunakan "Deploy > New deployment" dengan access: Anyone.',
        };
      }
      return {
        success: false,
        error: 'Respons daripada Google Sheet belum mengandungi data JSON yang sah.',
      };
    }

    if (result && Array.isArray(result.data)) {
      const parsed: Participant[] = result.data.map((item: any, idx: number) => ({
        id: item.id || `GS-${item.noKp || idx}-${Date.now()}`,
        nama: String(item.nama || item['Nama Penuh'] || '').trim(),
        noKp: String(item.noKp || item['No. Kad Pengenalan'] || '').replace(/'/g, '').trim(),
        noTel: String(item.noTel || item['No. Telefon'] || '').replace(/'/g, '').trim(),
        timestamp: String(item.timestamp || item['Tarikh & Masa'] || item.tarikhMasa || '').replace(/^'/, '').trim(),
        syncedToSheet: true,
      }));
      return { success: true, data: parsed };
    }

    return { success: false, error: 'Format data Google Sheet tidak dikenali' };
  } catch (err: unknown) {
    console.warn('Notice when fetching from Google Sheet:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tidak dapat memuat turun dari Google Sheet',
    };
  }
};

/**
 * Hantar maklumat peserta ke Google Sheet.
 * HANYA dipanggil apabila pengguna klik butang SUBMIT pada borang pendaftaran.
 */
export const sendParticipantToSheet = async (
  participant: Participant,
  configOrUrl: SheetConfig | string
): Promise<{ success: boolean; error?: string }> => {
  let scriptUrl = '';
  let spreadsheetUrl = '';

  if (typeof configOrUrl === 'string') {
    scriptUrl = configOrUrl;
  } else if (configOrUrl) {
    scriptUrl = configOrUrl.scriptUrl || configOrUrl.sheetUrl || DEFAULT_SHEET_URL;
    spreadsheetUrl = configOrUrl.spreadsheetUrl || '';
  }

  // Gracefully handle if user pasted spreadsheet URL into scriptUrl
  if (scriptUrl && scriptUrl.includes('docs.google.com/spreadsheets')) {
    if (!spreadsheetUrl) spreadsheetUrl = scriptUrl;
    scriptUrl = DEFAULT_SHEET_URL;
  }

  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: false,
      error: 'URL Web App Apps Script belum dimasukkan dalam tetapan',
    };
  }

  const tarikhMasa = new Date(participant.timestamp).toLocaleString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const payload = {
    id: participant.id,
    timestamp: participant.timestamp,
    tarikhMasa,
    nama: participant.nama,
    noKp: participant.noKp,
    noTel: participant.noTel,
    spreadsheetUrl: spreadsheetUrl.trim(),
    sheetUrl: spreadsheetUrl.trim(),
  };

  try {
    const params = new URLSearchParams();
    params.append('id', payload.id);
    params.append('timestamp', payload.timestamp);
    params.append('tarikhMasa', payload.tarikhMasa);
    params.append('nama', payload.nama);
    params.append('noKp', payload.noKp);
    params.append('noTel', payload.noTel);
    if (payload.spreadsheetUrl) {
      params.append('spreadsheetUrl', payload.spreadsheetUrl);
      params.append('sheetUrl', payload.spreadsheetUrl);
    }

    // Kaedah 1: POST
    await fetch(scriptUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Kaedah 2: GET fallback ping untuk menjamin pelaksanaan dalam Google Apps Script
    try {
      const getUrl = new URL(scriptUrl.trim());
      getUrl.searchParams.set('action', 'register');
      getUrl.searchParams.set('id', payload.id);
      getUrl.searchParams.set('nama', payload.nama);
      getUrl.searchParams.set('noKp', payload.noKp);
      getUrl.searchParams.set('noTel', payload.noTel);
      getUrl.searchParams.set('tarikhMasa', payload.tarikhMasa);
      if (payload.spreadsheetUrl) {
        getUrl.searchParams.set('spreadsheetUrl', payload.spreadsheetUrl);
      }
      getUrl.searchParams.set('_t', Date.now().toString());

      fetch(getUrl.toString(), { method: 'GET', mode: 'no-cors' }).catch(() => {});
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    console.error('Error sending to sheet:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi Apps Script Google Sheet',
    };
  }
};

export const exportToCSV = (participants: Participant[]): void => {
  if (participants.length === 0) return;

  const headers = [
    'Bil',
    'Tarikh & Masa',
    'Nama Penuh',
    'No. Kad Pengenalan',
    'No. Telefon',
    'Status Google Sheet',
  ];
  const rows = participants.map((p, index) => [
    (index + 1).toString(),
    formatDisplayDate(p.timestamp),
    `"${p.nama.replace(/"/g, '""')}"`,
    `'${p.noKp}`,
    `'${p.noTel}`,
    p.syncedToSheet ? 'Disimpan' : 'Disimpan Tempatan',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Pendaftaran_Program_Briskwalk_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
