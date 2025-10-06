/*
 * Deterministic Scoring Engine
 * ---------------------------------
 * - Thuật toán rule-based, không phụ thuộc randomness của LLM.
 * - Đầu vào tối thiểu: jdText, cvText, links, certsText.
 * - Trả về: subscores (K,E,P,U,R,S,Q,V), penalties (G,F), score, confidence và dữ liệu trích xuất.
 */

// ===== Types =====
export interface DeterministicConfig {
	weights: { K: number; E: number; P: number; U: number; R: number; S: number; Q: number; V: number };
	lambda_G: number; // penalty weight cho G (similarity JD-CV quá cao)
	lambda_F: number; // penalty weight cho F (các tín hiệu nghi ngờ)
	soft_skill_keywords: string[];
	repo_domains: string[];
	kpi_markers: string[];
}

export interface DeterministicInput {
	jdText: string;
	cvText: string;
	links: string[];
	certsText: string;
	config?: Partial<DeterministicConfig>;
	now?: Date;
}

export interface DeterministicResult {
	extracted: any;
	subscores: Record<string, number>;
	penalties: { G: number; F: number };
	weights: any;
	score: number;
	confidence: number;
	explanations: Array<{ factor: string; evidence: string; why: string }>;
	notes: string;
}

// ===== Default Configuration =====
const DEFAULT_CONFIG: DeterministicConfig = {
	weights: { K: 0.25, E: 0.20, P: 0.15, U: 0.10, R: 0.10, S: 0.10, Q: 0.05, V: 0.05 },
	lambda_G: 0.15,
	lambda_F: 0.10,
	soft_skill_keywords: [
		'communication', 'teamwork', 'leadership', 'problem solving', 'presentation', 'writing', 'planning', 'ownership'
	],
	repo_domains: ['github.com', 'gitlab.com', 'bitbucket.org'],
	kpi_markers: [
		'%', 'revenue', 'users', 'MAU', 'DAU', 'conversion', 'accuracy', 'recall', 'precision', 'throughput', 'latency', 'MRR', 'ARR', 'deals', 'SQLs', 'leads'
	]
};

// ===== Helpers =====
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round2 = (v: number) => Number(clamp01(v).toFixed(2));

// Hard skill detection
const HARD_SKILL_PATTERNS = [
	'python','java','javascript','typescript','c\\+\\+','c#','go','golang','ruby','php','sql','nosql','mysql','postgresql','mongodb','redis','kafka','spark','hadoop','airflow','docker','kubernetes','aws','gcp','azure','terraform','ansible','jenkins','git','react','angular','vue','node\\.js','spring','django','flask','fastapi','laravel','\\.net','power ?bi','tableau'
];
const HARD_SKILL_REGEX = new RegExp('\\b(' + HARD_SKILL_PATTERNS.join('|') + ')\\b', 'gi');

// ===== Extraction Functions =====
function extractHardSkills(text: string): string[] {
	const set = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = HARD_SKILL_REGEX.exec(text)) !== null) {
		set.add(m[1].toLowerCase());
	}
	return Array.from(set).sort();
}

function extractYears(cv: string): number | null {
	const r = /(\d+(?:\.\d+)?)\s*(?:năm|year|years|yrs)/gi;
	let max = 0; let found = false; let m: RegExpExecArray | null;
	while ((m = r.exec(cv)) !== null) { found = true; const v = parseFloat(m[1]); if (v > max) max = v; }
	return found ? max : null;
}

function extractRoles(cv: string): any[] {
	const lines = cv.split(/\r?\n/).slice(0, 400).map(l => l.trim()).filter(Boolean);
	const roles: any[] = [];
	for (const line of lines) {
		if (/developer|engineer|manager|lead|intern|specialist|consultant/i.test(line)) {
			roles.push({
				title: line.split(/[-|@]/)[0].trim().slice(0, 80),
				company: '',
				start_iso: null,
				end_iso: null,
				is_current: null
			});
		}
		if (roles.length >= 8) break;
	}
	return roles.length ? roles : [{ title: '', company: '', start_iso: null, end_iso: null, is_current: null }];
}

