"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Home as HomeIcon, Newspaper, User, Settings, Crown } from "lucide-react";
import AvatarModal from "@/components/AvatarModal";
import BroadcastBanner from "@/components/BroadcastBanner";
import Link from "next/link";

interface StatusBarProps {
  activeTab?: "home" | "news";
  onTabChange?: (tab: "home" | "news") => void;
}

export default function StatusBar({ activeTab = "home", onTabChange }: StatusBarProps) {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Outer Single Row Navbar Header: strictly flex-row flex-nowrap overflow-hidden */}
      <header className="w-full bg-[#E6D5B8] border-b-2 border-black text-[#1c1917] px-2 md:px-4 py-2 flex flex-row flex-nowrap items-center justify-between gap-1.5 md:gap-4 select-none font-bold shadow-sm overflow-hidden">
        {/* Left: "Home" and "News" Navigation Tabs */}
        <nav className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            onClick={() => onTabChange?.("home")}
            className={`px-2.5 md:px-4 py-1.5 border-2 border-black rounded text-xs md:text-sm font-black uppercase flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none shrink-0 ${
              activeTab === "home"
                ? "bg-amber-300 text-black font-black"
                : "bg-yellow-100 text-stone-800 hover:bg-white"
            }`}
          >
            <HomeIcon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onTabChange?.("news")}
            className={`px-2.5 md:px-4 py-1.5 border-2 border-black rounded text-xs md:text-sm font-black uppercase flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none shrink-0 ${
              activeTab === "news"
                ? "bg-amber-300 text-black font-black"
                : "bg-yellow-100 text-stone-800 hover:bg-white"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>News</span>
          </button>
        </nav>

        {/* Right side: Actions (GM HQ, Avatar, Logout) - strictly forced into same single row */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {user.role === "host" && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 border-2 border-black bg-amber-300 hover:bg-black hover:text-white text-black text-xs md:text-sm font-black tracking-wider uppercase transition-none rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0"
              title="Open GM God Mode Dashboard"
            >
              <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span className="hidden sm:inline">GM HQ</span>
              <span className="sm:hidden">GM</span>
            </Link>
          )}

          {/* Avatar Setup Trigger Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black bg-white overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative group shrink-0"
            title="Configure Detective Profile Avatar"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Detective Badge"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 md:w-5 md:h-5 text-stone-700 group-hover:text-black transition-colors" />
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-300 animate-spin" />
            </div>
          </button>

          {/* Log Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 md:px-3 py-1.5 border-2 border-black bg-red-200 hover:bg-black hover:text-white text-black text-xs md:text-sm font-black tracking-widest uppercase transition-none cursor-pointer rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 whitespace-nowrap"
            title="De-authorize session and log out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>LOG OUT</span>
          </button>
        </div>
      </header>

      {/* Broadcast Banner (Pill-shaped, rendered below navigation if broadcast exists) */}
      <BroadcastBanner />

      {/* Avatar Modal Popup */}
      <AvatarModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
