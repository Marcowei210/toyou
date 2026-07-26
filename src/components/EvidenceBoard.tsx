"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, Camera, Upload, Trash, Plus, Minus, Search } from "lucide-react";

interface EvidenceItem {
  id: string;
  url: string;
  note: string;
  createdAt: string;
}

export default function EvidenceBoard() {
  const { user, updateScore } = useAuth();
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Riddle game states
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleFeedback, setRiddleFeedback] = useState("");

  // Listen to the user's evidence subcollection in real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.accountId, "evidence"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: EvidenceItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          url: data.url,
          note: data.note,
          createdAt: data.createdAt,
        });
      });
      setEvidence(items);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  // Submit Detective Clue Riddle (riddle game mechanic)
  const handleSolveRiddle = async (e: React.FormEvent) => {
    e.preventDefault();
    const ans = riddleAnswer.trim().toLowerCase();
    
    if (ans === "footsteps" || ans === "footstep") {
      setRiddleFeedback("CORRECT! You gained +15 score.");
      await updateScore(15);
      setRiddleAnswer("");
    } else {
      setRiddleFeedback("INCORRECT. The mystery remains unsolved.");
    }

    setTimeout(() => setRiddleFeedback(""), 4000);
  };

  // Upload Case Evidence via /api/upload (@vercel/blob)
  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !note.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Upload failed");
      }

      await addDoc(collection(db, "users", user.accountId, "evidence"), {
        url: data.url,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });

      setNote("");
      setFile(null);
      const fileInput = document.getElementById("evidence-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      console.error("Evidence upload error:", error);
      alert(`Failed to pin evidence file: ${error.message || error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6 typewriter-fade">
      
      {/* LEFT COLUMN: Controls & Interactive Game Tests */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        
        {/* Detective Riddle (Score Rewards) */}
        <section className="bg-[#1b1a18] border border-[#38342e] p-4 rounded-sm flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-[#38342e] pb-1.5 flex items-center gap-1.5">
            <Search className="w-4 h-4" />
            Solve Case Riddles
          </h2>
          <div className="text-xs text-[#e6e0d4] font-mono leading-relaxed bg-[#262421] border border-[#38342e] p-3 rounded">
            <span className="text-[#8e8576]">CLUE:</span> The more you take, the more you leave behind. What are they?
          </div>
          <form onSubmit={handleSolveRiddle} className="flex flex-col gap-2 mt-1">
            <input
              type="text"
              value={riddleAnswer}
              onChange={(e) => setRiddleAnswer(e.target.value)}
              placeholder="Case solution..."
              className="w-full bg-[#262421] border border-[#38342e] rounded px-3 py-2 text-xs text-[#e6e0d4] placeholder-[#8e8576] focus:outline-none focus:border-amber-500 font-mono"
              required
            />
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-black py-2 rounded text-xs font-bold uppercase font-mono tracking-wider transition-all duration-300 cursor-pointer"
            >
              Submit Answer
            </button>
          </form>
          {riddleFeedback && (
            <p className={`text-xs font-mono text-center mt-1 animate-pulse ${
              riddleFeedback.includes("CORRECT") ? "text-emerald-400" : "text-red-400"
            }`}>
              {riddleFeedback}
            </p>
          )}
        </section>

        {/* Evidence Uploader */}
        <section className="bg-[#1b1a18] border border-[#38342e] p-4 rounded-sm flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-[#38342e] pb-1.5 flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            File New Evidence
          </h2>
          <form onSubmit={handleEvidenceUpload} className="flex flex-col gap-3">
            <div>
              <label htmlFor="evidence-file" className="block text-[10px] text-[#8e8576] font-mono uppercase mb-1">
                Select Photo
              </label>
              <input
                type="file"
                id="evidence-file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="w-full text-xs text-[#8e8576] font-mono file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-[#38342e] file:bg-[#262421] file:text-[#e6e0d4] file:text-xs file:cursor-pointer hover:file:border-amber-500"
                required
              />
            </div>
            <div>
              <label htmlFor="evidence-note" className="block text-[10px] text-[#8e8576] font-mono uppercase mb-1">
                Evidence Details / Log
              </label>
              <input
                type="text"
                id="evidence-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log note e.g., Footprint at crime scene"
                className="w-full bg-[#262421] border border-[#38342e] rounded px-3 py-2 text-xs text-[#e6e0d4] placeholder-[#8e8576] focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full border border-amber-600 bg-amber-950/20 hover:bg-amber-600 hover:text-black text-amber-500 py-2 rounded text-xs font-bold uppercase font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading file..." : "Pin Evidence File"}
            </button>
          </form>
        </section>

      </div>

      {/* RIGHT COLUMN: Real-Time Evidence Corkboard */}
      <div className="flex-1 bg-[#1b1a18] border border-[#38342e] p-6 rounded-sm min-h-[400px]">
        <div className="flex items-center justify-between border-b border-[#38342e] pb-3 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">
            Case Evidence Corkboard
          </h2>
          <span className="text-[10px] text-[#8e8576] font-mono bg-[#262421] px-2 py-0.5 border border-[#38342e] rounded">
            {evidence.length} File{evidence.length !== 1 && "s"} Archived
          </span>
        </div>

        {evidence.length === 0 ? (
          <div className="h-64 border border-dashed border-[#38342e] rounded flex flex-col items-center justify-center gap-2 text-[#8e8576]">
            <Camera className="w-8 h-8 opacity-40" />
            <p className="text-xs font-mono">No evidence photos pinned to this board yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evidence.map((item) => (
              <div 
                key={item.id} 
                className="bg-[#24221f] border border-[#38342e] p-3 rounded shadow-lg flex flex-col gap-2 relative group hover:border-[#8e8576] transition-all duration-300"
              >
                {/* Simulated Red push pin */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-600 shadow-md"></div>
                
                {/* Photo container */}
                <div className="w-full aspect-[4/3] bg-black rounded overflow-hidden mt-1 border border-[#38342e]">
                  <img 
                    src={item.url} 
                    alt="Pinned Evidence" 
                    className="w-full h-full object-cover grayscale contrast-125 brightness-90 hover:grayscale-0 transition-all duration-500"
                  />
                </div>

                {/* Evidence Note details */}
                <div className="text-[11px] font-mono text-[#d4cfc5] leading-relaxed mt-1 flex flex-col gap-1">
                  <p className="bg-[#1b1a18] p-2 border border-[#38342e] rounded italic">
                    "{item.note}"
                  </p>
                  <span className="text-[9px] text-[#8e8576] text-right mt-1">
                    Filed: {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
