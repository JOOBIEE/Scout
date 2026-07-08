import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { chromium } from 'playwright';
import { getBrowser } from './browserManager.service.js';

const TIMEOUT_MS = 7000;
const CONCURRENCY = 8;
const PLAYWRIGHT_CONCURRENCY = Number(process.env.PLAYWRIGHT_CONCURRENCY) || 1;
const USER_AGENT = 'ScoutBot/1.0 (+business website checker)';

const CORPORATE_SUFFIXES = [
  'ltd', 'limited', 'inc', 'llc', 'co', 'company', 'enterprises',
  'group', 'official', 'the', 'and', 'nigeria',
];

const DESCRIPTOR_WORDS = [
  'clinic', 'hospital', 'restaurant', 'hotel', 'store', 'shop',
  'services', 'center', 'centre', 'company',
];

const US_STATES = {
  texas: 'tx', california: 'ca', florida: 'fl', 'new york': 'ny',
  illinois: 'il', georgia: 'ga', ohio: 'oh', michigan: 'mi',
  arizona: 'az', washington: 'wa', pennsylvania: 'pa',
};

const CCTLD_RULES = [
  { match: /nigeria|lagos|abuja|ibadan|kano|port harcourt/i, tlds: ['.com.ng', '.ng'] },
  { match: /kenya|nairobi/i, tlds: ['.co.ke'] },
  { match: /south africa|johannesburg|cape town/i, tlds: ['.co.za'] },
  { match: /united kingdom|england|london|\buk\b/i, tlds: ['.co.uk'] },
  { match: /canada|toronto|vancouver/i, tlds: ['.ca'] },
  { match: /india|mumbai|delhi|bangalore/i, tlds: ['.in'] },
];

const cache = new Map();
const playwrightVerifyLimit = pLimit(PLAYWRIGHT_CONCURRENCY);



function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseLocation(location) {
  const parts = location.split(',').map((p) => p.trim().toLowerCase());
  const city = parts[0] || null;
  const region = parts[1] || null;
  const stateAbbrev = region && US_STATES[region] ? US_STATES[region] : null;
  return { city, region, stateAbbrev };
}

function guessTlds(location) {
  const rule = CCTLD_RULES.find((r) => r.match.test(location));
  return rule ? [...rule.tlds, '.com'] : ['.com'];
}

function nameVariants(name) {
  const words = tokenize(name);
  const variants = [];

  variants.push({ words, baseConfidence: 55 });

  const noCorporate = words.filter((w) => !CORPORATE_SUFFIXES.includes(w));
  if (noCorporate.length && noCorporate.length !== words.length) {
    variants.push({ words: noCorporate, baseConfidence: 65 });
  }

  const core = noCorporate.filter((w) => !DESCRIPTOR_WORDS.includes(w));
  if (core.length && core.length !== noCorporate.length) {
    variants.push({ words: core, baseConfidence: 60 });
  }

  const droppedLast = words.slice(0, -1);
  if (droppedLast.length >= 2) {
    variants.push({ words: droppedLast, baseConfidence: 50 });
  }

  const seen = new Map();
  for (const v of variants) {
    const key = v.words.join('');
    if (!seen.has(key) || seen.get(key).baseConfidence < v.baseConfidence) {
      seen.set(key, v);
    }
  }
  return [...seen.values()];
}

function buildCandidates(businessName, location) {
  const { city, stateAbbrev } = parseLocation(location);
  const tlds = guessTlds(location);
  const variants = nameVariants(businessName);

  const candidates = [];

  for (const variant of variants) {
    const base = variant.words.join('');

    const suffixed = [];
    if (city) suffixed.push({ slug: base + city.replace(/\s+/g, ''), bonus: 8 });
    if (stateAbbrev) suffixed.push({ slug: base + stateAbbrev, bonus: 4 });

    const allBases = [{ slug: base, bonus: 0 }, ...suffixed];

    for (const { slug, bonus } of allBases) {
      for (const tld of tlds) {
        const confidence = Math.min(variant.baseConfidence + bonus, 95);
        candidates.push({ url: `https://${slug}${tld}`, baseConfidence: confidence });
        candidates.push({ url: `https://www.${slug}${tld}`, baseConfidence: confidence });
      }
    }
  }

  return candidates
    .sort((a, b) => b.baseConfidence - a.baseConfidence)
    .slice(0, 30);
}

