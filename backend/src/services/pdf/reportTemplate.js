function severityLabel(severity) {
  return { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' }[severity] || severity;
}

export function buildReportHtml(business) {
  const { name, address, phone, websiteUrl, audit, opportunities = [] } = business;

  const scoreRows = audit?.status === 'done'
    ? `
      <tr><td>SEO</td><td>${audit.seoScore ?? '—'}/100</td></tr>
      <tr><td>Trust</td><td>${audit.trustScore ?? '—'}/100</td></tr>
      <tr><td>Branding</td><td>${audit.brandingScore ?? '—'}/100</td></tr>
      <tr><td><strong>Overall</strong></td><td><strong>${audit.overallScore ?? '—'}/100</strong></td></tr>
    `
    : `<tr><td colspan="2">No website audit available</td></tr>`;

  const opportunityItems = opportunities.length
    ? opportunities
        .map((o) => `<li><strong>[${severityLabel(o.severity)}]</strong> ${o.text}</li>`)
        .join('')
    : '<li>No specific issues identified.</li>';

  const screenshotBlock = audit?.screenshotDesktopPath
    ? `<img src="http://localhost:4000${audit.screenshotDesktopPath}" style="width:100%; border:1px solid #ddd; margin-top:10px;" />`
    : '';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #222; padding: 40px; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #666; margin-bottom: 24px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
          td { padding: 6px 10px; border-bottom: 1px solid #eee; }
          h2 { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #222; padding-bottom: 4px; }
          ul { padding-left: 18px; }
          li { margin-bottom: 6px; }
          .meta { font-size: 13px; color: #555; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Website Audit Report</h1>
        <p class="subtitle">${name}</p>
        <p class="meta">
          ${address || ''}${phone ? ' • ' + phone : ''}${websiteUrl ? ' • ' + websiteUrl : ''}
        </p>

        <h2>Scores</h2>
        <table>${scoreRows}</table>

        <h2>Recommendations</h2>
        <ul>${opportunityItems}</ul>

        ${screenshotBlock ? `<h2>Homepage Preview</h2>${screenshotBlock}` : ''}
      </body>
    </html>
  `;
}