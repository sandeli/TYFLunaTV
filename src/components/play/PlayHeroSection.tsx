'use client';

import { useMemo } from 'react';
import { processImageUrl } from '@/lib/utils';

interface PlayHeroSectionProps {
  title: string;
  year?: string;
  cover?: string;
  sourceName?: string;
  totalEpisodes: number;
  currentEpisodeIndex: number;
  episodeName?: string;
  backdropUrl?: string | null;
  plot?: string;
  rate?: string;
}

export default function PlayHeroSection({
  title,
  year,
  cover,
  sourceName,
  totalEpisodes,
  currentEpisodeIndex,
  episodeName,
  backdropUrl,
  plot,
  rate,
}: PlayHeroSectionProps) {
  const bgUrl = useMemo(() => {
    if (backdropUrl) return backdropUrl;
    if (cover) return processImageUrl(cover);
    return null;
  }, [backdropUrl, cover]);

  if (!bgUrl) return null;

  const episodeText = totalEpisodes > 1
    ? episodeName || `第 ${currentEpisodeIndex + 1} 集`
    : null;

  return (
    <section className="relative overflow-hidden rounded-xl mb-2" style={{ minHeight: 200 }}>
      {/* 背景图 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bgUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* 渐变遮罩 — 左侧深右侧浅，底部深 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col justify-end gap-3 p-4 sm:p-6 md:p-8" style={{ minHeight: 200 }}>
        {/* 标签行 */}
        <div className="flex flex-wrap items-center gap-2">
          {sourceName && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/20">
              {sourceName}
            </span>
          )}
          {year && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/20">
              {year}
            </span>
          )}
          {rate && parseFloat(rate) > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/80 text-white">
              ★ {parseFloat(rate).toFixed(1)}
            </span>
          )}
          {episodeText && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/20">
              {episodeText}
            </span>
          )}
        </div>

        {/* 标题 */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight line-clamp-2">
          {title}
        </h1>

        {/* 简介 */}
        {plot && (
          <p className="text-sm text-white/75 leading-relaxed line-clamp-2 md:line-clamp-3 max-w-2xl">
            {plot}
          </p>
        )}
      </div>
    </section>
  );
}
