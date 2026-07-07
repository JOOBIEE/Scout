export function checkContact($, html) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

  const hasPhone = phoneRegex.test(html);
  const hasEmail = emailRegex.test(html);
  const hasWhatsapp = /wa\.me\/|whatsapp\.com\/send|api\.whatsapp\.com/i.test(html);

  const forms = $('form');
  const hasContactForm = forms.filter((_, el) => {
    const formHtml = $(el).html()?.toLowerCase() || '';
    return /email|message|name|contact|subject/.test(formHtml);
  }).length > 0;

  return { hasPhone, hasEmail, hasWhatsapp, hasContactForm };
}