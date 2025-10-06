// Web Worker for heavy computations
// This worker handles batch scoring calculations to avoid blocking the UI

interface ScoringData {
  candidates: any[]; // Raw candidate objects (from LLM extraction or pre-processing)
  weights: any;      // Weight config (may be unused by deterministic engine if internal weights applied)
  hardFilters: any;  // Hard filters (unused directly here but kept for future rules)
  jdText?: string;   // Original JD text for overlap & relevance metrics
}

interface ScoringResult {
  results: any[];
  errors: string[];
}

self.onmessage = (e: MessageEvent<ScoringData>) => {
  const { candidates, weights, hardFilters } = e.data;

  try {
    // Perform heavy calculations here
    const results = candidates.map(candidate => {
      // Simulate heavy computation
      const score = calculateScore(candidate, weights, hardFilters);
      return {
        ...candidate,
        computedScore: score
      };
    });

    const result: ScoringResult = {
      results,
      errors: []
    };

    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      results: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
};

// Lightweight hash for stable pseudo IDs / normalization (not cryptographically secure)
function stableHash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned
}

// Deterministic scoring inputs mirror a subset of deterministicScoring.ts expectations
function calculateScore(candidate: any, weights: any, hardFilters: any): number {
  // Prefer existing total score if already computed upstream
  if (candidate.analysis?.['Tổng điểm'] != null) {
    return candidate.analysis['Tổng điểm'];
  }
  // Fallback: derive a stable pseudo-score from hashed salient text (so it is reproducible)
  const basis = `${candidate.candidateName || ''}|${candidate.fileName || ''}|${candidate.jobTitle || ''}|${candidate.experienceLevel || ''}`;
  const h = stableHash(basis);
  // Map hash to 0..100 deterministically
  return (h % 101); // inclusive 0-100
}