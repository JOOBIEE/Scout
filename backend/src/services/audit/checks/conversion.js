export function checkConversion($) {
  const buttonTexts = [];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text) buttonTexts.push(text);
  });

  const ctaPatterns = {
    bookNow: /book now|book an appointment|schedule/i,
    getQuote: /get a quote|request a quote|free quote/i,
    contactUs: /contact us|get in touch|reach out/i,
    whatsapp: /whatsapp|chat with us/i,
    orderNow: /order now|order online|shop now/i,
  };

  const found = {};
  for (const [key, pattern] of Object.entries(ctaPatterns)) {
    found[key] = buttonTexts.some((t) => pattern.test(t));
  }

  const hasAnyCta = Object.values(found).some(Boolean);

  return { found, hasAnyCta };
}