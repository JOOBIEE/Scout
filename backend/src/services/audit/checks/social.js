export function checkSocial($) {
  const html = $.html().toLowerCase();

  const platforms = {
    instagram: /instagram\.com\/[a-z0-9_.]+/i,
    facebook: /facebook\.com\/[a-z0-9_.]+/i,
    linkedin: /linkedin\.com\/(company|in)\/[a-z0-9_-]+/i,
    tiktok: /tiktok\.com\/@[a-z0-9_.]+/i,
    youtube: /youtube\.com\/(channel|c|user|@)[a-z0-9_-]+/i,
  };

  const found = {};
  for (const [platform, pattern] of Object.entries(platforms)) {
    const match = html.match(pattern);
    found[platform] = match ? match[0] : null;
  }

  const linkedCount = Object.values(found).filter(Boolean).length;

  return { found, linkedCount };
}