function extractEducation(cv: string): any[] {
	const eduRegex = /(cử nhân|bachelor|thạc sĩ|master|phd|tiến sĩ|college|university)/ig;
	const lines = cv.split(/\r?\n/).slice(0, 300);
	const ed: any[] = [];
	for (const l of lines) {
		if (eduRegex.test(l)) ed.push({ degree: l.slice(0, 60), major: '', school: '' });
		if (ed.length >= 5) break;
	}
	return ed.length ? ed : [{ degree: '', major: '', school: '' }];
}

function extractCerts(text: string): any[] {
	const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 50);
	if (!lines.length) return [{ name: '', issuer: '', id_or_url: '', expires_on: null }];
	return lines.map(l => ({ name: l, issuer: '', id_or_url: '', expires_on: null }));
}

function extractProjects(cv: string): any[] {
	const lines = cv.split(/\r?\n/).filter(l => /project|dự án|portfolio|github|demo/i.test(l)).slice(0, 30);
	if (!lines.length) return [{ title: '', url: null, has_kpi_number: false }];
	return lines.map(l => ({
		title: l.slice(0, 80),
		url: null,
		has_kpi_number: /\b\d+\s*(%|users|MAU|DAU|conversion|accuracy|recall|precision|throughput|latency|MRR|ARR|deals|SQLs|leads)\b/i.test(l)
	}));
}

function extractDocQuality(cv: string) {
	const bullet = (cv.match(/\n[-*•]/g) || []).length;
	const bullets_consistent = bullet > 3 ? true : bullet === 0 ? null : true;
	return { bullets_consistent, ocr_noise_level: null, language_consistency: null };
}

// ===== Subscore Helpers =====
function buildJDSet(jd: string) { return new Set(extractHardSkills(jd)); }

function scoreK(jdSet: Set<string>, cvSkills: string[]) {
	if (jdSet.size === 0) return 0;
	let inter = 0; cvSkills.forEach(s => { if (jdSet.has(s)) inter++; });
	return inter / Math.max(1, jdSet.size);
}

function parseReqYears(jd: string) { const m = /(\d+)\s*(?:năm|year|years|yrs)/i.exec(jd); return m ? parseInt(m[1], 10) : null; }
function scoreE(years: number | null, jd: string) {
	if (years == null) return 0;
	const req = parseReqYears(jd);
	return req ? Math.min(years / req, 1) : Math.min(years / 5, 1);
}

