
export interface PatientProfile {
  id: string;
  name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  createdAt: number;
}

export interface ProcessedDocument {
  id: string;
  file: File;
  previewUrl: string;
  date: string | null; // ISO YYYY-MM-DD
  type: 'LAB' | 'IMAGING' | 'PRESCRIPTION' | 'NOTE' | 'OTHER';
  summary: string;
  isDuplicate: boolean;
  originalIndex?: number;
}

export interface ReportData {
  history: string;
  summary: string;
  prognosis: string;
}

export enum AppStep {
  DASHBOARD = 'DASHBOARD',
  REGISTRATION = 'REGISTRATION',
  UPLOAD = 'UPLOAD',
  ANALYZING_METADATA = 'ANALYZING_METADATA',
  REVIEW = 'REVIEW',
  GENERATING_REPORT = 'GENERATING_REPORT',
  RESULT = 'RESULT',
}