async function fetchUrl(url, method = 'HEAD', attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError' && attempt < 2) {
      return fetchUrl(url, method, attempt + 1);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreContent({ title, metaDesc, h1, bodyText }, businessName, location, knownPhone) {
  const nameTokens = tokenize(businessName).filter(
    (t) => !CORPORATE_SUFFIXES.includes(t) && !DESCRIPTOR_WORDS.includes(t)
  );
  const { city } = parseLocation(location);

  // A name is "generic" if, after stripping corporate/descriptor words, it's down
  // to one short common-shaped token - much more likely to coincidentally appear
  // on an unrelated site than a distinctive multi-word name.
  const isGenericName = nameTokens.length <= 1 && (nameTokens[0]?.length ?? 0) <= 8;

  const normalizedBusinessName = normalize(
    businessName.replace(/\b(ltd|limited|inc|llc|clinic|hospital|company|the)\b/gi, '')
  );
  const normalizedBodyText = normalize(`${title} ${metaDesc} ${h1} ${bodyText}`);

  // Corroborating signals - these are hard to fake by coincidence, so they count
  // at full weight regardless of how generic the name is.
  const cityMatch = Boolean(city && normalizedBodyText.includes(normalize(city)));
  let phoneMatch = false;
  if (knownPhone) {
    const digitsOnly = knownPhone.replace(/\D/g, '');
    const pageDigits = bodyText.replace(/\D/g, '');
    phoneMatch = digitsOnly.length >= 7 && pageDigits.includes(digitsOnly);
  }
  const corroborated = cityMatch || phoneMatch;

  // Name-content signals - full weight normally, but for a generic name with no
  // corroboration, treat them as weak/inconclusive rather than trustworthy.
  const nameWeight = isGenericName && !corroborated ? 0.3 : 1;

  let score = 0;
  const reasons = [];

  const tokenHitRate = nameTokens.length
    ? nameTokens.filter((t) => title.includes(t)).length / nameTokens.length
    : 0;
  if (tokenHitRate >= 0.5) {
    score += 30 * nameWeight;
    reasons.push(
      nameWeight < 1
        ? '~ Name found in title, but name is generic and unconfirmed elsewhere'
        : '✓ Business name found in page title'
    );
  }

  if (normalizedBusinessName.length >= 4 && normalizedBodyText.includes(normalizedBusinessName)) {
    score += 25 * nameWeight;
    if (nameWeight === 1) {
      reasons.push('✓ Business name matches page content (ignoring spacing/punctuation)');
    }
  }

  if (nameTokens.some((t) => h1.includes(t))) {
    score += 15 * nameWeight;
  }
  if (nameTokens.some((t) => metaDesc.includes(t))) {
    score += 10 * nameWeight;
  }

  if (cityMatch) {
    score += 15;
    reasons.push('✓ Same city mentioned on page');
  }
  if (phoneMatch) {
    score += 25;
    reasons.push('✓ Phone number matches');
  }

  return { score: Math.min(score, 70), reasons };
}

async function verifyWithCheerio(url, businessName, location, knownPhone) {
  const response = await fetchUrl(url, 'GET');
  if (!response || !response.ok) return { score: 0, reasons: [] };

  let html;
  try {
    html = await response.text();
  } catch {
    return { score: 0, reasons: [] };
  }

  const $ = cheerio.load(html);
  const title = $('title').text().toLowerCase();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').toLowerCase();
  const h1 = $('h1').first().text().toLowerCase();
  const bodyText = $('body').text().toLowerCase().slice(0, 5000);

  return scoreContent({ title, metaDesc, h1, bodyText }, businessName, location, knownPhone);
}

async function verifyWithPlaywright(url, businessName, location, knownPhone) {
  let browser;
  try {
    browser = await getBrowser();
  } catch {
    return { score: 0, reasons: [] };
  }

  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();

  try {
    await page.goto(url, { timeout: TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    const title = (await page.title().catch(() => '')).toLowerCase();
    const metaDesc = (
      (await page.getAttribute('meta[name="description"]', 'content').catch(() => '')) || ''
    ).toLowerCase();
    const h1 = (await page.locator('h1').first().innerText({ timeout: 2000 }).catch(() => '')).toLowerCase();
    const bodyText = (
      await page.locator('body').innerText({ timeout: 2000 }).catch(() => '')
    ).toLowerCase().slice(0, 5000);

    const result = scoreContent({ title, metaDesc, h1, bodyText }, businessName, location, knownPhone);
    if (result.score > 0) {
      result.reasons.push('✓ Verified via rendered page (JS-heavy site)');
    }
    return result;
  } catch {
    return { score: 0, reasons: [] };
  } finally {
    await context.close();
  }
}

// Public: verify any URL against any business, regardless of where the URL came from
// (guessed or handed to us directly by a data provider like Foursquare).
// Cheerio first (fast/cheap), Playwright only if Cheerio finds zero signal.
export async function verifyWebsiteMatch(url, businessName, location, knownPhone = null) {
  const cheerioResult = await verifyWithCheerio(url, businessName, location, knownPhone);
  if (cheerioResult.score > 0) return cheerioResult;

  return playwrightVerifyLimit(() =>
    verifyWithPlaywright(url, businessName, location, knownPhone)
  );
}

// Generates and checks candidate domains for a business with no known website.
// Returns candidates sorted by confidence, highest first.
export async function guessWebsiteCandidates(businessName, location, knownPhone = null) {
  const cacheKey = `${businessName.toLowerCase()}|${location.toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const candidates = buildCandidates(businessName, location);
  const limit = pLimit(CONCURRENCY);

  const checked = await Promise.all(
    candidates.map((c) =>
      limit(async () => {
        let response = await fetchUrl(c.url, 'HEAD');
        if (!response || [403, 405, 501].includes(response.status)) {
          response = await fetchUrl(c.url, 'GET');
        }
        const resolved = response && (response.ok || (response.status >= 300 && response.status < 400));
        return resolved ? c : null;
      })
    )
  );

  const alive = checked.filter(Boolean);

  const verified = await Promise.all(
    alive.map((c) =>
      limit(async () => {
        const final = await verifyWebsiteMatch(c.url, businessName, location, knownPhone);
        const confidence = Math.min(c.baseConfidence * 0.4 + final.score, 100);
        return { url: c.url, confidence: Math.round(confidence), reasons: final.reasons };
      })
    )
  );

  const result = verified.sort((a, b) => b.confidence - a.confidence);
  cache.set(cacheKey, result);
  return result;
}

// Convenience wrapper: returns the top guessed candidate only if it clears a threshold.
export async function pickBestWebsite(businessName, location, knownPhone = null, threshold = 70) {
  const candidates = await guessWebsiteCandidates(businessName, location, knownPhone);
  const top = candidates[0];
  return top && top.confidence >= threshold ? top : null;
}