function detectKPI(cv: string, cfg: DeterministicConfig) { return cfg.kpi_markers.some(k => new RegExp(k, 'i').test(cv)) && /\d/.test(cv); }
function hasValidLink(links: string[]) { return links.some(l => /^https?:\/\//i.test(l)); }
function hasRepo(links: string[], cfg: DeterministicConfig) { return links.some(l => cfg.repo_domains.some(d => l.includes(d))); }
function scoreP(links: string[], projects: any[], cv: string, cfg: DeterministicConfig) {
	const valid = hasValidLink(links) || projects.some(p => p.url);
	const repo = hasRepo(links, cfg);
	const kpi = detectKPI(cv, cfg) || projects.some(p => p.has_kpi_number);
	return Math.min(1, 0.4 * (valid ? 1 : 0) + 0.3 * (repo ? 1 : 0) + 0.3 * (kpi ? 1 : 0));
}

function scoreU(education: any[], jd: string) {
	if (!education.length) return 0.5;
	const major = (education[0].major || education[0].degree || '').toLowerCase();
	if (!major) return 0.5;
	let base = 0.3;
	if (/computer|software|information|data/.test(major)) base = 1.0;
	else if (/engineering|mathematics|physics|statistics/.test(major)) base = 0.6;
	if (major && jd.toLowerCase().includes(major.split(' ')[0])) base = Math.max(base, 1.0);
	return base;
}

function monthsSince(iso: string, now: Date) {
	if (!iso) return null;
	const d = new Date(iso); if (isNaN(d.getTime())) return null;
	return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}
function scoreR(roles: any[], now: Date) {
	if (roles.some(r => r.is_current)) return 1;
	let latest: number | null = null;
	roles.forEach(r => { if (r.end_iso) { const m = monthsSince(r.end_iso, now); if (m != null && (latest == null || m < latest)) latest = m; } });
	if (latest == null) return 0.5;
	if (latest < 6) return 1;
	if (latest < 12) return 0.8;
	if (latest < 24) return 0.5;
	return 0.2;
}

function extractSoftSets(jd: string, cv: string, cfg: DeterministicConfig) {
	const jdSet = new Set<string>(), cvSet = new Set<string>();
	const lJD = jd.toLowerCase(), lCV = cv.toLowerCase();
	cfg.soft_skill_keywords.forEach(k => {
		const kw = k.toLowerCase();
		if (lJD.includes(kw)) jdSet.add(kw);
		if (lCV.includes(kw)) cvSet.add(kw);
	});
	return { jdSet, cvSet };
}
function scoreS(jd: string, cv: string, cfg: DeterministicConfig) {
	const { jdSet, cvSet } = extractSoftSets(jd, cv, cfg);
	if (jdSet.size > 0) {
		let inter = 0; cvSet.forEach(s => { if (jdSet.has(s)) inter++; });
		return jdSet.size ? inter / jdSet.size : 0;
	}
	return Math.min(cvSet.size / 8, 1);
}

function scoreQ(doc: any) {
	let Q = 0.8;
	if (doc.ocr_noise_level != null && doc.ocr_noise_level > 0.6) Q = 0.4;
	if (doc.bullets_consistent === false || (doc.language_consistency != null && doc.language_consistency < 0.5)) Q = Math.min(Q, 0.6);
	return Math.max(0.2, Math.min(1, Q));
}

function scoreV(certs: any[], jd: string) {
	if (!certs.length) return 0.2;
	const lowerJD = jd.toLowerCase();
	let relevant = false; let expired = false;
	certs.forEach(c => {
		const name = (c.name || '').toLowerCase();
		if (/aws|azure|gcp|pmp|ielts|toeic|oracle|cisco|vmware/.test(name)) {
			if (/(aws|azure|gcp)/.test(name) && /(cloud|devops)/.test(lowerJD)) relevant = true;
			else if (/pmp/.test(name) && /project/.test(lowerJD)) relevant = true;
			else if (/(ielts|toeic)/.test(name) && /(english|tiếng anh)/.test(lowerJD)) relevant = true;
			else relevant = relevant || true;
		}
		if (c.expires_on) {
			const ex = new Date(c.expires_on);
			if (!isNaN(ex.getTime()) && ex.getTime() < Date.now()) expired = true;
		}
	});
	if (relevant) return 1;
	if (expired) return 0.5;
	return 0.2;
}

// ===== Penalties =====
function overlapScore(jd: string, cv: string) {
	const tok = (t: string) => t.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/gi, ' ').split(/\s+/).filter(Boolean);
	const jdTok = tok(jd), cvTok = tok(cv);
	if (!jdTok.length || !cvTok.length) return 0;
	let interTotal = 0, baseTotal = 0;
	for (let n = 3; n <= 5; n++) {
		const sub = (tokens: string[], n: number) => {
			const s = new Set<string>();
			for (let i = 0; i <= tokens.length - n; i++) s.add(tokens.slice(i, i + n).join(' '));
			return s;
		};
		const jdSet = sub(jdTok, n), cvSet = sub(cvTok, n);
		baseTotal += jdSet.size;
		let inter = 0; jdSet.forEach(g => { if (cvSet.has(g)) inter++; });
		interTotal += inter;
	}
	return baseTotal ? interTotal / baseTotal : 0;
}
function penaltyG(jd: string, cv: string) {
	const o = overlapScore(jd, cv);
	if (o >= 0.85) return 1;
	if (o >= 0.70) return 0.5;
	return 0;
}

function penaltyF(roles: any[], certs: any[], years: number | null) {
	let f = 0; const flags: string[] = []; const titleMap: Record<string, number> = {};
	roles.forEach(r => {
		const key = (r.title || '').toLowerCase().split(/\s+/)[0];
		if (key) titleMap[key] = (titleMap[key] || 0) + 1;
	});
	if (Object.values(titleMap).some(v => v >= 3)) { f += 0.4; flags.push('role_overlap_suspected'); }
	if (certs.some(c => c.name && (!c.issuer || !c.id_or_url))) { f += 0.3; flags.push('cert_missing_issuer_or_id'); }
	if (years != null && years < 3 && roles.some(r => /senior|lead|manager/i.test(r.title || ''))) { f += 0.3; flags.push('senior_title_low_years'); }
	return { F: Math.min(1, f), flags };
}

function coverage(extracted: any) {
	let filled = 0, total = 4;
	if (extracted.hard_skills.length) filled++;
	if (extracted.roles.some((r: any) => (r.title || '').trim())) filled++;
	if (extracted.education.some((e: any) => (e.degree || '').trim())) filled++;
	if (extracted.certs.some((c: any) => (c.name || '').trim()) || extracted.projects.some((p: any) => (p.title || '').trim())) filled++;
	return filled / total;
}

// ===== Main API =====
export function generateDeterministicScore(input: DeterministicInput): DeterministicResult {
	const cfg: DeterministicConfig = {
		...DEFAULT_CONFIG,
		...input.config,
		weights: { ...DEFAULT_CONFIG.weights, ...(input.config?.weights || {}) }
	};

	const jd = input.jdText || '';
	const cv = input.cvText || '';
	const links = Array.isArray(input.links) ? input.links : [];
	const certsText = input.certsText || '';

	// Extract
	const roles = extractRoles(cv);
	const education = extractEducation(cv);
	const certs = extractCerts(certsText);
	const projects = extractProjects(cv);
	const doc_quality = extractDocQuality(cv);
	const hard_skills = extractHardSkills(cv);
	const years = extractYears(cv);

	// Subscores
	const subs = {
		K: scoreK(buildJDSet(jd), hard_skills),
		E: scoreE(years, jd),
		P: scoreP(links, projects, cv, cfg),
		U: scoreU(education, jd),
		R: scoreR(roles, input.now || new Date()),
		S: scoreS(jd, cv, cfg),
		Q: scoreQ(doc_quality),
		V: scoreV(certs, jd)
	};

	// Penalties
	const G = penaltyG(jd, cv);
	const { F, flags } = penaltyF(roles, certs, years);

	// Weighted score
	const scoreRaw =
		cfg.weights.K * subs.K +
		cfg.weights.E * subs.E +
		cfg.weights.P * subs.P +
		cfg.weights.U * subs.U +
		cfg.weights.R * subs.R +
		cfg.weights.S * subs.S +
		cfg.weights.Q * subs.Q +
		cfg.weights.V * subs.V;
	const score = scoreRaw - (cfg.lambda_G * G + cfg.lambda_F * F);

	// Confidence heuristic
	const conf = Math.min(
		coverage({ hard_skills, roles, education, certs, projects }),
		subs.Q,
		(hasValidLink(links) || detectKPI(cv, cfg)) ? 1 : 0.6
	);

	// Rounding subscores for API clarity
	const subsRounded: Record<string, number> = {};
	Object.entries(subs).forEach(([k, v]) => (subsRounded[k] = round2(v)));

	return {
		extracted: {
			hard_skills,
			soft_signals: { leadership: null, communication: null, teamwork: null },
			years_experience_total: years,
			roles,
			education,
			certs,
			projects,
			doc_quality_signals: doc_quality
		},
		subscores: subsRounded,
		penalties: { G: round2(G), F: round2(F) },
		weights: { ...cfg.weights, lambda_G: cfg.lambda_G, lambda_F: cfg.lambda_F },
		score: Number(Math.max(0, score).toFixed(2)),
		confidence: Number(clamp01(conf).toFixed(2)),
		explanations: [
			{ factor: 'K', evidence: '', why: 'Hard skill overlap ratio.' },
			{ factor: 'E', evidence: '', why: 'Years vs requirement.' },
			{ factor: 'P', evidence: '', why: 'Links/repos/KPI weighting.' },
			{ factor: 'U', evidence: '', why: 'Major relevance.' },
			{ factor: 'R', evidence: '', why: 'Latest role recency.' },
			{ factor: 'S', evidence: '', why: 'Soft skill overlap or density.' },
			{ factor: 'Q', evidence: '', why: 'Document quality heuristics.' },
			{ factor: 'V', evidence: '', why: 'Cert relevance/expiry.' },
			{ factor: 'G', evidence: '', why: 'JD-CV n-gram overlap.' },
			{ factor: 'F', evidence: '', why: 'Validation flags.' }
		],
		notes: `Flags:${flags.join('|') || 'none'}`
	};
}
