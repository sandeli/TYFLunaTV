import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const CACHE_TTL = 86400; // 24小时

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const originalTitle = searchParams.get('original_title')?.trim();
  const year = searchParams.get('year')?.trim();

  if (!title && !originalTitle) return NextResponse.json({ data: null }, { status: 400 });

  const config = await getConfig();
  const apiKey = config.SiteConfig?.TMDBApiKey;
  if (!apiKey) return NextResponse.json({ data: null });

  const cacheKey = `tmdb-backdrop-${originalTitle || title}-${year || ''}`;

  // 服务端缓存
  const cached = await db.getCache(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached },
      { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' } });
  }

  const lang = config.SiteConfig?.TMDBLanguage || 'zh-CN';
  const base = 'https://api.themoviedb.org/3';

  const pickLogo = (logos: any[]) => {
    if (!logos?.length) return null;
    const sorted = logos.slice().sort(
      (a, b) => (b.vote_average || 0) - (a.vote_average || 0) || (b.vote_count || 0) - (a.vote_count || 0)
    );
    const logo = sorted.find((l: any) => l.iso_639_1 === 'zh') ||
      sorted.find((l: any) => l.iso_639_1 === 'en') ||
      sorted[0];
    return logo?.file_path ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null;
  };

  const trySearch = async (query: string, type: 'movie' | 'tv') => {
    const yearParam = year
      ? type === 'movie' ? `&year=${year}` : `&first_air_date_year=${year}`
      : '';
    try {
      const res = await fetch(
        `${base}/search/${type}?api_key=${apiKey}&language=${lang}&query=${encodeURIComponent(query)}${yearParam}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const hit = data.results?.[0];
      if (!hit) return null;

      const imagesRes = await fetch(
        `${base}/${type}/${hit.id}/images?api_key=${apiKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      const images = imagesRes.ok ? await imagesRes.json() : null;
      const logoUrl = pickLogo(images?.logos || []);

      return {
        backdrop: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : null,
        poster: hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null,
        logo: logoUrl,
        title: (type === 'movie' ? hit.title : hit.name) || null,
        overview: hit.overview || null,
        rating: hit.vote_average ? parseFloat(hit.vote_average.toFixed(1)) : null,
        year: (type === 'movie' ? hit.release_date : hit.first_air_date)?.slice(0, 4) || null,
      };
    } catch {
      return null;
    }
  };

  const searchQuery = originalTitle || title!;
  const fallbackQuery = originalTitle && title ? title : null;

  let data = (await trySearch(searchQuery, 'movie')) || (await trySearch(searchQuery, 'tv'));
  if (!data && fallbackQuery) {
    data = (await trySearch(fallbackQuery, 'movie')) || (await trySearch(fallbackQuery, 'tv'));
  }

  // 写入服务端缓存
  if (data) await db.setCache(cacheKey, data, CACHE_TTL);

  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
