function severityWeight(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

function firstNameGuess(businessName) {
  // We rarely have an owner's name from Foursquare data, so address the business itself.
  return businessName;
}

export function generateTemplateOutreach(business) {
  const { name, opportunities = [], audit } = business;

  const topIssues = [...opportunities]
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 4);

  const bulletLines = topIssues.map((o) => `• ${o.text}`).join('\n');

  const noWebsite = !audit || audit.status === 'no_website';

  const body = noWebsite
    ? `Hi ${firstNameGuess(name)} team,

I was researching local businesses and noticed ${name} doesn't appear to have a website I could find online.

A lot of potential customers search online before reaching out, so having a simple, professional site could help you capture enquiries you might currently be missing.

I'd be happy to share a few quick ideas if you're interested - no obligation either way.

Regards`
    : `Hi ${firstNameGuess(name)} team,

I was researching businesses in your area and came across your website.

I noticed a few quick improvements that could help generate more enquiries:

${bulletLines}

I'd be happy to share more detail if you're interested - no obligation either way.

Regards`;

  return {
    channel: 'email',
    subject: `Quick note about ${name}'s online presence`,
    body,
  };
}