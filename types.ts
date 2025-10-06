export type AppStep = 'jd' | 'weights' | 'upload' | 'analysis' | 'process' | 'history';

export interface DetailedScore {
  "Tiêu chí": string;
  "Điểm": string; // e.g., "12.5/15" (score/weight_percentage)
  "Công thức": string; // e.g., "subscore 12.5/15% = 12.5 points"
  "Dẫn chứng": string;
  "Giải thích": string;
}

export interface Candidate {
  // Add a unique identifier for selection management
  id: string; 
  candidateName: string;
  fileName: string;
  phone?: string;
  email?: string;
  jobTitle: string;
  industry: string;
  department: string;
  experienceLevel: 'Intern' | 'Junior' | 'Mid-level' | 'Senior' | 'Lead' | 'Expert' | string;
  hardFilterFailureReason?: string;
  softFilterWarnings?: string[];
  detectedLocation: string;
  
  analysis?: {
    "Tổng điểm": number;
    "Hạng": 'A' | 'B' | 'C';
    "Chi tiết": DetailedScore[];
    "Điểm mạnh CV"?: string[];
    "Điểm yếu CV"?: string[];
    "educationValidation"?: {
      "standardizedEducation": string;
      "validationNote": string;
      "warnings"?: string[];
    };
  };

  status: 'SUCCESS' | 'FAILED';
  error?: string;
  _rawBatchJson?: string;
}

export interface HardFilters {
  location: string;
  minExp: string;
  seniority: string;
  education: string;
  industry: string;
  language: string;
  languageLevel: string;
  certificates: string;
  workFormat: string;
  contractType: string;
  
  locationMandatory: boolean;
  minExpMandatory: boolean;
  seniorityMandatory: boolean;
  educationMandatory: boolean;
  contactMandatory: boolean;
  industryMandatory: boolean;
  languageMandatory: boolean;
  certificatesMandatory: boolean;
  workFormatMandatory: boolean;
  contractTypeMandatory: boolean;
}

export interface SubCriterion {
  key: string;
  name: string;
  weight: number;
}

export interface MainCriterion {
  key: string; // Allow any string key
  name: string;
  icon: string;
  color: string;
  weight?: number; // for top-level criteria like jd-relevance
  children?: SubCriterion[];
}

export interface WeightCriteria {
  [key: string]: MainCriterion;
}

export interface AnalysisRunData {
  timestamp: number;
  job: {
    position: string;
    locationRequirement: string;
  };
  candidates: Candidate[];
}

// History entry persisted to Firestore
export interface HistoryEntry {
  id: string; // Firestore doc id
  timestamp: number;
  jobPosition: string;
  locationRequirement: string;
  jdTextSnippet: string; // truncated JD for display
  totalCandidates: number;
  grades: { A: number; B: number; C: number };
  topCandidates: Array<{ id: string; name: string; score: number; jdFit: number; grade: string }>; // first 3
  userEmail: string;
  fullPayload?: {
    jdText: string;
    jobPosition: string;
    weights: any; // keep generic to avoid tight coupling; could refine later
    hardFilters: any;
    candidates: Candidate[];
  };
}

// Types for Chatbot
export interface ChatMessage {
  id: string;
  author: 'user' | 'bot';
  content: string;
  suggestedCandidates?: Pick<Candidate, 'id' | 'candidateName' | 'analysis'>[];
}
