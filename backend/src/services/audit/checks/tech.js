// Detects likely CMS/framework from HTML signatures - cheap heuristics, not perfect.
export function detectTech($, html) {
  const signatures = [
    { name: 'WordPress', test: () => /wp-content|wp-includes/i.test(html) },
    { name: 'Shopify', test: () => /cdn\.shopify\.com|Shopify\.theme/i.test(html) },
    { name: 'Wix', test: () => /wix\.com|_wixCssColors/i.test(html) },
    { name: 'Squarespace', test: () => /squarespace\.com|static1\.squarespace/i.test(html) },
    { name: 'Webflow', test: () => /webflow\.com|data-wf-page/i.test(html) },
    { name: 'React', test: () => /__NEXT_DATA__|data-reactroot|react-dom/i.test(html) },
    { name: 'Laravel', test: () => /laravel_session|csrf-token/i.test(html) },
  ];

  const detected = signatures.filter((s) => s.test()).map((s) => s.name);

  return {
    cms: detected.length ? detected[0] : null,
    allDetected: detected,
    isStatic: detected.length === 0,
  };
}