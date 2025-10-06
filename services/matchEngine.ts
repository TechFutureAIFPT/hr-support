/**
 * Deterministic JD–CV matching engine (no randomness) implementing user spec.
 * Inputs: raw JD text, raw CV text, optional weights.
 * Outputs: JSON object with overall match_percent, subscores, adjustments, status, level, explanation.
 */

export interface MatchWeights {
  experience: number; // portion of 0-100
  skill: number;
  education: number;
  language: number;
  certificate: number;
}

export interface MatchResultJSON {
  match_percent: number;
  level: 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner' | 'Unqualified' | 'Rejected';
  subscores: {
    experience: number;
    skill: number;
    education: number;
    language: number;
    certificate: number;
  };
  adjustments: {
    recency_boost: number; // 0–10
    seniority_penalty: number; // 0–20
    coverage_score: number; // 0–1
  };
  status: 'PASS' | 'REJECT';
  explanation: string;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  experience: 30,
  skill: 30,
  education: 15,
  language: 15,
  certificate: 10,
};

// Degree hierarchy (normalized)
const DEGREE_LEVELS = ['highschool','associate','bachelor','master','phd'];
const DEGREE_REGEXES: Record<string, RegExp[]> = {
  highschool: [/trung hoc|high school/i],
  associate: [/cao dang|associate/i],
  bachelor: [/cu nhan|bachelor|degree|dai hoc|university/i],
  master: [/thac si|master|msc|ma\b/i],
  phd: [/tien si|phd|doctor of philosophy|dr\./i],
};

// Language & proficiency heuristic
const LANGUAGE_TOKENS = ['english','japanese','korean','chinese','german','french'];
const LANGUAGE_LEVEL_PATTERNS: { pattern: RegExp; score: number }[] = [
  { pattern: /(ielts|toeic)\s*(\d{3,4}|\d\.\d)/i, score: 12 }, // numeric certificates
  { pattern: /(native|fluently|thanh thao)/i, score: 12 },
  { pattern: /(advanced|c1|c2)/i, score: 8 },
  { pattern: /(intermediate|b1|b2)/i, score: 5 },
  { pattern: /(basic|elementary|a1|a2)/i, score: 2 },
];

// Certification tokens
const CERT_TOKENS = ['aws','azure','gcp','pmp','scrum','scrum master','oca','ocp','ckad','cka','rhce','cissp','security\+','network\+'];

// Skill category groups for coverage
const SKILL_GROUPS: Record<string, string[]> = {
  fe: ['javascript','typescript','react','vue','angular','frontend','css','html'],
  be: ['java','spring','node','express','django','flask','golang','go','c#','dotnet','.net','microservice'],
  data: ['sql','mysql','postgres','mongodb','redis','kafka','hadoop','spark','elasticsearch'],
  ai: ['ml','machine learning','deep learning','pytorch','tensorflow','nlp','computer vision','llm'],
};

// Seniority tokens
const SENIORITY_LEVELS = ['intern','junior','mid','senior','lead','principal'];

/** Normalize: lowercase, remove diacritics, collapse spaces */
function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9+./#\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

function detectYears(text: string): { min?: number; max?: number; any?: number } {
  const years: number[] = [];
  // ranges 3-5 years
  const rangeRe = /(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:year|nam|yrs|y)/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(text))) {
    years.push(parseInt(m[1],10), parseInt(m[2],10));
  }
  // simple statements: 5 years, 3y, 2yrs, 4 nam
  const singleRe = /(\d{1,2})\s*(?:\+|plus)?\s*(?:year|nam|yrs|y)/gi;
  while ((m = singleRe.exec(text))) years.push(parseInt(m[1],10));
  if (years.length === 0) return {};
  return { min: Math.min(...years), max: Math.max(...years), any: years.sort((a,b)=>b-a)[0] };
}

function extractLines(text: string): string[] {
  return text.split(/\n|\r/).map(l=>l.trim()).filter(Boolean);
}

function extractMustHaveSkills(jd: string): { must: string[]; nice: string[] } {
  const lines = extractLines(jd);
  const must: string[] = []; const nice: string[] = [];
  lines.forEach(l => {
    const lower = l.toLowerCase();
    const collect = (target: string[]) => {
      // crude tokenization by commas / slashes
      l.split(/[,/]|\band\b|\bor\b/gi).forEach(tok => {
        const t = tok.trim().toLowerCase();
        if (t.length >= 2 && /[a-z]/.test(t) && t.length <= 40) target.push(t);
      });
    };
    if (/must\s*have|bat buoc|required|yeu cau/.test(lower)) collect(must);
    if (/nice\s*to\s*have|uu tien|plus|bonus/.test(lower)) collect(nice);
  });
  return { must: unique(must), nice: unique(nice) };
}

