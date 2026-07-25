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

  const hasActiveBroadcast =
    gameState.broadcast &&
    gameState.broadcast.trim().length > 0 &&
    dismissedBroadcast !== gameState.broadcast;

  // Only render if a broadcast exists
  if (!hasActiveBroadcast) return null;

  return (
    <div className="w-full flex justify-center px-4 pt-3 pb-1 font-bold select-none">
      <div className="w-full max-w-3xl bg-amber-200 border-2 border-black rounded-full px-5 py-2 flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 text-xs md:text-sm flex-1 truncate">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
          <span className="font-extrabold text-black uppercase text-xs shrink-0">
            [BROADCAST]:
          </span>
          <span className="text-stone-900 font-extrabold truncate">
            {gameState.broadcast}
          </span>
        </div>
        <button
          onClick={() => setDismissedBroadcast(gameState.broadcast || null)}
          className="text-black hover:text-red-600 p-1 transition-colors cursor-pointer shrink-0"
          title="Dismiss broadcast"
        >
          <X className="w-4 h-4 text-black font-extrabold" />
        </button>
      </div>
    </div>
  );
}
