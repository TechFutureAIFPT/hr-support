import { normalize } from './experienceMatch';

export interface CriterionRequirement {
  key: string;            // internal key
  display: string;        // name matching "Tiêu chí"
  keywords: string[];     // normalized JD-derived keywords
}

// Simple heuristic token sets per criterion
const SKILL_HINTS = ['java','spring','react','node','python','kotlin','swift','docker','kubernetes','k8s','terraform','aws','azure','gcp','sql','mongodb','redis','kafka','elk','elasticsearch','microservice','microservices'];
const ACHIEVEMENT_HINTS = ['kpi','%','percent','tăng','giam','increase','reduce','growth','roi','revenue','throughput','latency','users','mau','dau'];
const EDUCATION_HINTS = ['dai hoc','university','college','bachelor','master','phd','cử nhân','thạc sĩ','tiến sĩ'];
const LANGUAGE_HINTS = ['english','toeic','ielts','japanese','n2','chinese','korean','german'];
const PROFESSIONAL_HINTS = ['report','documentation','process','compliance','standard','iso'];
const STABILITY_HINTS = ['months','years'];
const CULTURE_HINTS = ['teamwork','collaborative','ownership','growth mindset','adapt','communication'];

const CRITERIA_MAP: { key: string; display: string; hints: string[] }[] = [
  { key: 'jobfit', display: 'Phù hợp JD (Job Fit)', hints: [] },
  { key: 'experience', display: 'Kinh nghiệm', hints: [] }, // handled separately
  { key: 'skills', display: 'Kỹ năng', hints: SKILL_HINTS },
  { key: 'achievements', display: 'Thành tựu/KPI', hints: ACHIEVEMENT_HINTS },
  { key: 'education', display: 'Học vấn', hints: EDUCATION_HINTS },
  { key: 'language', display: 'Ngôn ngữ', hints: LANGUAGE_HINTS },
  { key: 'professional', display: 'Chuyên nghiệp', hints: PROFESSIONAL_HINTS },
  { key: 'stability', display: 'Gắn bó & Lịch sử CV', hints: STABILITY_HINTS },
  { key: 'culture', display: 'Phù hợp văn hoá', hints: CULTURE_HINTS },
];

export function extractJDRequirements(jdText: string): CriterionRequirement[] {
  if (!jdText) return [];
  const norm = normalize(jdText);
  const requirements: CriterionRequirement[] = [];
  CRITERIA_MAP.forEach(c => {
    if (c.key === 'experience') return; // specialized separately
    if (c.hints.length === 0) {
      // Job fit: derive broad keywords by taking role nouns & core stack tokens already in text
      const broad = Array.from(new Set(norm.match(/\b[a-z]{4,}\b/g) || []))
        .filter(t => t.length <= 16 && /dev|engineer|developer|product|design|data|qa|test|front|back|full|lead|manager/.test(t))
        .slice(0, 12);
      requirements.push({ key: c.key, display: c.display, keywords: broad });
    } else {
      const found = c.hints.filter(h => norm.includes(h)).slice(0, 20);
      if (found.length) requirements.push({ key: c.key, display: c.display, keywords: found });
    }
  });
  return requirements;
}

export interface ComparisonResult {
  display: string;
  jdKeywords: string[];
  matched: string[];
  missing: string[];
}

export function compareEvidence(display: string, jdKeywords: string[], evidence: string): ComparisonResult | null {
  if (jdKeywords.length === 0) return null;
  const normEvidence = normalize(evidence || '').replace(/\n+/g, ' ');
  const matched = jdKeywords.filter(k => normEvidence.includes(k));
  const missing = jdKeywords.filter(k => !normEvidence.includes(k));
  return { display, jdKeywords, matched, missing };
}
