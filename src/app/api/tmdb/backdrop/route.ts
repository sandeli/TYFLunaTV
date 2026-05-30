import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const year = searchParams.get('year')?.trim();

  if (!title) return NextResponse.json({ data: null }, { status: 400 });

  const config = await getConfig();
  const apiKey = config.SiteConfig?.TMDBApiKey;
  if (!apiKey) return NextResponse.json({ data: null });

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
      if (!hit) return null;
      return {
        backdrop: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : null,
        poster: hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null,
        title: (type === 'movie' ? hit.title : hit.name) || null,
        overview: hit.overview || null,
        rating: hit.vote_average ? parseFloat(hit.vote_average.toFixed(1)) : null,
        year: (type === 'movie' ? hit.release_date : hit.first_air_date)?.slice(0, 4) || null,
      };
    } catch {
      return null;
    }
  };

  const data = (await trySearch('movie')) || (await trySearch('tv'));

  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
