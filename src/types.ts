export interface Participant {
  id: string;
  timestamp: string;
  nama: string;
  noKp: string;
  noTel: string;
  syncedToSheet: boolean;
  syncError?: string;
}

export interface SheetConfig {
  sheetUrl: string;
  autoSync: boolean;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  syncedToSheet: boolean;
}
