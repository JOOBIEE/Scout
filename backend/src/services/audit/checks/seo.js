export function checkSeo($) {
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1Count = $('h1').length;
  const images = $('img');
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt')?.trim()).length;
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;

  const findings = [];
  let score = 100;

  if (!title) {
    findings.push({ text: 'Missing page title', severity: 'high' });
    score -= 20;
  }
  if (!metaDescription) {
    findings.push({ text: 'Missing meta description', severity: 'medium' });
    score -= 15;
  }
  if (h1Count === 0) {
    findings.push({ text: 'No H1 heading found', severity: 'medium' });
    score -= 15;
  } else if (h1Count > 1) {
    findings.push({ text: `Multiple H1 headings found (${h1Count})`, severity: 'low' });
    score -= 5;
  }
  if (images.length > 0 && imagesWithoutAlt > 0) {
    findings.push({
      text: `${imagesWithoutAlt} of ${images.length} images missing alt text`,
      severity: imagesWithoutAlt === images.length ? 'high' : 'medium',
    });
    score -= Math.min(20, imagesWithoutAlt * 2);
  }
  if (!favicon) {
    findings.push({ text: 'Missing favicon', severity: 'low' });
    score -= 5;
  }

  return {
    title,
    metaDescription,
    score: Math.max(0, score),
    findings,
  };
}