"use client";

import React, { useEffect, useState } from "react";
import { Play, Sparkles, X, FastForward, Volume2, ShieldAlert, CheckCircle2 } from "lucide-react";

export interface ScriptLine {
  character: string;
  text: string;
  bgImage?: string;
  badge?: string;
}

// Easily editable script array for the D-1 Visual Novel Mission Briefing
export const STORY_SCRIPT: ScriptLine[] = [
  {
    character: "Director Vance (Agency HQ)",
    text: "Agent... welcome to the subterranean briefing chamber. Your clearance is verified.",
    bgImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    badge: "CLASSIFIED DIRECTIVE",
  },
  {
    character: "Director Vance (Agency HQ)",
    text: "Over the past 10 days, your intelligence submissions and encrypted logs have been reviewed.",
    bgImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    badge: "STAGE D-1 BRIEFING",
  },
  {
    character: "You (Detective)",
    text: "Is the operative location confirmed, Director?",
    bgImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
    badge: "FIELD OPERATIVE",
  },
  {
    character: "Director Vance (Agency HQ)",
    text: "Confirmed. The secret worries bottle has drifted to its final destination. Stand by for video transmission.",
    bgImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    badge: "TRANSMISSION READY",
  },
];

interface RPGDialogBoxProps {
  onClose: () => void;
  onFinishedBriefing?: () => void;
}

export default function RPGDialogBox({ onClose, onFinishedBriefing }: RPGDialogBoxProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const currentLine = STORY_SCRIPT[currentLineIndex];

  // Typewriter effect
  useEffect(() => {
    if (!currentLine) return;

    let charIndex = 0;
    setIsTyping(true);
    setDisplayedText("");

    const interval = setInterval(() => {
      if (charIndex < currentLine.text.length) {
        setDisplayedText(currentLine.text.substring(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [currentLineIndex]);

  // Click handler to advance typewriter or next line
  const handleScreenClick = () => {
    if (showVideoModal) return;

    if (isTyping) {
      // Instantly reveal full line text if user clicks while typing
      setDisplayedText(currentLine.text);
      setIsTyping(false);
    } else {
      // Advance to next script line
      if (currentLineIndex < STORY_SCRIPT.length - 1) {
        setCurrentLineIndex((prev) => prev + 1);
      } else {
        // Script finished! Show Video Player modal
        setShowVideoModal(true);
        if (onFinishedBriefing) onFinishedBriefing();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm select-none font-mono typewriter-fade">
      {/* Outer Canvas Container: relative, w-full, overflow-hidden, safe height, bg-cover bg-center */}
      <div
        onClick={handleScreenClick}
        className="relative w-full max-w-4xl h-[65vh] max-h-[650px] min-h-[420px] rounded-sm border-2 border-amber-600/80 shadow-2xl overflow-hidden bg-cover bg-center cursor-pointer group transition-all duration-700"
        style={{
          backgroundImage: `url(${
            currentLine?.bgImage ||
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop"
          })`,
        }}
      >
        {/* Subtle Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/70 pointer-events-none"></div>

        {/* Top Header HUD Bar inside outer container */}
        <div className="absolute top-0 left-0 right-0 p-3.5 flex items-center justify-between z-10 border-b border-[#38342e] bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase text-xs tracking-widest">
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="truncate">RPG Visual Novel // Case File D-1 Climax</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] text-[#8e8576] bg-[#262421] px-2 py-0.5 border border-[#38342e] rounded uppercase font-bold">
              Line {currentLineIndex + 1} of {STORY_SCRIPT.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 border border-[#38342e] hover:border-red-500 bg-[#262421] text-[#8e8576] hover:text-red-400 rounded transition-colors cursor-pointer"
              title="Exit Mission Briefing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dialogue Bubble: Pinned strictly using absolute, bottom-0, left-0, w-full */}
        {!showVideoModal && (
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-20 pointer-events-none">
            <div className="bg-black/85 border-2 border-amber-600/80 p-4 md:p-5 rounded-sm shadow-2xl backdrop-blur-md flex flex-col gap-2.5 relative transition-all duration-300 group-hover:border-amber-500 max-h-[35%] pointer-events-auto">
              {/* Character Badge Header */}
              <div className="flex items-center justify-between border-b border-[#38342e] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-amber-400">
                    {currentLine?.character}
                  </span>
                  {currentLine?.badge && (
                    <span className="text-[9px] bg-amber-950/60 border border-amber-600/60 text-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                      {currentLine.badge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-amber-500/80 flex items-center gap-1 font-mono animate-pulse">
                  <FastForward className="w-3 h-3" /> Click to advance &rarr;
                </span>
              </div>

              {/* Dialogue Typewriter Text */}
              <p className="text-xs md:text-sm text-[#e6e0d4] leading-relaxed font-mono min-h-[44px] max-h-[85px] overflow-y-auto">
                {displayedText}
                {isTyping && <span className="inline-block w-2 h-4 bg-amber-500 ml-1 animate-ping"></span>}
              </p>
            </div>
          </div>
        )}

        {/* Placeholder Video Player Modal (Triggered when script ends) */}
        {showVideoModal && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md typewriter-fade cursor-default">
            <div className="bg-[#1b1a18] border-2 border-amber-500 p-6 rounded max-w-3xl w-full flex flex-col gap-4 shadow-2xl relative">
              {/* Top Modal Header */}
              <div className="flex items-center justify-between border-b border-[#38342e] pb-3">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest">
                  <Volume2 className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Classified Video Transmission // Phase 1 Finale</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-[#8e8576] hover:text-amber-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player Display Screen */}
              <div className="w-full h-64 md:h-80 bg-black rounded border border-[#38342e] relative flex flex-col items-center justify-center overflow-hidden group">
                {isPlayingVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0a0a09] text-amber-400 p-6 text-center animate-pulse">
                    <ShieldAlert className="w-12 h-12 text-amber-500" />
                    <p className="text-sm font-bold uppercase tracking-wider">
                      [TRANSMISSION LIVE]: "Phase 2 Unlocks Shortly. Stand by Detective."
                    </p>
                    <p className="text-xs text-[#8e8576]">
                      Decrypting satellite feed for live team assignment...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center p-6">
                    <button
                      onClick={() => setIsPlayingVideo(true)}
                      className="w-16 h-16 bg-amber-600 hover:bg-amber-500 text-black rounded-full flex items-center justify-center transition-all duration-300 scale-100 hover:scale-110 shadow-2xl cursor-pointer"
                    >
                      <Play className="w-8 h-8 fill-black ml-1" />
                    </button>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#e6e0d4] font-bold uppercase tracking-widest">
                        Play Briefing Video File: MISSION_CLIMAX_D1.MP4
                      </span>
                      <span className="text-[10px] text-[#8e8576]">
                        Click to initiate video stream playback
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer button */}
              <div className="flex justify-between items-center border-t border-[#38342e] pt-3">
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Briefing Authorization Complete
                </span>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase text-xs rounded transition-colors cursor-pointer"
                >
                  Close Briefing Screen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
