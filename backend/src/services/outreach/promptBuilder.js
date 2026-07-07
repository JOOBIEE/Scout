export function buildOutreachPrompt(business) {
  const { name, address, opportunities = [], audit } = business;

  const findingsText = opportunities.length
    ? opportunities.map((o) => `- ${o.text} (${o.severity} priority)`).join('\n')
    : 'No specific website found for this business.';

  return `Write a short, friendly outreach email to a local business owner, based on the following website audit findings. Keep it under 120 words, no hard sell, offer to share more detail if they're interested.

Business name: ${name}
Location: ${address || 'unknown'}
Website overall score: ${audit?.overallScore ?? 'N/A'}/100

Findings:
${findingsText}

Write only the email body, no subject line, no preamble.`;
}