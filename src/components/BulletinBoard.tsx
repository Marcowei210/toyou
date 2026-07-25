"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Pin,
  Send,
  Megaphone,
  User,
  Clock,
  Trash2,
  Bell,
  MessageSquare,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";

export interface BulletinPost {
  id: string;
  authorId: string;
  authorName?: string;
  avatarUrl?: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  day?: string;
  isHostNotice?: boolean;
  isImportant?: boolean;
}

const renderAvatarImgLarge = (avatarUrl?: string, authorName?: string) => {
  if (!avatarUrl || avatarUrl.trim() === "") {
    return (
      <div className="w-14 h-14 rounded-full bg-[#262421] border-2 border-amber-500/60 flex items-center justify-center text-amber-500 font-bold text-sm uppercase shrink-0 shadow">
        {authorName ? authorName.charAt(0) : "A"}
      </div>
    );
  }

  const isSvg = avatarUrl.startsWith("<svg") || avatarUrl.includes("%3Csvg");
  const srcUrl = avatarUrl.startsWith("<svg") ? `data:image/svg+xml;utf8,${encodeURIComponent(avatarUrl)}` : avatarUrl;

  return (
    <img
      src={srcUrl}
      alt="Agent Avatar"
      className={`w-14 h-14 rounded-full border-2 border-amber-500/60 object-cover shrink-0 shadow ${
        isSvg ? "bg-[#1b1a18] p-1 object-contain" : ""
      }`}
    />
  );
};

