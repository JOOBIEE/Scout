import express from 'express';
import prisma from '../db/client.js';
import { generateReportPdf } from '../services/pdf/report.service.js';

const router = express.Router();

router.post('/:businessId', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
      include: { audit: true, opportunities: true },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const reportPath = await generateReportPdf(business);
    res.json({ reportPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;