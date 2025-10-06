// Client-side heuristic extraction & matching for Experience criterion.
// Non-invasive: does NOT alter backend scoring; only used for UI quick analysis.

export interface ExperienceAnalysis {
  jdKeywords: string[];
  cvKeywords: string[];
  matched: string[];
  missing: string[];
  uncertain: string[];
  matchPercent: number | 'N/A';
  fitLabel: 'Strong Fit' | 'Good' | 'Moderate' | 'Low' | 'N/A';
  totalYearsCV?: number; // heuristic
  requiredYearsJD?: number; // first detected required years
}

const ROLE_TOKENS = ['frontend','backend','fullstack','mobile','android','ios','devops','data','qa','tester','product','designer','ui','ux'];
const TECH_TOKENS = ['java','spring','react','node','python','django','flask','golang','go','dotnet','.net','c#','c++','kotlin','swift','angular','vue','flutter','docker','kubernetes','k8s','sql','mysql','postgres','mongodb','redis','kafka','elasticsearch','aws','azure','gcp','cloud','terraform'];
const DOMAIN_TOKENS = ['fintech','ecommerce','banking','payment','logistics','edtech','education','healthcare','retail','saas'];
const METHOD_TOKENS = ['agile','scrum','kanban','ci/cd','cicd','tdd','devops'];
const LEAD_TOKENS = ['lead','leader','leadership','mentor','ownership','independent','autonomous','self-driven'];

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu,'')
    .replace(/[^a-z0-9+./#\-\s]/g,' ')
    .replace(/\s+/g,' ') // collapse spaces
    .trim();
}

function unique<T>(arr: T[]): T[] { return [...new Set(arr)]; }

function extractYearsTokens(text: string): { yearsTokens: string[]; maxYears?: number } {
  const yearsTokens: string[] = [];
  let maxYears: number | undefined;
  const rangeRegex = /(\d+)\s*[-–]\s*(\d+)\s*(?:nam|year|yrs|y)/gi;
  const singleRegex = /(\d+)\s*(?:\+|plus)?\s*(?:nam|year|yrs|y)/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRegex.exec(text))) {
    yearsTokens.push(`years_${m[1]}-${m[2]}`);
    maxYears = Math.max(maxYears ?? 0, parseInt(m[2],10));
  }
  while ((m = singleRegex.exec(text))) {
    const val = parseInt(m[1],10);
    yearsTokens.push(`years>=${val}`);
    maxYears = Math.max(maxYears ?? 0, val);
  }
  return { yearsTokens: unique(yearsTokens), maxYears };
}

export function extractJDExperienceKeywords(jdText: string): { keywords: string[]; requiredYears?: number } {
  if (!jdText) return { keywords: [] };
  const norm = normalize(jdText);
  // Find lines containing requirement headings
  const lines = norm.split(/\n|\r/).map(l=>l.trim()).filter(Boolean);
  const expLines = lines.filter(l => /(yeu cau|kinh nghiem|requirement|experience|qualification)/.test(l));
  if (expLines.length === 0) return { keywords: [] };
  const focusText = expLines.join(' ');
  const { yearsTokens, maxYears } = extractYearsTokens(focusText);
  const tokens: string[] = [...yearsTokens];
  const pushIf = (list: string[], category: string[]) => {
    category.forEach(t => { if (focusText.includes(t)) tokens.push(t); });
  };
  pushIf(tokens, ROLE_TOKENS);
  pushIf(tokens, TECH_TOKENS);
  pushIf(tokens, DOMAIN_TOKENS);
  pushIf(tokens, METHOD_TOKENS);
  pushIf(tokens, LEAD_TOKENS);
  return { keywords: unique(tokens), requiredYears: maxYears };
}

export function extractCVExperienceKeywords(evidence: string): { keywords: string[]; totalYears?: number } {
  if (!evidence) return { keywords: [] };
  const norm = normalize(evidence);
  const { yearsTokens, maxYears } = extractYearsTokens(norm);
  const tokens: string[] = [...yearsTokens];
  const collect = (src: string, list: string[]) => list.forEach(t => { if (src.includes(t)) tokens.push(t); });
  collect(norm, ROLE_TOKENS); collect(norm, TECH_TOKENS); collect(norm, DOMAIN_TOKENS); collect(norm, METHOD_TOKENS); collect(norm, LEAD_TOKENS);
  return { keywords: unique(tokens), totalYears: maxYears };
}

