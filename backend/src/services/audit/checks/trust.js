export function checkTrust($, html) {
  const lowerHtml = html.toLowerCase();

  const hasTestimonials = /testimonial|review|what our (clients|customers) say/i.test(html);
  const hasGoogleReviewsEmbed = /reviews\.google|g2crowd|elfsight.*review/i.test(html);
  const hasPrivacyPolicy = $('a').filter((_, el) =>
    /privacy( policy)?/i.test($(el).text())
  ).length > 0;
  const hasTermsOfService = $('a').filter((_, el) =>
    /terms( of (service|use))?/i.test($(el).text())
  ).length > 0;
  const hasMapEmbed = /google\.com\/maps|maps\.google/i.test(html);

  return {
    hasTestimonials,
    hasGoogleReviewsEmbed,
    hasPrivacyPolicy,
    hasTermsOfService,
    hasMapEmbed,
  };
}