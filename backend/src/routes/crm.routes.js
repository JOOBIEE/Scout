import express from 'express';
import prisma from '../db/client.js';

const router = express.Router();

const VALID_STATUSES = [
  'not_contacted',
  'dm_sent',
  'email_sent',
  'follow_up_1',
  'meeting',
  'proposal',
  'won',
  'lost',
];

router.put('/:businessId', async (req, res) => {
  const { status, notes } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const crmStatus = await prisma.crmStatus.upsert({
      where: { businessId: req.params.businessId },
      update: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      create: {
        businessId: req.params.businessId,
        status: status || 'not_contacted',
        notes: notes || null,
      },
    });

    res.json(crmStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;