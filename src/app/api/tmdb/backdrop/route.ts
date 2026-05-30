import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const year = searchParams.get('year')?.trim();

  if (!title) return NextResponse.json({ backdrop: null }, { status: 400 });

  const config = await getConfig();
  const apiKey = config.SiteConfig?.TMDBApiKey;
  if (!apiKey) return NextResponse.json({ backdrop: null });

  const lang = config.SiteConfig?.TMDBLanguage || 'zh-CN';
  const base = 'https://api.themoviedb.org/3';

  const trySearch = async (type: 'movie' | 'tv') => {
    const yearParam = year
      ? type === 'movie' ? `&year=${year}` : `&first_air_date_year=${year}`
      : '';
    try {
      const res = await fetch(
        `${base}/search/${type}?api_key=${apiKey}&language=${lang}&query=${encodeURIComponent(title)}${yearParam}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const hit = data.results?.[0];
      if (!hit?.backdrop_path) return null;
      return `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}`;
    } catch {
      return null;
    }
  };

  const backdrop = (await trySearch('movie')) || (await trySearch('tv'));

  return NextResponse.json(
    { backdrop },
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
