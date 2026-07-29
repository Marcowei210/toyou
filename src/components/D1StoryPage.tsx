"use client";

import React, { useState, useEffect, useRef } from "react";
import d1ScriptData from "@/data/d1-script.json";
import { X, RotateCcw, FastForward } from "lucide-react";

export interface D1ScriptStep {
  id: number;
  speaker: string;
  text: string;
  background: string;
  backgroundAnimation?: string;
  leftSprite?: string;
  leftSpriteAnimation?: string;
  rightSprite?: string;
  rightSpriteAnimation?: string;
  cgImage?: string;
  cgObjectContain?: boolean;
  cgAlignBottom?: boolean;
  hideDialogueBox?: boolean;
  isBlackScreen?: boolean;
  overlays?: string[];
  bgm?: string;
  stopBgm?: boolean;
  sfx?: string;
}

interface D1StoryPageProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function D1StoryPage({ onClose, onComplete }: D1StoryPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);
  const [hasTriggeredFullscreen, setHasTriggeredFullscreen] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  const steps = d1ScriptData as D1ScriptStep[];
  const currentStep = steps[currentStepIndex] || steps[0];

  // 1. Orientation check: Detect if screen is in portrait orientation
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches || window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // 2. Typewriter Effect
  useEffect(() => {
    if (!currentStep) return;

    let charIndex = 0;
    setIsTyping(true);
    setDisplayedText("");

    if (!currentStep.text || currentStep.hideDialogueBox || currentStep.isBlackScreen) {
      setIsTyping(false);
      return;
    }

    const interval = setInterval(() => {
      if (charIndex < currentStep.text.length) {
        setDisplayedText(currentStep.text.substring(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [currentStepIndex]);

  // 3. Audio (BGM & SFX) Management Effect
  useEffect(() => {
    if (!currentStep) return;

    // Handle BGM Stop flag or step without BGM
    if (currentStep.stopBgm || !currentStep.bgm) {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
        bgmRef.current = null;
      }
    }

    // Handle BGM Play flag
    if (currentStep.bgm) {
      const targetSrc = window.location.origin + currentStep.bgm;
      // Play new BGM if not currently playing this exact file
      if (!bgmRef.current || bgmRef.current.src !== targetSrc) {
        if (bgmRef.current) {
          bgmRef.current.pause();
          bgmRef.current.currentTime = 0;
        }
        const bgmAudio = new Audio(currentStep.bgm);
        bgmAudio.loop = false; // MUST NOT loop, play exactly once
        bgmRef.current = bgmAudio;
        bgmAudio.play().catch(() => {});
      }
    }

    // Handle SFX Play flag
    if (currentStep.sfx) {
      if (sfxRef.current) {
        sfxRef.current.pause();
        sfxRef.current.currentTime = 0;
      }
      const sfxAudio = new Audio(currentStep.sfx);
      sfxAudio.loop = false;
      sfxRef.current = sfxAudio;
      sfxAudio.play().catch(() => {});
    }
  }, [currentStepIndex]);

  // Global Audio Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
        bgmRef.current = null;
      }
      if (sfxRef.current) {
        sfxRef.current.pause();
        sfxRef.current.currentTime = 0;
        sfxRef.current = null;
      }
    };
  }, []);

  // Keyboard navigation listener (Space or Enter to advance)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, isTyping, isPortrait]);

  const handleAdvance = () => {
    if (isPortrait) return;

    // Trigger browser native fullscreen on first user gesture click if supported
    if (!hasTriggeredFullscreen) {
      setHasTriggeredFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          (document.documentElement as any).webkitRequestFullscreen();
        }
      } catch {
        // Ignore if blocked by browser or iOS Safari
      }
    }

    if (isTyping && currentStep.text && !currentStep.hideDialogueBox && !currentStep.isBlackScreen) {
      // Instantly reveal full text on click if typing
      setDisplayedText(currentStep.text);
      setIsTyping(false);
    } else {
      // Advance to next step
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // VN Finished - Cleanup audio before exit
        if (bgmRef.current) {
          bgmRef.current.pause();
          bgmRef.current.currentTime = 0;
        }
        if (sfxRef.current) {
          sfxRef.current.pause();
          sfxRef.current.currentTime = 0;
        }
        if (onComplete) onComplete();
        onClose();
      }
    }
  };

  const shouldShowDialogueBox =
    !currentStep.hideDialogueBox &&
    !currentStep.isBlackScreen &&
    Boolean(currentStep.text && currentStep.text.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[9999] w-[100dvw] h-[100dvh] max-w-none max-h-none bg-black overflow-hidden select-none font-sans flex flex-col">
      {/* --- PORTRAIT ORIENTATION LOCK OVERLAY --- */}
      {isPortrait && (
        <div className="fixed inset-0 z-[10000] w-[100dvw] h-[100dvh] bg-black/95 text-amber-400 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
          <div className="w-20 h-20 mb-6 border-4 border-amber-400 rounded-2xl flex items-center justify-center animate-[rotatePhone_2.5s_infinite_ease-in-out]">
            <RotateCcw className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider mb-2 text-white">
            請將手機旋轉至橫螢幕
          </h2>
          <p className="text-sm sm:text-base font-bold text-amber-300 max-w-md leading-relaxed">
            為了提供最佳的 Visual Novel 視覺體驗，本章節劇情僅支援橫向螢幕播放。
          </p>
          <span className="mt-4 text-xs text-stone-400 font-mono">
            Please rotate your device to landscape for the best experience.
          </span>
        </div>
      )}

      {/* --- MAIN VISUAL NOVEL CANVAS (LANDSCAPE MODE) --- */}
      <div
        key={`canvas-step-${currentStep.id}`}
        onClick={handleAdvance}
        className="relative w-[100dvw] h-[100dvh] w-full h-full bg-black overflow-hidden cursor-pointer flex flex-col justify-between"
      >
        {/* CSS Custom Keyframe Animations */}
        <style jsx global>{`
          @keyframes jumpAnim {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-28px); }
          }
          .animate-jump {
            animation: jumpAnim 0.5s ease-in-out infinite;
          }
          @keyframes hopLeftSlightly {
            0% { transform: translateX(0); }
            50% { transform: translateX(-3px) translateY(-6px); }
            100% { transform: translateX(-3px); }
          }
          .animate-hop-left {
            animation: hopLeftSlightly 0.4s ease-out forwards;
          }
          @keyframes shakeAnim {
            0%, 100% { transform: translate(0, 0); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-8px, 4px); }
            20%, 40%, 60%, 80% { transform: translate(8px, -4px); }
          }
          .animate-shake {
            animation: shakeAnim 0.5s ease-in-out 3;
          }
          @keyframes shrinkMoveTopLeft {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-4vw, -22vh) scale(0.35);
              opacity: 0.9;
            }
          }
          .animate-shrink-top-left {
            animation: shrinkMoveTopLeft 3.5s ease-in-out forwards;
          }
          @keyframes rotatePhone {
            0%, 10% { transform: rotate(0deg); }
            40%, 60% { transform: rotate(-90deg); }
            90%, 100% { transform: rotate(0deg); }
          }
        `}</style>

        {/* 1. STRICT BLACK SCREEN TRANSITION STATE */}
        {currentStep.isBlackScreen && (
          <div
            key="strict-black-screen"
            className="absolute inset-0 bg-black z-50 flex items-center justify-center pointer-events-none"
          />
        )}

        {/* 2. Background Image Layer */}
        {currentStep.background && currentStep.background.trim() !== "" && !currentStep.isBlackScreen && !currentStep.cgImage && (
          <img
            key={`bg-${currentStep.background}`}
            src={currentStep.background}
            alt="Scene Background"
            className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none ${
              currentStep.backgroundAnimation === "shake" ? "animate-shake" : ""
            }`}
          />
        )}

        {/* 3. Fullscreen / Bottom-Aligned CG Layer */}
        {currentStep.cgImage && currentStep.cgImage.trim() !== "" && !currentStep.isBlackScreen && (
          <div
            key={`cg-wrapper-${currentStep.cgImage}`}
            className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
              currentStep.background === "/pure_white.png" || currentStep.cgObjectContain
                ? "bg-white"
                : "bg-black"
            }`}
          >
            <img
              key={`cg-img-${currentStep.cgImage}`}
              src={currentStep.cgImage}
              alt="Scene CG"
              className={`w-full ${
                currentStep.cgAlignBottom
                  ? "absolute bottom-0 inset-x-0 max-h-[92vh] object-contain object-bottom"
                  : currentStep.cgObjectContain
                  ? "h-full object-contain bg-white"
                  : "h-full object-contain sm:object-cover"
              }`}
            />
          </div>
        )}

        {/* 4. Resized Responsive Overlays Layer */}
        {currentStep.overlays && currentStep.overlays.length > 0 && !currentStep.isBlackScreen && (
          <div key={`overlays-${currentStep.id}`} className="absolute inset-0 z-20 pointer-events-none">
            {currentStep.overlays.map((ov, idx) => {
              const isTools = ov.includes("tools");
              return (
                <img
                  key={`ov-${ov}`}
                  src={ov}
                  alt="Overlay Asset"
                  className={`absolute w-[35vw] max-w-[200px] h-auto object-contain animate-fadeIn ${
                    isTools ? "top-4 right-4 sm:top-6 sm:right-6" : "top-4 left-4 sm:top-6 sm:left-6"
                  }`}
                />
              );
            })}
          </div>
        )}

        {/* 5. Independently Positioned Character Sprites */}
        {!currentStep.cgImage && !currentStep.isBlackScreen && (
          <>
            {/* Left Sprite (Tiger) - 3.5s Smooth Easing Exit Animation */}
            {currentStep.leftSprite && (
              <div
                key={`left-sprite-${currentStep.leftSprite}`}
                className={`absolute bottom-12 md:bottom-16 left-4 md:left-16 z-20 pointer-events-none max-w-[50%] max-h-[80vh] ${
                  currentStep.leftSpriteAnimation === "shrink-top-left"
                    ? "animate-shrink-top-left"
                    : ""
                }`}
              >
                <img
                  key={`left-img-${currentStep.leftSprite}`}
                  src={currentStep.leftSprite}
                  alt="Left Character"
                  className="max-h-[72vh] object-contain shadow-none filter-none"
                />
              </div>
            )}

            {/* Right Sprite (Horse) - Rigidly Anchored to Right Side */}
            {currentStep.rightSprite && (
              <div
                key={`right-sprite-${currentStep.rightSprite}`}
                className={`absolute bottom-12 md:bottom-16 right-4 md:right-16 z-20 pointer-events-none max-w-[50%] max-h-[80vh] transition-all duration-500 ${
                  currentStep.rightSpriteAnimation === "jump"
                    ? "animate-jump"
                    : currentStep.rightSpriteAnimation === "hop-left"
                    ? "animate-hop-left"
                    : ""
                }`}
              >
                <img
                  key={`right-img-${currentStep.rightSprite}`}
                  src={currentStep.rightSprite}
                  alt="Right Character"
                  className="max-h-[72vh] object-contain shadow-none filter-none"
                />
              </div>
            )}
          </>
        )}

        {/* 6. Clean Top-Right Floating Close Button */}
        <div className="absolute top-3 right-3 z-40 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.currentTime = 0;
              }
              if (sfxRef.current) {
                sfxRef.current.pause();
                sfxRef.current.currentTime = 0;
              }
              onClose();
            }}
            className="p-1.5 border-2 border-black bg-amber-300 hover:bg-black hover:text-white text-black rounded transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            title="Exit Story"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 7. STRICT Pinned Bottom Single-Layer Dialogue Box */}
        {shouldShowDialogueBox && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg md:max-w-xl pointer-events-auto">
            <div
              className={`bg-black/90 border-2 border-amber-400 p-3 sm:p-3.5 rounded-xl backdrop-blur-md flex flex-col gap-1 relative shadow-none ${
                currentStep.speaker === "虎"
                  ? "text-left"
                  : currentStep.speaker === "馬"
                  ? "text-right"
                  : "text-center"
              }`}
            >
              {/* Speaker Label Alignment: ONLY for "虎" or "馬" */}
              {currentStep.speaker &&
                (currentStep.speaker === "虎" || currentStep.speaker === "馬") && (
                  <div
                    className={`flex mb-0.5 ${
                      currentStep.speaker === "馬" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs font-black uppercase text-amber-300 bg-amber-950/90 px-2.5 py-0.5 border border-amber-500/80 rounded">
                      {currentStep.speaker}
                    </span>
                  </div>
                )}

              {/* Raw Spoken Dialogue Text */}
              <div
                className={`flex items-end gap-2 ${
                  currentStep.speaker === "虎"
                    ? "justify-between text-left"
                    : currentStep.speaker === "馬"
                    ? "justify-between text-right"
                    : "justify-center text-center"
                }`}
              >
                <p className="text-sm sm:text-base text-stone-100 font-extrabold leading-relaxed flex-1">
                  {displayedText}
                  {isTyping && <span className="inline-block w-2 h-3.5 bg-amber-400 ml-1 animate-ping" />}
                </p>
                <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5 font-bold animate-pulse shrink-0 self-end">
                  <FastForward className="w-3 h-3" /> Click
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
