import express from 'express';
import prisma from '../db/client.js';
import { generateTemplateOutreach } from '../services/outreach/templateGenerator.js';
import { buildOutreachPrompt } from '../services/outreach/promptBuilder.js';

const router = express.Router();

// Generate a free, template-based draft and save it.
router.post('/:businessId/template', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
      include: { audit: true, opportunities: true },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const draft = generateTemplateOutreach(business);

    const message = await prisma.outreachMessage.create({
      data: {
        businessId: business.id,
        channel: draft.channel,
        subject: draft.subject,
        body: draft.body,
      },
    });

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Return a ready-to-paste prompt for Claude.ai - no API call, no cost.
router.get('/:businessId/prompt', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
      include: { audit: true, opportunities: true },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const prompt = buildOutreachPrompt(business);
    res.json({ prompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;