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
  spreadsheetUrl: string; // URL Google Sheet (docs.google.com/spreadsheets/...)
  scriptUrl: string;      // URL Apps Script Web App (script.google.com/macros/s/.../exec)
  sheetUrl?: string;      // Backward compatibility alias for scriptUrl
  autoSync: boolean;
  maxParticipants: number;
  limitEnabled: boolean;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  syncedToSheet: boolean;
}
