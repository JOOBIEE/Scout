import * as cheerio from 'cheerio';
import { detectTech } from './checks/tech.js';
import { checkSeo } from './checks/seo.js';
import { checkSocial } from './checks/social.js';
import { checkContact } from './checks/contact.js';
import { checkTrust } from './checks/trust.js';
import { checkConversion } from './checks/conversion.js';
import { captureScreenshots } from './screenshot.js';

const TIMEOUT_MS = 10000;
const USER_AGENT = 'ScoutBot/1.0 (+website audit)';

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const start = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    const loadTimeMs = Date.now() - start;

    if (!response.ok) return { error: `HTTP ${response.status}`, loadTimeMs };

    const html = await response.text();
    return { html, loadTimeMs, finalUrl: response.url };
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'Timeout' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}

function buildOpportunities({ seo, social, contact, trust, conversion, hasSsl }) {
  const opportunities = [];

  for (const f of seo.findings) {
    opportunities.push({ text: f.text, category: 'seo', severity: f.severity });
  }
  if (!hasSsl) {
    opportunities.push({ text: 'No SSL certificate (site is not HTTPS)', category: 'trust', severity: 'high' });
  }
  if (!trust.hasTestimonials) {
    opportunities.push({ text: 'No testimonials or reviews shown on site', category: 'trust', severity: 'medium' });
  }
  if (!trust.hasMapEmbed) {
    opportunities.push({ text: 'No Google Map embedded', category: 'trust', severity: 'low' });
  }
  if (!trust.hasPrivacyPolicy) {
    opportunities.push({ text: 'No privacy policy link found', category: 'trust', severity: 'low' });
  }
  if (!contact.hasWhatsapp) {
    opportunities.push({ text: 'No WhatsApp contact option', category: 'conversion', severity: 'low' });
  }
  if (!contact.hasContactForm && !contact.hasEmail) {
    opportunities.push({ text: 'No contact form or visible email address', category: 'conversion', severity: 'high' });
  }
  if (!conversion.hasAnyCta) {
    opportunities.push({ text: 'No clear call-to-action button (Book Now, Get Quote, etc.)', category: 'conversion', severity: 'high' });
  }
  if (social.linkedCount === 0) {
    opportunities.push({ text: 'No social media links found', category: 'branding', severity: 'medium' });
  }

  return opportunities;
}

function scoreTrust({ hasSsl, trust }) {
  let score = 100;
  if (!hasSsl) score -= 30;
  if (!trust.hasTestimonials) score -= 20;
  if (!trust.hasGoogleReviewsEmbed) score -= 10;
  if (!trust.hasPrivacyPolicy) score -= 15;
  if (!trust.hasTermsOfService) score -= 10;
  if (!trust.hasMapEmbed) score -= 15;
  return Math.max(0, score);
}

function scoreBranding({ social }) {
  let score = 60; // baseline - we can't assess visual design without a real render, so start conservative
  score += Math.min(social.linkedCount * 10, 40);
  return Math.min(100, score);
}

export async function runAudit(websiteUrl, businessId) {
  if (!websiteUrl) return { status: 'no_website' };

  const { html, loadTimeMs, finalUrl, error } = await fetchHtml(websiteUrl);
  if (error) return { status: 'failed', error };

  const $ = cheerio.load(html);

  const tech = detectTech($, html);
  const seo = checkSeo($);
  const social = checkSocial($);
  const contact = checkContact($, html);
  const trust = checkTrust($, html);
  const conversion = checkConversion($);
  const hasSsl = (finalUrl || websiteUrl).startsWith('https://');

  const trustScore = scoreTrust({ hasSsl, trust });
  const brandingScore = scoreBranding({ social });
  const overallScore = Math.round((seo.score + trustScore + brandingScore) / 3);

  const opportunities = buildOpportunities({ seo, social, contact, trust, conversion, hasSsl });
  const { desktopPath, mobilePath } = await captureScreenshots(finalUrl || websiteUrl, businessId);

  return {
    status: 'done',
    title: seo.title,
    metaDescription: seo.metaDescription,
    techStack: JSON.stringify(tech),
    hasSsl,
    loadTimeMs,
    seoScore: seo.score,
    trustScore,
    brandingScore,
    overallScore,
    opportunities,
    rawFindings: JSON.stringify({ tech: tech.allDetected, social, contact, trust, conversion }),
    screenshotDesktopPath: desktopPath,
    screenshotMobilePath: mobilePath,
  };
}