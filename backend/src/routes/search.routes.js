import express from 'express';
import pLimit from 'p-limit';
import prisma from '../db/client.js';
import { searchBusinesses } from '../services/places.service.js';
import { pickBestWebsite, verifyWebsiteMatch } from '../services/domainGuesser.service.js';
import { runAudit } from '../services/audit/runAudit.js';
import { computeRawScore, assignTiers } from '../services/priority/priorityEngine.js';

const router = express.Router();

const GUESS_CONCURRENCY = Number(process.env.GUESS_CONCURRENCY) || 2;

// The actual pipeline - runs in the background, NOT awaited by the request handler.
async function runPipeline(searchId, businessType, location) {
  const limit = pLimit(GUESS_CONCURRENCY);

  try {
    // --- Step 1: fetch raw places ---
    const places = await searchBusinesses(businessType, location);

    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'collecting', totalBusinesses: places.length },
    });

    // --- Step 2: upsert businesses, attach to this search ---
    const businesses = await Promise.all(
      places.map(async (place) => {
        const existing = await prisma.business.findUnique({
          where: { externalPlaceId: place.fsq_place_id },
        });

        const business = await prisma.business.upsert({
          where: { externalPlaceId: place.fsq_place_id },
          update: {
            phone: place.tel || undefined,
            websiteUrl: place.website || undefined,
          },
          create: {
            name: place.name || 'Unknown',
            address: place.location?.formatted_address || null,
            phone: place.tel || null,
            websiteUrl: place.website || null,
            websiteSource: place.website ? 'foursquare' : null,
            externalPlaceId: place.fsq_place_id,
          },
        });

        await prisma.searchResult.upsert({
          where: { searchId_businessId: { searchId, businessId: business.id } },
          update: {},
          create: { searchId, businessId: business.id, isNew: !existing },
        });

        return { ...business, isNew: !existing };
      })
    );

    // --- Step 3: guess websites for new businesses without one ---
    await prisma.search.update({ where: { id: searchId }, data: { status: 'guessing' } });

    await Promise.all(
      businesses
        .filter((b) => b.isNew && !b.websiteUrl)
        .map((b) =>
          limit(async () => {
            const best = await pickBestWebsite(b.name, location, b.phone);
            if (best) {
              await prisma.business.update({
                where: { id: b.id },
                data: { websiteUrl: best.url, websiteSource: 'guessed', websiteConfidence: best.confidence },
              });
            }
          })
        )
    );

    // --- Step 4: verify every unverified URL ---
    await prisma.search.update({ where: { id: searchId }, data: { status: 'verifying' } });

    const unverifiedBusinesses = await prisma.business.findMany({
      where: { websiteUrl: { not: null }, websiteConfidence: null },
    });

    await Promise.all(
      unverifiedBusinesses.map((b) =>
        limit(async () => {
          const result = await verifyWebsiteMatch(b.websiteUrl, b.name, location, b.phone);
          const confidence = Math.round(Math.min((result.score / 70) * 100, 100));
          await prisma.business.update({ where: { id: b.id }, data: { websiteConfidence: confidence } });
        })
      )
    );

    // --- Step 5: audit every business (skip already-audited / low-confidence guesses) ---
    await prisma.search.update({ where: { id: searchId }, data: { status: 'auditing' } });

    const needsAudit = await prisma.business.findMany({
      where: {
        id: { in: businesses.map((b) => b.id) },
        audit: null,
        websiteUrl: { not: null },
        OR: [{ websiteConfidence: null }, { websiteConfidence: { gte: 50 } }],
      },
    });

    let auditedSoFar = 0;

    await Promise.all(
      needsAudit.map((b) =>
        limit(async () => {
          const result = await runAudit(b.websiteUrl, b.id);

          if (result.status === 'no_website') {
            await prisma.websiteAudit.create({ data: { businessId: b.id, status: 'no_website' } });
          } else if (result.status === 'failed') {
            await prisma.websiteAudit.create({
              data: { businessId: b.id, status: 'failed', rawFindings: JSON.stringify({ error: result.error }) },
            });
          } else {
            await prisma.websiteAudit.create({
              data: {
                businessId: b.id,
                status: 'done',
                title: result.title,
                metaDescription: result.metaDescription,
                techStack: result.techStack,
                hasSsl: result.hasSsl,
                loadTimeMs: result.loadTimeMs,
                seoScore: result.seoScore,
                trustScore: result.trustScore,
                brandingScore: result.brandingScore,
                overallScore: result.overallScore,
                rawFindings: result.rawFindings,
                screenshotDesktopPath: result.screenshotDesktopPath,
                screenshotMobilePath: result.screenshotMobilePath,
                auditedAt: new Date(),
              },
            });

            if (result.opportunities?.length) {
              await prisma.opportunity.createMany({
                data: result.opportunities.map((o) => ({
                  businessId: b.id,
                  text: o.text,
                  category: o.category,
                  severity: o.severity,
                })),
              });
            }
          }

          auditedSoFar += 1;
          await prisma.search.update({ where: { id: searchId }, data: { auditedCount: auditedSoFar } });
        })
      )
    );

    // --- Step 6: recompute priority for everyone in this search ---
    await prisma.search.update({ where: { id: searchId }, data: { status: 'prioritizing' } });

    const forPriority = await prisma.business.findMany({
      where: { id: { in: businesses.map((b) => b.id) }, audit: { isNot: null } },
      include: { audit: true, opportunities: true },
    });

    const rawScores = forPriority
      .map((b) => {
        const result = computeRawScore(b);
        return result ? { businessId: b.id, score: result.score, reasoning: result.reasoning } : null;
      })
      .filter(Boolean);

    const tiered = assignTiers(rawScores);

    for (const entry of tiered) {
      await prisma.priorityScore.upsert({
        where: { businessId: entry.businessId },
        update: { score: entry.score, reasoning: JSON.stringify({ tier: entry.tier, reasons: entry.reasoning }), computedAt: new Date() },
        create: { businessId: entry.businessId, score: entry.score, reasoning: JSON.stringify({ tier: entry.tier, reasons: entry.reasoning }) },
      });
    }

    await prisma.search.update({ where: { id: searchId }, data: { status: 'done' } });
  } catch (err) {
    console.error(`Pipeline failed for search ${searchId}:`, err);
    await prisma.search
      .update({ where: { id: searchId }, data: { status: 'failed', errorMessage: err.message } })
      .catch(() => {});
  }
}

