import { Participant, SheetConfig } from '../types';

const STORAGE_KEY = 'briskwalk_participants_data';
const CONFIG_KEY = 'briskwalk_sheet_config';

export const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbz4IPBKpqG8bUgOObT2Afsxij9kgjWDNtBC2boa8b522rAkGaAsZWDZ5cFfZIM9qMCQsg/exec';

export const getSavedConfig = (): SheetConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sheetUrl: parsed.sheetUrl && parsed.sheetUrl.trim() ? parsed.sheetUrl : DEFAULT_SHEET_URL,
        autoSync: parsed.autoSync ?? true,
      };
    }
  } catch (err) {
    console.error('Failed to read sheet config', err);
  }
  return {
    sheetUrl: DEFAULT_SHEET_URL,
    autoSync: true,
  };
};

export const saveConfig = (config: SheetConfig): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
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

export const sendParticipantToSheet = async (
  participant: Participant,
  sheetUrl: string
): Promise<{ success: boolean; error?: string }> => {
  if (!sheetUrl || !sheetUrl.trim()) {
    return {
      success: false,
      error: 'Link Google Sheet belum dimasukkan dalam tetapan',
    };
  }

  const payload = {
    id: participant.id,
    timestamp: participant.timestamp,
    nama: participant.nama,
    noKp: participant.noKp,
    noTel: participant.noTel,
    tarikhMasa: new Date(participant.timestamp).toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };

  try {
    // We send using fetch with no-cors or form encoded data for Google Apps Script Web App
    const params = new URLSearchParams();
    params.append('id', payload.id);
    params.append('timestamp', payload.timestamp);
    params.append('tarikhMasa', payload.tarikhMasa);
    params.append('nama', payload.nama);
    params.append('noKp', payload.noKp);
    params.append('noTel', payload.noTel);

    // Try standard fetch first
    await fetch(sheetUrl.trim(), {
      method: 'POST',
      mode: 'no-cors', // Standard for Google Apps Script redirects
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return { success: true };
  } catch (err: unknown) {
    console.error('Error sending to sheet:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi Google Sheet',
    };
  }
};

export const exportToCSV = (participants: Participant[]): void => {
  if (participants.length === 0) return;

  const headers = ['Bil', 'Tarikh & Masa', 'Nama Penuh', 'No. Kad Pengenalan', 'No. Telefon', 'Status Google Sheet'];
  const rows = participants.map((p, index) => [
    (index + 1).toString(),
    new Date(p.timestamp).toLocaleString('ms-MY'),
    `"${p.nama.replace(/"/g, '""')}"`,
    `'${p.noKp}`, // Prefix quote to preserve leading zeros in Excel
    `'${p.noTel}`,
    p.syncedToSheet ? 'Disimpan' : 'Disimpan Tempatan',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Pendaftaran_Program_Briskwalk_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
