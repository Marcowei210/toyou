"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, X } from "lucide-react";

interface SystemGameState {
  phase?: string;
  event?: string;
  broadcast?: string;
  broadcastTime?: string;
}

export default function BroadcastBanner() {
  const [gameState, setGameState] = useState<SystemGameState | null>(null);
  const [dismissedBroadcast, setDismissedBroadcast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "gameState"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SystemGameState;
        setGameState(data);
      }
    });

    return () => unsub();
  }, []);

  if (!gameState) return null;

  const rawBroadcast = gameState.broadcast || "";
  const hasActiveBroadcast =
    rawBroadcast.trim().length > 0 &&
    dismissedBroadcast !== rawBroadcast;

  // Only render if a broadcast exists
  if (!hasActiveBroadcast) return null;

  // Clean out any hardcoded [BROADCAST]: prefix string
  const cleanBroadcastText = rawBroadcast.replace(/^\[BROADCAST\]:\s*/i, "");

  return (
    <div className="w-full flex justify-center px-3 sm:px-4 pt-3 pb-1 font-bold select-none">
      <div className="w-full max-w-3xl bg-amber-200 border-2 border-black rounded-2xl px-3.5 sm:px-5 py-2.5 flex items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] h-auto min-h-[44px]">
        <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm md:text-base flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 animate-bounce mt-0.5 sm:mt-0" />
          <span className="text-stone-900 font-extrabold whitespace-normal break-words leading-snug flex-1">
            {cleanBroadcastText}
          </span>
        </div>
        <button
          onClick={() => setDismissedBroadcast(rawBroadcast)}
          className="text-black hover:text-red-600 p-1 transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
          title="Dismiss broadcast"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-black font-extrabold" />
        </button>
      </div>
    </div>
  );
}