export default function BulletinBoard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [hostNoticeText, setHostNoticeText] = useState("");
  const [isImportantNotice, setIsImportantNotice] = useState(false);
  const [posting, setPosting] = useState(false);

  // Tab & System State
  const [activeBoardTab, setActiveBoardTab] = useState<"general" | "important">("general");
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

  // Real-time listener for /bulletin collection
  useEffect(() => {
    const q = query(collection(db, "bulletin"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: BulletinPost[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as BulletinPost);
        });
        setPosts(items);
      },
      (err) => console.warn("Bulletin listener warning:", err)
    );

    return () => unsubscribe();
  }, []);

  // Only unlock "Important Announcements" tab if currentDay is D-4, D-3, D-2, D-1
  const isImportantTabUnlocked = ["D-4", "D-3", "D-2", "D-1"].includes(currentDay);

  // Allow posting for ALL users if currentDay is D-4, D-3, D-2, D-1 OR if user is host
  const canPostMessage = user?.role === "host" || ["D-4", "D-3", "D-2", "D-1"].includes(currentDay);

  // Filter posts:
  // - "General Board": Displays ALL messages (including important ones)
  // - "Important Announcements": ONLY displays posts where isImportant === true
  const displayedPosts = posts.filter((p) => {
    if (activeBoardTab === "important") {
      return p.isImportant === true;
    }
    return true;
  });

  // Post message handler for all eligible users
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNoticeText.trim() || !user || !canPostMessage) return;

    setPosting(true);
    try {
      const isHost = user.role === "host";
      const authorName = isHost && isImportantNotice ? `${user.nickname} (Agency HQ Host)` : user.nickname;

      await addDoc(collection(db, "bulletin"), {
        authorId: user.accountId,
        authorName: authorName,
        avatarUrl: user.avatarUrl || "",
        text: hostNoticeText.trim(),
        createdAt: new Date().toISOString(),
        day: currentDay,
        isHostNotice: isHost,
        isImportant: isHost ? isImportantNotice : false,
      });
      setHostNoticeText("");
      setIsImportantNotice(false);
    } catch (err) {
      console.error("Failed to post bulletin notice:", err);
      alert("Failed to post message.");
    } finally {
      setPosting(false);
    }
  };

  // Host moderation delete
  const handleDeletePost = async (postId: string) => {
    if (!user || user.role !== "host") return;
    try {
      await deleteDoc(doc(db, "bulletin", postId));
    } catch (err) {
      console.error("Failed to delete bulletin post:", err);
      alert("Failed to delete post.");
    }
  };

  return (
    <div className="w-full h-full max-w-full box-border bg-[#E6D5B8] border-2 border-black p-3.5 sm:p-5 md:p-6 rounded flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold select-none -rotate-1 hover:rotate-0 transition-transform overflow-hidden">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-3 border-b-2 border-black pb-3 w-full max-w-full box-border">
        <div className="flex items-center justify-between gap-2 w-full max-w-full box-border">
          <div className="flex items-center gap-2 text-black font-extrabold uppercase tracking-wider text-base sm:text-lg truncate">
            <Pin className="w-4 h-4 text-black rotate-45 shrink-0" />
            <span className="truncate">Agency Bulletin Board</span>
          </div>
          <span className="text-xs sm:text-sm text-black bg-yellow-100 px-2.5 py-0.5 border-2 border-black rounded uppercase font-extrabold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 whitespace-nowrap">
            {displayedPosts.length} Post{displayedPosts.length !== 1 && "s"} Listed
          </span>
        </div>

        {/* Tab System: 一般留言區 vs 重要訊息區 */}
        <div className="flex gap-2 w-full max-w-full box-border">
          <button
            onClick={() => setActiveBoardTab("general")}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm uppercase font-extrabold tracking-wider rounded border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none ${
              activeBoardTab === "general"
                ? "bg-amber-300 text-black"
                : "bg-yellow-100 text-stone-800 hover:bg-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" /> 一般留言區
          </button>

          {/* Only render "重要訊息區" tab if currentDay is D-4 or closer to D-1 */}
          {isImportantTabUnlocked && (
            <button
              onClick={() => setActiveBoardTab("important")}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm uppercase font-extrabold tracking-wider rounded border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none ${
                activeBoardTab === "important"
                  ? "bg-red-300 text-black font-extrabold"
                  : "bg-red-100 text-red-900 hover:bg-red-200"
              }`}
            >
              <Bell className="w-4 h-4 text-black shrink-0" /> 重要訊息區
            </button>
          )}
        </div>
      </div>

      {/* Message Posting Input (Rendered if user is host OR if currentDay is D-4 to D-1) */}
      {canPostMessage && (
        <form onSubmit={handlePostNotice} className="w-full max-w-full box-border bg-yellow-100 border-2 border-black p-3.5 rounded flex flex-col gap-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="flex items-center justify-between text-xs sm:text-sm text-black font-extrabold uppercase tracking-wider w-full max-w-full box-border">
            <div className="flex items-center gap-1.5 truncate">
              <Megaphone className="w-4 h-4 text-black shrink-0" />
              <span className="truncate">{user?.role === "host" ? "發佈重要公告" : "發佈留言區訊息"}</span>
            </div>

            {/* GM Host Checkbox: "Mark as Important" */}
            {user?.role === "host" && (
              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-red-700 font-extrabold cursor-pointer hover:text-red-900 shrink-0">
                <input
                  type="checkbox"
                  checked={isImportantNotice}
                  onChange={(e) => setIsImportantNotice(e.target.checked)}
                  className="accent-red-600 cursor-pointer w-4 h-4"
                />
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Mark as Important</span>
              </label>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full min-w-0 box-border items-stretch">
            <input
              type="text"
              value={hostNoticeText}
              onChange={(e) => setHostNoticeText(e.target.value)}
              placeholder={
                isImportantNotice
                  ? "發佈重要公告內容..."
                  : "輸入想說的話..."
              }
              className="w-full sm:flex-1 min-w-0 max-w-full box-border bg-white border-2 border-black rounded px-3.5 py-2.5 text-base md:text-lg text-black placeholder:text-stone-500 font-bold focus:outline-none focus:bg-yellow-50"
              required
            />
            <button
              type="submit"
              disabled={posting}
              className={`w-full sm:w-auto shrink-0 whitespace-nowrap box-border px-6 py-2.5 font-extrabold uppercase text-lg rounded border-2 border-black transition-none flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                isImportantNotice
                  ? "bg-red-400 text-black hover:bg-black hover:text-white"
                  : "bg-amber-300 text-black hover:bg-black hover:text-white"
              }`}
            >
              <Send className="w-5 h-5 shrink-0" />
              <span>{posting ? "傳送中..." : "傳送!"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modern Chat-App Style Bulletin Feed */}
      <div className="flex-1 overflow-y-auto max-h-[520px] flex flex-col gap-3 pr-1">
        {displayedPosts.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-black rounded flex flex-col items-center justify-center gap-2 text-stone-700 p-4 text-center bg-yellow-50">
            <Pin className="w-6 h-6 opacity-60" />
            <p className="text-xs font-bold">
              {activeBoardTab === "important"
                ? "No important announcements currently published by GM Host."
                : "No general posts currently pinned to this section."}
            </p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <div
              key={post.id}
              className={`p-3 rounded border-2 border-black flex items-end gap-3 relative transition-transform ${
                post.isImportant
                  ? "bg-red-100 border-red-700 shadow-[3px_3px_0px_0px_rgba(185,28,28,1)]"
                  : post.isHostNotice
                  ? "bg-amber-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-yellow-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -rotate-1 hover:rotate-0"
              }`}
            >
              {/* Left Side: Large Circular Avatar */}
              {renderAvatarImgLarge(post.avatarUrl, post.authorName)}

              {/* Right Side: Header + Chat Bubble */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Meta Header Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    {post.isImportant ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    ) : post.isHostNotice ? (
                      <Megaphone className="w-3.5 h-3.5 text-black shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                    )}
                    <span className={
                      post.isImportant
                        ? "text-red-700 font-extrabold uppercase truncate"
                        : post.authorName?.includes("Anonymous")
                        ? "text-purple-700 italic font-extrabold truncate"
                        : post.isHostNotice
                        ? "text-black font-extrabold truncate"
                        : "text-stone-900 font-extrabold truncate"
                    }>
                      {post.authorName || post.authorId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {post.day && (
                      <span className="bg-[#E6D5B8] border-2 border-black px-1.5 py-0.5 text-[10px] text-black font-extrabold rounded uppercase">
                        {post.day}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-700 flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3" />
                      {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* GM Host Delete Moderation Control Button */}
                    {user?.role === "host" && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 border-2 border-black bg-red-200 hover:bg-black hover:text-white text-black rounded transition-none cursor-pointer"
                        title="GM Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Message Bubble Directly Below Header */}
                <p className="text-xs text-black leading-relaxed bg-white p-2.5 rounded border-2 border-black font-bold break-words shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  "{post.text}"
                </p>

                {/* Attached Image Rendering */}
                {post.imageUrl && (
                  <div className="w-full h-48 bg-white rounded overflow-hidden border-2 border-black mt-1 relative group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img
                      src={post.imageUrl}
                      alt="Bulletin Attachment"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