function unique<T>(arr: T[]): T[] { return [...new Set(arr)]; }

function scoreExperience(jd: string, cv: string): { score: number; recencyBoost: number; seniorityPenalty: number } {
  const jdYears = detectYears(jd);
  const cvYears = detectYears(cv);
  let score = 0;
  if (jdYears.max) {
    if (cvYears.any && cvYears.any >= jdYears.max) score = 100;
    else if (cvYears.any && jdYears.max) {
      score = clamp((cvYears.any / jdYears.max) * 100, 0, 100);
    }
  } else {
    // no explicit requirement → neutral average if CV has years
    score = cvYears.any ? clamp(cvYears.any * 8, 0, 100) : 30;
  }
  // Recency: check first 5 lines for required tokens / domain
  const recentBlock = extractLines(cv).slice(0, 8).join(' ');
  const domainTokens = ['fintech','ecommerce','banking','payment','logistics','health','retail'];
  const coreHit = domainTokens.some(t => recentBlock.includes(t));
  const recencyBoost = coreHit ? (jdYears.max ? clamp(Math.min(10, (cvYears.any || 0) - (jdYears.max || 0)), 0, 10) : 5) : 0;
  // Seniority penalty: compare senior terms present in JD vs CV.
  const jdSeniorIdx = SENIORITY_LEVELS.findIndex(l => jd.includes(l));
  const cvSeniorIdx = SENIORITY_LEVELS.findIndex(l => cv.includes(l));
  let seniorityPenalty = 0;
  if (jdSeniorIdx >= 0) {
    if (cvSeniorIdx === -1) seniorityPenalty = 10; else if (cvSeniorIdx < jdSeniorIdx) seniorityPenalty = (jdSeniorIdx - cvSeniorIdx) * 7;
  }
  seniorityPenalty = clamp(seniorityPenalty, 0, 20);
  return { score: clamp(score, 0, 100), recencyBoost, seniorityPenalty };
}

