function tier(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// Computes the raw weighted score for a single business - no tier yet.
export function computeRawScore(business) {
  const { audit, opportunities = [], phone, address, websiteConfidence } = business;

  if (!audit) return null;

  let weakness = 0;
  let confidenceMultiplier = 1;
  const reasoning = [];

  if (audit.status === 'done') {
    weakness = 100 - audit.overallScore;
    reasoning.push(`Website scores ${audit.overallScore}/100`);

    if (websiteConfidence !== null && websiteConfidence < 60) {
      confidenceMultiplier = 0.4;
      reasoning.push(
        `⚠ Low confidence (${websiteConfidence}%) this is the correct website - score discounted`
      );
    } else if (websiteConfidence !== null) {
      reasoning.push(`Website match confidence: ${websiteConfidence}%`);
    }
  } else if (audit.status === 'no_website') {
    weakness = 65;
    reasoning.push('No website found for this business');
  } else if (audit.status === 'failed') {
    weakness = 30;
    reasoning.push('Website could not be reached during audit - may be temporarily down');
  }

  let legitimacy = 0;
  if (phone) {
    legitimacy += 25;
    reasoning.push('✓ Phone number available');
  }
  if (address) legitimacy += 15;

  let socialLinked = 0;
  try {
    const rawFindings = audit.rawFindings ? JSON.parse(audit.rawFindings) : null;
    socialLinked = rawFindings?.social?.linkedCount || 0;
  } catch {
    socialLinked = 0;
  }
  if (socialLinked > 0) {
    legitimacy += 20;
    reasoning.push(`✓ Active on ${socialLinked} social platform${socialLinked > 1 ? 's' : ''}`);
  }

  const highSeverityCount = opportunities.filter((o) => o.severity === 'high').length;
  if (highSeverityCount > 0) {
    legitimacy += Math.min(highSeverityCount * 5, 20);
    reasoning.push(`${highSeverityCount} high-severity issue${highSeverityCount > 1 ? 's' : ''} found`);
  }

  const rawScore = (weakness * 0.65 + legitimacy * 0.35) * confidenceMultiplier;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  return { score, reasoning };
}

// Ranks a batch of {businessId, score, reasoning} entries and assigns
// HIGH/MEDIUM/LOW by percentile within THIS batch, rather than a fixed
// absolute cutoff - real website quality clusters tighter than a fixed
// scale assumes, so relative ranking is what actually separates "worth
// contacting first" from "worth contacting last" in practice.
export function assignTiers(scoredBusinesses) {
  const sorted = [...scoredBusinesses].sort((a, b) => b.score - a.score);
  const total = sorted.length;

  return sorted.map((entry, index) => {
    const percentile = total <= 1 ? 0 : index / (total - 1);
    let tier;
    if (percentile <= 0.25) tier = 'high';
    else if (percentile <= 0.6) tier = 'medium';
    else tier = 'low';
    return { ...entry, tier };
  });
}