"use client";

import { useState } from "react";

// 轻量 YouTube 嵌入：先展示封面 + 播放键，点击后才加载 iframe（省流、不阻塞信息流）
export default function YouTubeLite({
  id,
  channel,
  rounded = "rounded-xl",
}: {
  id: string;
  channel?: string;
  rounded?: string;
}) {
  const [play, setPlay] = useState(false);

  return (
    <div className={`relative w-full aspect-video bg-black overflow-hidden ${rounded}`}>
      {play ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPlay(true);
          }}
          className="absolute inset-0 w-full h-full group"
          aria-label="播放视频"
        >
          {/* 封面 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition" />
          {/* 播放键 */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur flex items-center justify-center ring-1 ring-white/30 group-hover:scale-105 transition">
              <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          {/* 来源角标 */}
          {channel && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-medium">
              ▶ {channel}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
