"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatusBar from "@/components/StatusBar";
import LoginScreen from "@/components/LoginScreen";
import DailyMission from "@/components/DailyMission";
import BulletinBoard from "@/components/BulletinBoard";
import EvidenceBoard from "@/components/EvidenceBoard";
import UserProfileCard from "@/components/UserProfileCard";
import AvatarModal from "@/components/AvatarModal";
import { Shield, ChevronDown, ChevronUp, FileSearch } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [showEvidenceBoard, setShowEvidenceBoard] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "news">("home");
  const [currentDay, setCurrentDay] = useState<string>("D-7");

  // Real-time listener for currentDay from /system/gameState
  useEffect(() => {
    const unsubSystem = onSnapshot(doc(db, "system", "gameState"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.currentDay) {
          setCurrentDay(data.currentDay);
        }
      }
    });
    return () => unsubSystem();
  }, []);

  // Pre-game check: If currentDay is D-10 to D-1 (starts with "D-"), hide EvidenceBoard entirely
  const isPreGame = currentDay ? currentDay.startsWith("D-") : true;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F1EA] text-[#1c1917] font-sans min-h-screen">
        <Shield className="w-10 h-10 text-amber-700 animate-spin mb-4" />
        <span className="text-sm font-bold uppercase tracking-widest text-stone-700 animate-pulse">
          Decrypting Agent Profiles...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Mandatory Avatar Onboarding Check:
  // If user has no valid avatarUrl, force AvatarModal setup and hide main dashboard
  const isAvatarMissing = !user.avatarUrl || user.avatarUrl.trim() === "";
  if (isAvatarMissing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F1EA] text-[#1c1917] font-sans min-h-screen">
        <AvatarModal isOpen={true} onClose={() => {}} isForced={true} />
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-[#F4F1EA] text-[#1c1917] font-bold select-none">
      {/* Top Status Bar Navigation with Home & News Tabs */}
      <StatusBar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Main Content Area */}
      <main className="flex-grow max-w-5xl w-full mx-auto py-4 sm:py-6 px-3 sm:px-4 flex flex-col gap-6">
        
        {/* --- PAGE VIEW SWITCHING: HOME vs NEWS --- */}
        {activeTab === "home" ? (
          <div className="flex flex-col gap-6 w-full">
            {/* Top: User Profile Card (Wireframe: Lv. badge + thermometer on left, Huge Avatar in center, Name/ID/pt on right) */}
            <UserProfileCard
              user={user}
              onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
            />

            {/* Bottom: Daily Mission Control Panel */}
            <DailyMission />
          </div>
        ) : (
          <div className="w-full">
            {/* News Page: Bulletin Board ("一般留言區" | "重要訊息區", "傳送!" button) */}
            <BulletinBoard />
          </div>
        )}

        {/* --- CASE EVIDENCE CORKBOARD SECTION (HIDDEN ENTIRELY DURING PRE-GAME D-7 to D-1) --- */}
        {!isPreGame && (
          <section className="bg-[#E6D5B8] border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden mt-4">
            <button
              onClick={() => setShowEvidenceBoard(!showEvidenceBoard)}
              className="w-full p-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-black hover:bg-amber-100 transition-none cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4" />
                <span>Case Evidence Corkboard & Riddle Solvers</span>
              </div>
              <div className="flex items-center gap-1 text-stone-800">
                <span className="text-[10px]">{showEvidenceBoard ? "Hide Board" : "Expand Board"}</span>
                {showEvidenceBoard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showEvidenceBoard && (
              <div className="p-4 border-t-2 border-black bg-yellow-50">
                <EvidenceBoard />
              </div>
            )}
          </section>
        )}
      </main>

      {/* Profile Avatar Modal */}
      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Retro footer */}
      <footer className="w-full text-center py-4 border-t-2 border-black bg-[#E6D5B8] text-xs md:text-sm font-black text-stone-900 select-none tracking-widest mt-auto">
        吐遊專屬 • 翻印我也不能怎樣
      </footer>
    </div>
  );
}
