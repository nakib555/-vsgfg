// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: Use environment variables in a real application!
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || "YOUR_GOOGLE_CSE_API_KEY_FALLBACK";
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || "YOUR_GOOGLE_CSE_ID_FALLBACK";

interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      [key: string]: string;
    }>;
  };
}

interface GoogleSearchResponse {
  items?: SearchResultItem[];
  error?: {
    code: number;
    message: string;
  };
  searchInformation?: {
    formattedTotalResults?: string;
    formattedSearchTime?: string;
  };
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_SEARCH_API_KEY || GOOGLE_SEARCH_API_KEY === "YOUR_GOOGLE_CSE_API_KEY_FALLBACK") {
    console.error("Google Search API Key is not configured.");
    return NextResponse.json({ error: "Search service is not configured (API Key missing)." }, { status: 500 });
  }
  if (!GOOGLE_SEARCH_ENGINE_ID || GOOGLE_SEARCH_ENGINE_ID === "YOUR_GOOGLE_CSE_ID_FALLBACK") {
    console.error("Google Search Engine ID is not configured.");
    return NextResponse.json({ error: "Search service is not configured (Engine ID missing)." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const query = body.query;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Search query is required and must be a string.' }, { status: 400 });
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;

    console.log(`[API Search] Performing search for: "${query}"`);
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorData: GoogleSearchResponse = await searchResponse.json().catch(() => ({}));
      console.error(`[API Search] Google Search API error: ${searchResponse.status}`, errorData);
      const message = errorData.error?.message || `Google Search API request failed with status ${searchResponse.status}`;
      return NextResponse.json({ error: `Search failed: ${message}` }, { status: searchResponse.status });
    }

    const searchData: GoogleSearchResponse = await searchResponse.json();

    if (searchData.error) {
        console.error(`[API Search] Google Search API returned an error object:`, searchData.error);
        return NextResponse.json({ error: `Search API error: ${searchData.error.message}` }, { status: searchData.error.code || 500 });
    }

    const formattedResults = searchData.items?.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      description: item.pagemap?.metatags?.find(tag => tag['og:description'])?.['og:description'] || item.snippet,
    })) || [];

    console.log(`[API Search] Found ${formattedResults.length} results for "${query}".`);
    return NextResponse.json({ results: formattedResults, searchInformation: searchData.searchInformation });

  } catch (error: any) {
    console.error('[API Search] Internal error:', error);
    return NextResponse.json({ error: `An internal error occurred: ${error.message}` }, { status: 500 });
  }
}