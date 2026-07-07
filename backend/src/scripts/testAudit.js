import { runAudit } from '../services/audit/runAudit.js';

const url = process.argv[2];
if (!url) {
  console.log('Usage: node src/scripts/testAudit.js "https://example.com"');
  process.exit(1);
}

const result = await runAudit(url);
console.log(JSON.stringify(result, null, 2));
process.exit(0);