function scoreSkills(jd: string, cv: string): { score: number; coverage: number; mustMiss: string[] } {
  const { must, nice } = extractMustHaveSkills(jd);
  const cvWords = unique(cv.split(/[^a-z0-9+#.]+/g).filter(Boolean));
  const cvSet = new Set(cvWords);
  const matchedMust = must.filter(s => cvSet.has(s));
  const matchedNice = nice.filter(s => cvSet.has(s));
  const mustMiss = must.filter(s => !cvSet.has(s));
  // skill base score: must weight 70%, nice 30%
  const mustPart = must.length ? (matchedMust.length / must.length) : 1;
  const nicePart = nice.length ? (matchedNice.length / nice.length) : 1;
  let score = (mustPart * 0.7 + nicePart * 0.3) * 100;
  // coverage across categories required by JD (only categories containing any JD must skill)
  const jdAllSkills = unique([...must, ...nice]);
  const requiredCategories = Object.entries(SKILL_GROUPS).filter(([_, list]) => list.some(s => jdAllSkills.includes(s))).map(([k]) => k);
  const matchedCategories = Object.entries(SKILL_GROUPS).filter(([k, list]) => requiredCategories.includes(k) && list.some(s => cvSet.has(s))).map(([k]) => k);
  const coverage = requiredCategories.length ? matchedCategories.length / requiredCategories.length : 1;
  score *= coverage; // apply coverage gating
  return { score: clamp(score, 0, 100), coverage: clamp(coverage, 0, 1), mustMiss };
}

function scoreEducation(jd: string, cv: string): number {
  const wanted = DEGREE_LEVELS.filter(d => DEGREE_REGEXES[d].some(r => r.test(jd)));
  // emulate findLast for broader TS target compatibility
  let cvDegree: string | undefined;
  for (let i = DEGREE_LEVELS.length - 1; i >= 0; i--) {
    const d = DEGREE_LEVELS[i];
    if (DEGREE_REGEXES[d].some(r => r.test(cv))) { cvDegree = d; break; }
  }
  if (!wanted.length) return cvDegree ? 80 : 40; // heuristic if JD no degree requirement
  if (!cvDegree) return 0;
  const targetIdx = DEGREE_LEVELS.indexOf(wanted[0]);
  const cvIdx = DEGREE_LEVELS.indexOf(cvDegree);
  if (cvIdx === targetIdx) return 100;
  if (cvIdx > targetIdx) return 100; // higher degree
  const diff = targetIdx - cvIdx; // below requirement
  return clamp(100 - diff * 40, 0, 95);
}

function scoreLanguage(jd: string, cv: string): number {
  const requiresLang = LANGUAGE_TOKENS.filter(l => jd.includes(l));
  if (!requiresLang.length) return 60; // neutral
  let score = 0;
  requiresLang.forEach(lang => { if (cv.includes(lang)) score += 100 / requiresLang.length; });
  // adjust by proficiency tokens
  LANGUAGE_LEVEL_PATTERNS.forEach(p => { if (p.pattern.test(cv)) score = clamp(score + 10, 0, 100); });
  return clamp(score, 0, 100);
}

function scoreCertificates(jd: string, cv: string): { score: number; missing: string[] } {
  const required = CERT_TOKENS.filter(tok => jd.includes(tok));
  if (!required.length) return { score: 50, missing: [] }; // neutral baseline if none required
  const present = required.filter(r => cv.includes(r));
  const score = (present.length / required.length) * 100;
  const missing = required.filter(r => !present.includes(r));
  return { score: clamp(score, 0, 100), missing };
}

function classifyLevel(matchPercent: number, status: 'PASS' | 'REJECT'): MatchResultJSON['level'] {
  if (status === 'REJECT') return 'Rejected';
  if (matchPercent >= 85) return 'Expert';
  if (matchPercent >= 70) return 'Advanced';
  if (matchPercent >= 50) return 'Intermediate';
  if (matchPercent >= 30) return 'Beginner';
  return 'Unqualified';
}

export function computeJDMatch(
  jdRaw: string,
  cvRaw: string,
  inputWeights: Partial<MatchWeights> = {}
): MatchResultJSON {
  const jd = normalize(jdRaw);
  const cv = normalize(cvRaw);
  const weights: MatchWeights = { ...DEFAULT_WEIGHTS, ...inputWeights };
  // ensure weights sum to 100 (scale proportionally if not)
  const sumWeights = Object.values(weights).reduce((a,b)=>a+b,0) || 100;
  if (sumWeights !== 100) {
    (Object.keys(weights) as (keyof MatchWeights)[]).forEach(k => { (weights as any)[k] = weights[k] * (100 / sumWeights); });
  }

  // Subscores
  const exp = scoreExperience(jd, cv);
  const skill = scoreSkills(jd, cv);
  const edu = scoreEducation(jd, cv);
  const lang = scoreLanguage(jd, cv);
  const cert = scoreCertificates(jd, cv);

  // Mandatory fail rule: any missing must-have skill → reject
  const mandatoryFail = skill.mustMiss.length > 0;
  let status: 'PASS' | 'REJECT' = mandatoryFail ? 'REJECT' : 'PASS';

  // Weighted base (0–100) ignoring adjustments if rejected
  let base = 0;
  base += (exp.score / 100) * weights.experience;
  base += (skill.score / 100) * weights.skill;
  base += (edu / 100) * weights.education;
  base += (lang / 100) * weights.language;
  base += (cert.score / 100) * weights.certificate;

  // Adjustments
  const recency = exp.recencyBoost; // 0-10
  const seniorityPenalty = exp.seniorityPenalty; // 0-20
  const coverage = skill.coverage; // 0-1 (already applied inside skill score, but surface separately)

  let matchPercent = mandatoryFail ? 0 : clamp(base + recency - seniorityPenalty, 0, 100);
  const level = classifyLevel(matchPercent, status);

  const explanationParts: string[] = [];
  if (status === 'REJECT') {
    explanationParts.push(`Loại vì thiếu kỹ năng bắt buộc: ${skill.mustMiss.slice(0,5).join(', ')}`);
  } else {
    explanationParts.push(`Kinh nghiệm: ${exp.score.toFixed(0)}%, Kỹ năng: ${skill.score.toFixed(0)}% (coverage ${(coverage*100).toFixed(0)}%)`);
    explanationParts.push(`Học vấn: ${edu.toFixed(0)}%, Ngôn ngữ: ${lang.toFixed(0)}%, Chứng chỉ: ${cert.score.toFixed(0)}%`);
    if (recency > 0) explanationParts.push(`Recency +${recency}`);
    if (seniorityPenalty > 0) explanationParts.push(`Penalty -${seniorityPenalty} (seniority gap)`);
  }

  const explanation = explanationParts.join('. ');

  const result: MatchResultJSON = {
    match_percent: matchPercent,
    level,
    subscores: {
      experience: Math.round(exp.score),
      skill: Math.round(skill.score),
      education: Math.round(edu),
      language: Math.round(lang),
      certificate: Math.round(cert.score),
    },
    adjustments: {
      recency_boost: recency,
      seniority_penalty: seniorityPenalty,
      coverage_score: parseFloat(coverage.toFixed(2)),
    },
    status,
    explanation,
  };
  return result;
}

// Example (comment):
// const result = computeJDMatch(jdText, cvText);
// console.log(JSON.stringify(result));