export function computeExperienceMatch(jdKeywords: string[], cvKeywords: string[], requiredYears?: number, cvYears?: number): ExperienceAnalysis {
  if (jdKeywords.length === 0) {
    return { jdKeywords: [], cvKeywords, matched: [], missing: [], uncertain: [], matchPercent: 'N/A', fitLabel: 'N/A' };
  }
  const matched = jdKeywords.filter(k => cvKeywords.includes(k));
  const missing = jdKeywords.filter(k => !cvKeywords.includes(k) && !k.startsWith('years'));
  const uncertain: string[] = [];

  // Weight scheme (only include categories present in JD)
  const weights: Record<string, number> = { years:35, role:25, tech:25, domain_method:10, leadership:5 };
  let earned = 0; let applicable = 0;

  const hasYearsReq = jdKeywords.some(k => k.startsWith('years')) && requiredYears !== undefined;
  if (hasYearsReq) {
    applicable += weights.years;
    if (cvYears !== undefined) {
      if (cvYears >= requiredYears!) earned += weights.years;
      else if (cvYears >= 0.8 * requiredYears!) earned += weights.years * 0.5;
    } else {
      uncertain.push(jdKeywords.find(k=>k.startsWith('years'))!);
    }
  }

  const hasRole = jdKeywords.some(k => ROLE_TOKENS.includes(k));
  if (hasRole) {
    applicable += weights.role;
    if (cvKeywords.some(k => ROLE_TOKENS.includes(k))) earned += weights.role; else uncertain.push('role');
  }
  const hasTech = jdKeywords.some(k => TECH_TOKENS.includes(k));
  if (hasTech) {
    applicable += weights.tech;
    const jdTechs = jdKeywords.filter(k => TECH_TOKENS.includes(k));
    const cvTechMatch = jdTechs.some(t => cvKeywords.includes(t));
    if (cvTechMatch) earned += weights.tech; else missing.push(jdTechs[0]);
  }
  const hasDomainOrMethod = jdKeywords.some(k => DOMAIN_TOKENS.includes(k) || METHOD_TOKENS.includes(k));
  if (hasDomainOrMethod) {
    applicable += weights.domain_method;
    const cvMatch = cvKeywords.some(k => DOMAIN_TOKENS.includes(k) || METHOD_TOKENS.includes(k));
    if (cvMatch) earned += weights.domain_method; else uncertain.push('domain/method');
  }
  const hasLead = jdKeywords.some(k => LEAD_TOKENS.includes(k));
  if (hasLead) {
    applicable += weights.leadership;
    const cvLead = cvKeywords.some(k => LEAD_TOKENS.includes(k));
    if (cvLead) earned += weights.leadership; else uncertain.push('leadership');
  }

  const matchPercent = applicable === 0 ? 'N/A' : parseFloat(((earned / applicable) * 100).toFixed(1));
  let fitLabel: ExperienceAnalysis['fitLabel'] = 'N/A';
  if (matchPercent !== 'N/A') {
    fitLabel = matchPercent >= 80 ? 'Strong Fit' : matchPercent >= 65 ? 'Good' : matchPercent >= 50 ? 'Moderate' : 'Low';
  }

  return { jdKeywords, cvKeywords, matched, missing: unique(missing), uncertain: unique(uncertain), matchPercent, fitLabel, totalYearsCV: cvYears, requiredYearsJD: requiredYears };
}

export function analyzeExperience(jdText: string, evidence: string): ExperienceAnalysis {
  const { keywords: jdKeywords, requiredYears } = extractJDExperienceKeywords(jdText);
  const { keywords: cvKeywords, totalYears } = extractCVExperienceKeywords(evidence);
  return computeExperienceMatch(jdKeywords, cvKeywords, requiredYears, totalYears);
}
