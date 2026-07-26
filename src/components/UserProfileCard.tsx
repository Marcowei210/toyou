"use client";

import React from "react";
import { DetectiveUser } from "@/context/AuthContext";
import { User, Settings, Crown } from "lucide-react";
import Link from "next/link";

interface UserProfileCardProps {
  user: DetectiveUser;
  onOpenAvatarModal: () => void;
}

// Calculate Level & Progress dynamically based on score (pt)
// <= 4 pts = Lv.0
// > 4 pts = Lv.1 (5-8)
// > 8 pts = Lv.2 (9-12)
// > 12 pts = Lv.3 (13-16)
// > 16 pts = Lv.4 (17-22)
// > 22 pts = Lv.5 (23+)
export function getLevelInfo(score: number = 0) {
  if (score <= 4) {
    return { level: 0, current: score, max: 4, percent: Math.min(100, Math.max(0, (score / 4) * 100)) };
  }
  if (score <= 8) {
    return { level: 1, current: score - 4, max: 4, percent: Math.min(100, Math.max(0, ((score - 4) / 4) * 100)) };
  }
  if (score <= 12) {
    return { level: 2, current: score - 8, max: 4, percent: Math.min(100, Math.max(0, ((score - 8) / 4) * 100)) };
  }
  if (score <= 16) {
    return { level: 3, current: score - 12, max: 4, percent: Math.min(100, Math.max(0, ((score - 12) / 4) * 100)) };
  }
  if (score <= 22) {
    return { level: 4, current: score - 16, max: 6, percent: Math.min(100, Math.max(0, ((score - 16) / 6) * 100)) };
  }
  return { level: 5, current: score, max: 100, percent: 100 };
}

export function getUserTitleByLevel(level: number = 0): string {
  switch (level) {
    case 0:
      return "那個新來的";
    case 1:
      return "那個誰";
    case 2:
      return "菜鳥";
    case 3:
      return "熟手";
    case 4:
      return "太讚了吧";
    case 5:
    default:
      return "站在頂峰的人";
  }
}

export function getUserTitleByScore(score: number = 0): string {
  const { level } = getLevelInfo(score);
  return getUserTitleByLevel(level);
}

export default function UserProfileCard({ user, onOpenAvatarModal }: UserProfileCardProps) {
  const levelInfo = getLevelInfo(user.score || 0);
  const currentTitle = getUserTitleByLevel(levelInfo.level);

  return (
    <div className="bg-[#E6D5B8] border-2 border-black p-3.5 sm:p-5 md:p-6 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-row items-center justify-between gap-3 sm:gap-6 font-bold select-none -rotate-1 hover:rotate-0 transition-transform">
      {/* Left: Avatar + Lv. Badge & Thermometer */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          onClick={onOpenAvatarModal}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 sm:border-4 border-black bg-white overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative group shrink-0"
          title="Click to edit Detective Profile Avatar"
        >
          {user.avatarUrl ? (
            user.avatarUrl.startsWith("<svg") || user.avatarUrl.includes("%3Csvg") ? (
              <img
                src={user.avatarUrl.startsWith("<svg") ? `data:image/svg+xml;utf8,${encodeURIComponent(user.avatarUrl)}` : user.avatarUrl}
                alt="Detective Badge"
                className="w-full h-full object-contain p-1 bg-white"
              />
            ) : (
              <img
                src={user.avatarUrl}
                alt="Detective Badge"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <User className="w-10 h-10 text-stone-700 group-hover:text-black transition-colors" />
          )}

          {/* Hover overlay with gear icon */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Settings className="w-5 h-5 text-amber-300 animate-spin" />
          </div>
        </button>

        {/* Lv. Badge + Thermometer Progress Bar */}
        <div className="flex flex-col items-center gap-1 bg-yellow-100 border-2 border-black px-2 py-1 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full">
          <div className="bg-amber-300 border border-black px-2 py-0.2 text-xs sm:text-sm font-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded">
            Lv. {levelInfo.level}
          </div>
          <div className="w-16 sm:w-20 h-2.5 sm:h-3 bg-white border border-black rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-amber-500 transition-all duration-500 rounded-full"
              style={{ width: `${levelInfo.percent}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs text-stone-800 font-black">
            {levelInfo.current}/{levelInfo.max} EXP
          </span>
        </div>
      </div>

      {/* Right: Stacked text fields: Name, Title, ID, pt */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="bg-yellow-100 border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full flex items-center justify-between">
          <span className="text-stone-800 text-sm md:text-base font-extrabold mr-1 shrink-0">Name:</span>
          <span className="text-base md:text-lg font-black text-black truncate">{user.nickname}</span>
        </div>

        <div className="bg-yellow-100 border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full flex items-center justify-between">
          <span className="text-stone-800 text-sm md:text-base font-extrabold mr-1 shrink-0">Title:</span>
          <span className="text-base md:text-lg font-black text-amber-800 truncate">{currentTitle}</span>
        </div>

        <div className="bg-yellow-100 border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full flex items-center justify-between">
          <span className="text-stone-800 text-sm md:text-base font-extrabold mr-1 shrink-0">ID:</span>
          <span className="text-base md:text-lg font-black text-black truncate">{user.accountId}</span>
        </div>

        <div className="bg-amber-300 border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full flex items-center justify-between">
          <span className="text-stone-900 text-sm md:text-base font-black shrink-0">pt:</span>
          <span className="text-lg md:text-xl font-black text-black">{user.score || 0}</span>
        </div>

        {user.role === "host" && (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-black bg-amber-300 hover:bg-black hover:text-white text-black text-sm md:text-base font-black tracking-wider uppercase transition-none rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full"
          >
            <Crown className="w-4 h-4" />
            <span>GM HQ</span>
          </Link>
        )}
      </div>
    </div>
  );
}
