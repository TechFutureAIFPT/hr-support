// Simple industry detection based on JD keywords.
// You can expand or refine this mapping later or move to an AI model.

export function detectIndustryFromJD(jdText: string): string | null {
  const text = jdText.toLowerCase();

  const rules: { industry: string; keywords: string[] }[] = [
    { industry: 'Software', keywords: ['react', 'node', 'javascript', 'typescript', 'frontend', 'backend', 'fullstack', 'api', 'microservice', 'devops', 'docker', 'kubernetes'] },
    { industry: 'FinTech', keywords: ['fintech', 'ngân hàng', 'bank', 'core banking', 'tài chính số', 'thanh toán', 'payment gateway'] },
    { industry: 'E-commerce', keywords: ['e-commerce', 'thương mại điện tử', 'checkout', 'giỏ hàng', 'shopify', 'magento'] },
    { industry: 'Healthcare', keywords: ['healthcare', 'y tế', 'medical', 'patient', 'hospital', 'clinic', 'chăm sóc sức khỏe'] },
    { industry: 'Education', keywords: ['edtech', 'education', 'học tập', 'elearning', 'trường học', 'sinh viên'] },
    { industry: 'Logistics', keywords: ['logistics', 'vận tải', 'supply chain', 'warehouse', 'kho vận'] },
    { industry: 'Agriculture', keywords: ['agri', 'nông nghiệp', 'farm', 'trồng trọt', 'chăn nuôi'] },
    { industry: 'Real Estate', keywords: ['bất động sản', 'real estate', 'property', 'estate platform'] },
    { industry: 'Telecommunications', keywords: ['viễn thông', 'telecom', '5g', 'network operations'] },
  ];

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) return rule.industry;
    }
  }
  return null;
}