// Kicks off a search and returns immediately - does NOT wait for the pipeline.
router.post('/', async (req, res) => {
  const { businessType, location } = req.body;

  if (!businessType || !location) {
    return res.status(400).json({ error: 'businessType and location are required' });
  }

  try {
    const search = await prisma.search.create({
      data: { businessType, location, status: 'pending' },
    });

    // Fire and forget - intentionally not awaited.
    runPipeline(search.id, businessType, location);

    res.status(202).json({ searchId: search.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Lightweight polling endpoint - just status/progress, no business data.
router.get('/:id/status', async (req, res) => {
  try {
    const search = await prisma.search.findUnique({ where: { id: req.params.id } });
    if (!search) return res.status(404).json({ error: 'Search not found' });
    res.json({
      status: search.status,
      totalBusinesses: search.totalBusinesses,
      auditedCount: search.auditedCount,
      errorMessage: search.errorMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Full results, fetched once the search is done (or to revisit a past search).
router.get('/:id', async (req, res) => {
  try {
    const search = await prisma.search.findUnique({ where: { id: req.params.id } });
    if (!search) return res.status(404).json({ error: 'Search not found' });

    const results = await prisma.searchResult.findMany({
      where: { searchId: search.id },
      include: { business: { include: { audit: true, opportunities: true, priorityScore: true, crmStatus: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ search, businesses: results.map((r) => ({ ...r.business, isNew: r.isNew })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;