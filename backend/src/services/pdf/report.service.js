import fs from 'fs';
import path from 'path';
import { getBrowser } from '../browserManager.service.js';
import { buildReportHtml } from './reportTemplate.js';

const REPORT_DIR = process.env.REPORT_DIR || path.join(process.cwd(), 'public', 'reports');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export async function generateReportPdf(business) {
  const html = buildReportHtml(business);
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const filename = `${business.id}-report.pdf`;
    const filePath = path.join(REPORT_DIR, filename);

    await page.pdf({ path: filePath, format: 'A4', printBackground: true });

    return `/reports/${filename}`;
  } finally {
    await context.close();
  }
}