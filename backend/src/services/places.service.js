const FSQ_API_BASE = 'https://places-api.foursquare.com/places/search';
const MAX_RESULTS = 100;
const PAGE_SIZE = 50;

async function fetchPage(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY}`,
      Accept: 'application/json',
      'X-Places-Api-Version': '2025-06-17',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Foursquare API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  // Pagination info comes back in the Link response header, not the body -
  // format is like: <https://...&cursor=xyz>; rel="next"
  const linkHeader = response.headers.get('link');
  let nextUrl = null;
  if (linkHeader) {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (match) nextUrl = match[1];
  }

  return { results: data.results || [], nextUrl };
}

export async function searchBusinesses(businessType, location) {
  const initialQuery = new URLSearchParams({
    query: businessType,
    near: location,
    limit: String(PAGE_SIZE),
  });

  let url = `${FSQ_API_BASE}?${initialQuery.toString()}`;
  let allResults = [];

  while (url && allResults.length < MAX_RESULTS) {
    const { results, nextUrl } = await fetchPage(url);
    allResults = allResults.concat(results);
    url = nextUrl;
  }

  return allResults.slice(0, MAX_RESULTS);
}