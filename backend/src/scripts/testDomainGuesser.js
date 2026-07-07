import { guessWebsiteCandidates, closeBrowser } from '../services/domainGuesser.service.js';

const businessName = process.argv[2];
const location = process.argv[3];
const phone = process.argv[4] || null;

if (!businessName || !location) {
  console.log('Usage: node src/scripts/testDomainGuesser.js "Business Name" "Location" ["Phone"]');
  process.exit(1);
}

console.log(`Guessing candidates for "${businessName}" in "${location}"...\n`);

const start = Date.now();
const candidates = await guessWebsiteCandidates(businessName, location, phone);
const elapsed = Date.now() - start;

if (!candidates.length) {
  console.log(`No candidates resolved. (${elapsed}ms)`);
} else {
  candidates.forEach((c, i) => {
    console.log(`${i + 1}. ${c.url}  —  confidence: ${c.confidence}`);
    c.reasons.forEach((r) => console.log(`   ${r}`));
  });
  console.log(`\n(${elapsed}ms total)`);
}

await closeBrowser();
process.exit(0);