"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import RPGDialogBox from "@/components/RPGDialogBox";
import {
  Calendar,
  Send,
  Camera,
  CheckCircle2,
  Music,
  User,
  HelpCircle,
  MessageCircle,
  Tv,
  Compass,
  Check,
  Lock,
  Sparkles,
  Inbox,
  Plus,
  Trash2,
} from "lucide-react";

export interface WorryDoc {
  id: string;
  authorId: string;
  worryText: string;
  replyText: string;
  assignedTo: string;
  createdAt: string;
}

// Stage display name dictionary
const STAGE_LABELS: Record<string, string> = {
  "D-7": "D-7: QA & 登入",
  "D-6": "D-6: 音樂推推",
  "D-5": "D-5: picture",
  "D-4": "D-4: bulletin",
  "D-3": "D-3: bottle+routing",
  "D-2": "D-2: 回覆bottle+下次許願",
  "D-1": "D-1: 收到回覆+播放劇情",
};

// Helper to clean message text (removes [Task D-X ...]: prefixes and wrapping quotes)
const cleanPostText = (rawText?: string) => {
  if (!rawText) return "";
  let cleaned = rawText.replace(/^\[[^\]]+\]:\s*/i, "");
  cleaned = cleaned.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, "");
  return cleaned;
};

export default function DailyMission() {
  const { user, completeTaskAndReward } = useAuth();
  const [currentDay, setCurrentDay] = useState<string>("D-7");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- D-7 TRIVIA STEP-BY-STEP STATE ---
  const [d7QuestionIndex, setD7QuestionIndex] = useState(0);
  const [d7SelectedAnswer, setD7SelectedAnswer] = useState("");
  const [d7FeedbackCard, setD7FeedbackCard] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [d7TotalPoints, setD7TotalPoints] = useState(0);
  const [d7VisibleLinesCount, setD7VisibleLinesCount] = useState(1);

  // Staggered / Typewriter line reveal effect for D-7 quiz feedback
  useEffect(() => {
    if (!d7FeedbackCard) {
      setD7VisibleLinesCount(1);
      return;
    }

    const lines = d7FeedbackCard.text.split("\n");
    if (lines.length <= 1) {
      setD7VisibleLinesCount(lines.length);
      return;
    }

    setD7VisibleLinesCount(1);
    const interval = setInterval(() => {
      setD7VisibleLinesCount((prev) => {
        if (prev >= lines.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 650);

    return () => clearInterval(interval);
  }, [d7FeedbackCard]);

  const d7Questions = [
    {
      id: 1,
      question: "Q1: 請回答上次吐遊的地點是？",
      options: [
        { id: "A", text: "新竹" },
        { id: "B", text: "嘉義" },
        { id: "C", text: "台南" },
        { id: "D", text: "金門" },
      ],
      correctAnswer: "D",
      correctFeedback: "你很棒，代替上次的吐主給你一個大拇指",
      incorrectFeedback: "是忘記了還是害怕想起來",
    },
    {
      id: 2,
      question: "Q2: 請回答這次吐遊的日期？",
      options: [
        { id: "A", text: "7/25" },
        { id: "B", text: "8/1" },
        { id: "C", text: "8/8" },
        { id: "D", text: "8/15" },
      ],
      correctAnswer: "B",
      correctFeedback: "恭喜你，我代替這屆的吐主給你兩個大拇指",
      incorrectFeedback: "......\n請離開\n開玩笑的，你現在知道了，是8/1！",
    },
    {
      id: 3,
      question: "Q3: 馬可最常畫的動物是？",
      options: [
        { id: "A", text: "呼" },
        { id: "B", text: "狐" },
        { id: "C", text: "虎" },
        { id: "D", text: "虤" },
      ],
      getFeedback: (ans: string) => {
        if (ans === "C") return { isCorrect: true, text: "我們是朋友了，你好，麻吉" };
        if (ans === "D") return { isCorrect: true, text: "你這個小聰明人，我也捨不得不給你分數，畢竟多一隻老虎又有什麼不好呢？(θ‿θ)" };
        return { isCorrect: false, text: "答錯囉！" };
      },
    },
  ];

  // --- D-6 MUSIC DYNAMIC STATE (TWO INPUT FIELDS PER ROW) ---
  const [songItems, setSongItems] = useState<{ songName: string; artist: string }[]>([
    { songName: "", artist: "" },
  ]);

  const handleSongFieldChange = (
    index: number,
    field: "songName" | "artist",
    val: string
  ) => {
    const updated = [...songItems];
    updated[index] = { ...updated[index], [field]: val };
    setSongItems(updated);
  };

  const handleAddSongRow = () => {
    setSongItems([...songItems, { songName: "", artist: "" }]);
  };

  const handleRemoveSongRow = (index: number) => {
    if (songItems.length <= 1) return;
    setSongItems(songItems.filter((_, idx) => idx !== index));
  };

  // --- D-5 PHOTO UPLOAD STATE ---
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState("");

  // --- D-4 BOARD POST STATE ---
  const [d4Text, setD4Text] = useState("");
  const [d4IsAnonymous, setD4IsAnonymous] = useState(false);

  // --- D-3 SECRET WORRY STATE ---
  const [d3WorryText, setD3WorryText] = useState("");

  // --- D-2 BOTTLE & NEXT EVENT STATE ---
  const [d2AcceptedBottle, setD2AcceptedBottle] = useState(false);
  const [assignedWorry, setAssignedWorry] = useState<WorryDoc | null>(null);
  const [d2ReplyText, setD2ReplyText] = useState("");
  const [d2NextEventText, setD2NextEventText] = useState("");

  // --- D-1 RECEIVED BOTTLE & RPG MODAL STATE ---
  const [receivedBottle, setReceivedBottle] = useState<WorryDoc | null>(null);
  const [showRPGModal, setShowRPGModal] = useState(false);

  // Real-time listener for currentDay from /system/gameState
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "gameState"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.currentDay) {
          setCurrentDay(data.currentDay);
        }
      }
    });

    return () => unsub();
  }, []);

  // Real-time listener for D-2 assigned worry (`assignedTo === user.accountId`)
  useEffect(() => {
    if (!user || currentDay !== "D-2") return;

    const q = query(
      collection(db, "worries"),
      where("assignedTo", "==", user.accountId)
    );
    const unsubD2 = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setAssignedWorry({ ...docData.data(), id: docData.id } as WorryDoc);
      } else {
        setAssignedWorry(null);
      }
    });

    return () => unsubD2();
  }, [user, currentDay]);

  // Real-time listener for D-1 received bottle (`authorId === user.accountId` & `replyText != ""`)
  useEffect(() => {
    if (!user || currentDay !== "D-1") return;

    const q = query(
      collection(db, "worries"),
      where("authorId", "==", user.accountId)
    );
    const unsubD1 = onSnapshot(q, (snapshot) => {
      let bottleFound: WorryDoc | null = null;
      snapshot.forEach((d) => {
        const data = d.data() as WorryDoc;
        if (data.replyText && data.replyText.trim().length > 0) {
          bottleFound = { ...data, id: d.id };
        }
      });
      setReceivedBottle(bottleFound);
    });

    return () => unsubD1();
  }, [user, currentDay]);

  if (!user) return null;

  // Completion / Submission lock flags
  const isD7Completed = user.completedTasks?.includes("D-7");

  const isD3Submitted = Boolean(
    (user as any).hasSubmittedBottle ||
    (user as any).hasSubmittedD3 ||
    user.completedTasks?.includes("D-3")
  );

  const isD2ReplySubmitted = Boolean(
    (user as any).hasSubmittedReply ||
    (user as any).hasSubmittedD2Reply ||
    user.completedTasks?.includes("D-2-part1")
  );

  const isD2WishSubmitted = Boolean(
    (user as any).hasSubmittedD2Wish ||
    user.completedTasks?.includes("D-2-part2")
  );

  // --- D-7 QUESTION SUBMIT HANDLER ---
  const handleD7QuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d7SelectedAnswer || isD7Completed) return;

    const currentQ = d7Questions[d7QuestionIndex];
    let isCorrect = false;
    let feedbackText = "";

    if (currentQ.id === 3 && currentQ.getFeedback) {
      const res = currentQ.getFeedback(d7SelectedAnswer);
      isCorrect = res.isCorrect;
      feedbackText = res.text;
    } else {
      isCorrect = d7SelectedAnswer === currentQ.correctAnswer;
      feedbackText = isCorrect ? (currentQ.correctFeedback || "") : (currentQ.incorrectFeedback || "");
    }

    if (isCorrect) {
      setD7TotalPoints((prev) => prev + 1);
    }

    setD7FeedbackCard({ text: feedbackText, isCorrect });
  };

  // --- D-7 NEXT QUESTION / FINISH HANDLER ---
  const handleD7NextStep = async () => {
    setD7FeedbackCard(null);
    setD7SelectedAnswer("");

    if (d7QuestionIndex < 2) {
      setD7QuestionIndex((prev) => prev + 1);
    } else {
      setSubmitting(true);
      try {
        await completeTaskAndReward("D-7", d7TotalPoints);
      } catch (err) {
        console.error("D-7 completion error:", err);
        alert("Failed to complete D-7 quiz.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // --- D-6 MUSIC SUBMIT HANDLER ---
  const handleD6Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = songItems
      .map((item) => ({
        songName: item.songName.trim(),
        artist: item.artist.trim(),
        formatted: item.artist.trim()
          ? `${item.songName.trim()} - ${item.artist.trim()}`
          : item.songName.trim(),
      }))
      .filter((item) => item.songName !== "" || item.artist !== "");

    if (validItems.length === 0) {
      alert("請至少輸入一首推薦歌曲！");
      return;
    }

    setSubmitting(true);
    try {
      const formattedList = validItems.map((item) => item.formatted);
      await addDoc(collection(db, "submissions"), {
        accountId: user.accountId,
        nickname: user.nickname,
        note: `[D-6 Music List]: ${formattedList.join(", ")}`,
        songs: formattedList,
        songObjects: validItems,
        day: "D-6",
        status: "approved",
        createdAt: new Date().toISOString(),
      });

      const isFirst = !user.completedTasks?.includes("D-6");
      await completeTaskAndReward("D-6", isFirst ? 3 : 0);

      setSongItems([{ songName: "", artist: "" }]);
      setFeedback(isFirst ? "音樂推薦成功送出！獲得 +3 pt！" : "音樂推薦已更新！");
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("D-6 submit error:", err);
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- D-5 PHOTO UPLOAD SUBMIT ---
  const handleD5PhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Upload failed");
      }

      await addDoc(collection(db, "submissions"), {
        accountId: user.accountId,
        imageUrl: data.url,
        note: photoNote.trim() ? photoNote.trim() : "分享的照片",
        day: "D-5",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      const currentCount = user.d5UploadCount || 0;
      let ptsToAward = 0;
      if (currentCount === 0) ptsToAward = 3;
      else if (currentCount === 1) ptsToAward = 2;
      else ptsToAward = 0;

      await completeTaskAndReward("D-5", ptsToAward);

      setPhotoFile(null);
      setPhotoNote("");
      const inputEl = document.getElementById("d5-photo-input") as HTMLInputElement;
      if (inputEl) inputEl.value = "";

      setFeedback(
        ptsToAward > 0
          ? `照片上傳成功！獲得 +${ptsToAward} pt！`
          : "照片上傳成功！"
      );
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error("D-5 Photo submit error:", err);
      alert(`照片上傳失敗: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- D-4 BOARD POST SUBMIT ---
  const handleD4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d4Text.trim()) return;

    setSubmitting(true);
    try {
      const authorName = d4IsAnonymous ? "匿名" : user.nickname;
      const authorId = d4IsAnonymous ? "anonymous" : user.accountId;
      const avatarUrl = d4IsAnonymous ? "" : (user.avatarUrl || "");

      await addDoc(collection(db, "bulletin"), {
        authorId: authorId,
        authorName: authorName,
        avatarUrl: avatarUrl,
        text: d4Text.trim(),
        day: "D-4",
        createdAt: new Date().toISOString(),
        isImportant: false,
      });

      const isFirst = !user.completedTasks?.includes("D-4");
      await completeTaskAndReward("D-4", isFirst ? 3 : 0);

      setD4Text("");
      setD4IsAnonymous(false);
      setFeedback(isFirst ? `訊息已發佈至佈告欄！獲得 +3 pt！` : `訊息已發佈！`);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("D-4 Submit error:", err);
      alert("D-4 submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- D-3 SECRET WORRY SUBMIT (ONE-TIME LOCK) ---
  const handleD3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d3WorryText.trim() || isD3Submitted) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "worries"), {
        authorId: user.accountId,
        worryText: d3WorryText.trim(),
        replyText: "",
        assignedTo: "",
        createdAt: new Date().toISOString(),
      });

      // Write boolean flags to Firestore user document
      await updateDoc(doc(db, "users", user.accountId), {
        hasSubmittedBottle: true,
        hasSubmittedD3: true,
      });

      const isFirst = !user.completedTasks?.includes("D-3");
      await completeTaskAndReward("D-3", isFirst ? 3 : 0);

      setD3WorryText("");
      setFeedback(isFirst ? "已投入漂流瓶！獲得 +3 pt！" : "已投入漂流瓶！");
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("D-3 submit error:", err);
      alert("Failed to submit secret worry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- D-2 REPLY SUBMIT (ONE-TIME LOCK) ---
  const handleD2ReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedWorry || !d2ReplyText.trim() || isD2ReplySubmitted) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "worries", assignedWorry.id), {
        replyText: d2ReplyText.trim(),
      });

      await updateDoc(doc(db, "users", user.accountId), {
        hasSubmittedReply: true,
        hasSubmittedD2Reply: true,
      });

      const isFirst = !user.completedTasks?.includes("D-2-part1");
      await completeTaskAndReward("D-2-part1", isFirst ? 3 : 0);

      setD2ReplyText("");
      setFeedback(isFirst ? "漂流瓶回覆已傳送！獲得 +3 pt！" : "漂流瓶回覆已傳送！");
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("D-2 reply error:", err);
      alert("Failed to send reply.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- D-2 NEXT EVENT SUBMIT (ONE-TIME LOCK) ---
  const handleD2NextEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d2NextEventText.trim() || isD2WishSubmitted) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "submissions"), {
        accountId: user.accountId,
        note: `[Task D-2 Next Event Wish]: ${d2NextEventText.trim()}`,
        day: "D-2",
        status: "approved",
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", user.accountId), {
        hasSubmittedD2Wish: true,
      });

      const isFirst = !user.completedTasks?.includes("D-2-part2");
      await completeTaskAndReward("D-2-part2", isFirst ? 3 : 0);

      setD2NextEventText("");
      setFeedback(isFirst ? "下次活動許願已送出！獲得 +3 pt！" : "下次活動許願已送出！");
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("D-2 next event submit error:", err);
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-100 border-2 border-black p-4 sm:p-5 md:p-6 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-5 select-none font-bold rotate-1 hover:rotate-0 transition-transform">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3 gap-2">
        <div className="flex items-center gap-1.5 text-black font-black uppercase tracking-wider text-sm sm:text-base md:text-lg truncate">
          <Calendar className="w-5 h-5 text-black shrink-0" />
          <span className="truncate">{currentDay} 小任務</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {user.completedTasks?.includes(currentDay) && (
            <div className="flex items-center gap-1 text-black font-extrabold bg-amber-300 border-2 border-black px-2 py-0.5 rounded text-xs sm:text-sm shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
              <span>COMPLETED</span>
            </div>
          )}
          <span className="text-xs sm:text-sm font-black text-black bg-white border-2 border-black px-2.5 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 whitespace-nowrap min-w-[42px] text-center">
            {currentDay}
          </span>
        </div>
      </div>

      {/* Global Task Feedback Alert */}
      {feedback && (
        <div className="bg-amber-300 border-2 border-black text-black p-3 rounded font-black text-base flex items-center gap-2 animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* --- DAY D-7: QA & 登入 (TRIVIA) --- */}
      {currentDay === "D-7" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <span className="text-black font-black uppercase flex items-center gap-1.5 text-base md:text-lg">
                <HelpCircle className="w-5 h-5 text-black" /> 【D-7 吐遊知識問答】
              </span>
              <span className="text-xs font-black text-stone-800 bg-yellow-200 border-2 border-black px-2 py-0.5 rounded">
                進度: {d7QuestionIndex + 1} / 3
              </span>
            </div>
            <p className="leading-relaxed text-stone-900 font-extrabold text-base sm:text-lg md:text-xl">
              {d7Questions[d7QuestionIndex].question}
            </p>
          </div>

          <form onSubmit={handleD7QuestionSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {d7Questions[d7QuestionIndex].options.map((opt) => (
                <label
                  key={opt.id}
                  className={`border-2 border-black p-3.5 rounded flex items-center gap-3 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-none ${
                    d7SelectedAnswer === opt.id
                      ? "bg-amber-300 text-black font-black"
                      : "bg-white text-stone-900 hover:bg-yellow-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="d7-quiz"
                    value={opt.id}
                    checked={d7SelectedAnswer === opt.id}
                    onChange={(e) => setD7SelectedAnswer(e.target.value)}
                    disabled={isD7Completed || !!d7FeedbackCard}
                    className="accent-black w-5 h-5 cursor-pointer shrink-0"
                  />
                  <span className="text-base sm:text-lg font-black">{opt.id}. {opt.text}</span>
                </label>
              ))}
            </div>

            {!d7FeedbackCard && (
              <button
                type="submit"
                disabled={!d7SelectedAnswer || isD7Completed}
                className="w-full py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
              >
                <Check className="w-5 h-5" />
                <span>{isD7Completed ? "問答已完成" : "送出答案"}</span>
              </button>
            )}
          </form>

          {/* Answer Feedback Modal / Card */}
          {d7FeedbackCard && (
            <div className="bg-yellow-50 border-2 border-black p-4 rounded text-black flex flex-col gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-fadeIn">
              <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                <Sparkles className="w-5 h-5 text-black shrink-0" />
                <span className="font-extrabold text-base sm:text-lg text-black">
                  {d7FeedbackCard.isCorrect ? "回答正確！" : "回答記錄"}
                </span>
              </div>

              <div className="text-base sm:text-lg font-extrabold text-stone-900 leading-relaxed space-y-1.5">
                {d7FeedbackCard.text.split("\n").slice(0, d7VisibleLinesCount).map((line, idx) => (
                  <p key={idx} className="animate-fadeIn">{line}</p>
                ))}
              </div>

              <button
                onClick={handleD7NextStep}
                disabled={submitting}
                className="w-full mt-2 py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
              >
                <span>{d7QuestionIndex < 2 ? "下一題 →" : "完成 Q&A 任務"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- DAY D-6: 音樂推推 (DYNAMIC MULTIPLE SONGS) --- */}
      {currentDay === "D-6" && (
        <form onSubmit={handleD6Submit} className="flex flex-col gap-4">
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
              <Music className="w-5 h-5 text-black" /> 【D-6 音樂推推】
            </span>
            <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg whitespace-pre-line">
              {`準備登入吐遊，肯定要準備好心情吧？或是讓我知道你的心情，首先就是來個一二三四五首，現在！正在聽的音樂！\n或是想推薦個的~最好是在YouTube or Spotify 找得到的啦，以上，就是今天的任務(ﾉ*0*)ﾉ→`}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {songItems.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-yellow-50 p-3 border-2 border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-sm font-black text-black shrink-0 w-8">
                  #{index + 1}
                </span>

                <input
                  type="text"
                  value={item.songName}
                  onChange={(e) => handleSongFieldChange(index, "songName", e.target.value)}
                  placeholder="歌名 (Song Name)"
                  className="flex-1 bg-white border-2 border-black rounded px-3 py-2 text-base text-black placeholder:text-stone-500 font-bold focus:outline-none focus:bg-yellow-100"
                />

                <input
                  type="text"
                  value={item.artist}
                  onChange={(e) => handleSongFieldChange(index, "artist", e.target.value)}
                  placeholder="歌手 / 樂團 (Artist)"
                  className="flex-1 bg-white border-2 border-black rounded px-3 py-2 text-base text-black placeholder:text-stone-500 font-bold focus:outline-none focus:bg-yellow-100"
                />

                {songItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSongRow(index)}
                    className="p-2 border-2 border-black bg-red-200 hover:bg-black hover:text-white text-black rounded cursor-pointer shrink-0 transition-none"
                    title="移除此歌曲"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSongRow}
              className="w-full py-2 bg-yellow-200 hover:bg-amber-300 border-2 border-black text-black font-extrabold text-base rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-none"
            >
              <Plus className="w-4 h-4" />
              <span>新增一首推薦歌曲 (+)</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? "送出中..." : "送出音樂歌單"}</span>
          </button>
        </form>
      )}

      {/* --- DAY D-5: PICTURE (PHOTOS) --- */}
      {currentDay === "D-5" && (
        <form onSubmit={handleD5PhotoSubmit} className="flex flex-col gap-4">
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
              <Camera className="w-5 h-5 text-black" /> 【D-5 照片分享】
            </span>
            <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg">
              今天是倒數第五天，五福臨門的五、五告讚的五，同時也是嗚唔五五QQ的五，今天的任務是，分享你手機裡一兩三張照片，不論是因為什麼而拍下的照片或是因為什麼而存下來的圖片，偷偷說，分享第二張也有額外小加分wow
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-base font-extrabold text-black uppercase mb-1">選擇照片</label>
              <input
                type="file"
                id="d5-photo-input"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="w-full text-base text-stone-800 file:mr-2 file:py-2 file:px-4 file:rounded file:border-2 file:border-black file:bg-amber-300 file:text-black file:font-extrabold file:text-base cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block text-base font-extrabold text-black uppercase mb-1">照片備註</label>
              <input
                type="text"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="替這張照片寫句說明吧..."
                className="w-full bg-yellow-50 border-2 border-black rounded px-3.5 py-2.5 text-base md:text-lg text-black placeholder:text-stone-500 font-bold focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !photoFile}
            className="w-full py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
          >
            <Camera className="w-5 h-5" />
            <span>
              {submitting
                ? "上傳中..."
                : (user.d5UploadCount || 0) === 0
                ? "上傳第 1 張照片"
                : (user.d5UploadCount || 0) === 1
                ? "上傳第 2 張照片"
                : "上傳第 3 張照片"}
            </span>
          </button>
        </form>
      )}

      {/* --- DAY D-4: BULLETIN --- */}
      {currentDay === "D-4" && (
        <form onSubmit={handleD4Submit} className="flex flex-col gap-4">
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
              <Send className="w-5 h-5 text-black" /> 【D-4 佈告欄大解放】
            </span>
            <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg">
              有四就是要說！今天的小任務是「賀！佈告欄大解放」，在任務欄輸入你想說的話，不論是匿名或是署名都可以
            </p>
          </div>

          <div className="flex items-center gap-2 bg-yellow-50 p-3 border-2 border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <input
              type="checkbox"
              id="d4-anonymous-toggle"
              checked={d4IsAnonymous}
              onChange={(e) => setD4IsAnonymous(e.target.checked)}
              className="accent-black cursor-pointer w-5 h-5"
            />
            <label htmlFor="d4-anonymous-toggle" className="text-base text-black cursor-pointer font-extrabold flex items-center gap-1.5">
              <User className="w-4 h-4 text-black" /> 匿名發佈 (顯示為 "匿名")
            </label>
          </div>

          <textarea
            value={d4Text}
            onChange={(e) => setD4Text(e.target.value)}
            rows={4}
            placeholder="輸入你想公開說的話..."
            className="w-full bg-yellow-50 border-2 border-black rounded p-3.5 text-base md:text-lg text-black placeholder:text-stone-500 font-bold focus:outline-none focus:bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? "發佈中..." : "發佈至佈告欄"}</span>
          </button>
        </form>
      )}

      {/* --- DAY D-3: BOTTLE+ROUTING (ONE-TIME SUBMISSION LOCK) --- */}
      {currentDay === "D-3" && (
        <form onSubmit={handleD3Submit} className="flex flex-col gap-4">
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
              <HelpCircle className="w-5 h-5 text-black" /> 【D-3 漂流瓶小冒險】
            </span>
            <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg">
              昨天是有話大聲說，今天是有話小聲說，隨便寫點什麼丟到漂流瓶裡面吧，我也不知道會漂到哪裡去ʕ´•ᴥ•`ʔ
            </p>
          </div>

          <textarea
            value={d3WorryText}
            onChange={(e) => setD3WorryText(e.target.value)}
            readOnly={isD3Submitted}
            disabled={isD3Submitted}
            rows={4}
            placeholder={isD3Submitted ? "您已成功投出漂流瓶" : "寫下任何悄悄話..."}
            className={`w-full border-2 border-black rounded p-3.5 text-base md:text-lg font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
              isD3Submitted
                ? "bg-amber-50 text-stone-700 cursor-not-allowed"
                : "bg-yellow-50 text-black placeholder:text-stone-500 focus:outline-none focus:bg-white"
            }`}
            required
          />

          {isD3Submitted ? (
            <div className="w-full py-3 bg-amber-300 border-2 border-black text-black font-extrabold uppercase text-base sm:text-lg rounded flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
              <span>已成功投遞 (已送出)</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
            >
              <Send className="w-5 h-5" />
              <span>{submitting ? "投瓶中..." : "漂流瓶正在漂走"}</span>
            </button>
          )}
        </form>
      )}

      {/* --- DAY D-2: 回覆BOTTLE+下次許願 (COHESIVE SINGLE MISSION) --- */}
      {currentDay === "D-2" && (
        <div className="flex flex-col gap-6">
          {/* Bottle Reply Section: ONLY render if user submitted a bottle in D-3 */}
          {isD3Submitted && (
            <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
                <Inbox className="w-5 h-5 text-black" /> 【D-2 漂流瓶回覆】
              </span>

              {!assignedWorry ? (
                <div className="bg-yellow-50 border-2 border-black p-4 rounded text-black flex items-center gap-3 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                  <p className="text-sm sm:text-base font-bold text-stone-800 leading-relaxed">
                    漂流瓶正在大海中漂流尋找配對中，請稍後再來查看！
                  </p>
                </div>
              ) : !d2AcceptedBottle ? (
                <div className="bg-yellow-100 border-2 border-black p-4 rounded flex flex-col gap-3">
                  <p className="font-extrabold text-stone-900 leading-relaxed text-base md:text-lg">
                    哎呀，有一隻瓶子使用仰式朝你游過來了，請問你是要接收下來還是？
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setD2AcceptedBottle(true)}
                      className="flex-1 py-3 bg-amber-300 border-2 border-black text-black font-extrabold text-base md:text-lg rounded hover:bg-black hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-none"
                    >
                      我要收下
                    </button>
                    <button
                      onClick={() => setD2AcceptedBottle(true)}
                      className="flex-1 py-3 bg-yellow-200 border-2 border-black text-black font-extrabold text-base md:text-lg rounded hover:bg-black hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-none"
                    >
                      已經在我手上了
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleD2ReplySubmit} className="flex flex-col gap-3">
                  <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg">
                    請你回覆這張紙條的主人吧，放心，這個回覆是匿名的，啊所以也因為是這樣，如果你真的很想署名要自己寫欸
                  </p>

                  <div className="bg-yellow-50 border-2 border-black p-3.5 rounded flex flex-col gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-xs sm:text-sm text-stone-700 font-black uppercase">
                      收到的紙條內容：
                    </span>
                    <p className="text-black font-bold text-base md:text-lg bg-white p-3 border border-stone-400 rounded">
                      {cleanPostText(assignedWorry.worryText)}
                    </p>
                  </div>

                  <textarea
                    value={d2ReplyText}
                    onChange={(e) => setD2ReplyText(e.target.value)}
                    readOnly={isD2ReplySubmitted}
                    disabled={isD2ReplySubmitted}
                    rows={3}
                    placeholder={isD2ReplySubmitted ? "您已成功傳送匿名回覆" : "想怎麼回就怎麼回~"}
                    className={`w-full border-2 border-black rounded p-3.5 text-base md:text-lg font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                      isD2ReplySubmitted
                        ? "bg-amber-50 text-stone-700 cursor-not-allowed"
                        : "bg-yellow-50 text-black placeholder:text-stone-500 focus:outline-none focus:bg-white"
                    }`}
                    required
                  />

                  {isD2ReplySubmitted ? (
                    <div className="w-full py-3 bg-amber-300 border-2 border-black text-black font-extrabold uppercase text-base sm:text-lg rounded flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                      <span>匿名回覆已送出 (已送出)</span>
                    </div>
                  ) : (
                    <div className="flex justify-end mt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold text-sm sm:text-base rounded cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none flex items-center gap-1.5 shrink-0"
                      >
                        <Send className="w-4 h-4 shrink-0" />
                        <span>{submitting ? "傳送中..." : "傳送匿名回覆"}</span>
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Next Event Wish Section */}
          <form onSubmit={handleD2NextEventSubmit} className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-extrabold uppercase flex items-center gap-1.5 text-base md:text-lg">
              <Compass className="w-5 h-5 text-black" /> 【D-2 下次吐遊許願】
            </span>
            <p className="leading-relaxed text-stone-800 font-bold text-base md:text-lg">
              本日任務那肯定也是精選中的精選，關鍵問題，請問，下次吐遊你想去哪裡/想做什麼活動？也許也能給下一任參考，嘻嘻
            </p>

            <textarea
              value={d2NextEventText}
              onChange={(e) => setD2NextEventText(e.target.value)}
              readOnly={isD2WishSubmitted}
              disabled={isD2WishSubmitted}
              rows={3}
              placeholder={isD2WishSubmitted ? "您的下次吐遊許願已成功送出" : "下次想去哪裡、做什麼活動？"}
              className={`w-full border-2 border-black rounded p-3.5 text-base md:text-lg font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                isD2WishSubmitted
                  ? "bg-amber-50 text-stone-700 cursor-not-allowed"
                  : "bg-yellow-50 text-black placeholder:text-stone-500 focus:outline-none focus:bg-white"
              }`}
              required
            />

            {isD2WishSubmitted ? (
              <div className="w-full py-3 bg-amber-300 border-2 border-black text-black font-extrabold uppercase text-base sm:text-lg rounded flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                <span>許願已成功送出 (已送出)</span>
              </div>
            ) : (
              <div className="flex justify-end mt-1">
                <button
                  type="submit"
                  disabled={submitting || !d2NextEventText.trim()}
                  className="px-6 py-2.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold text-sm sm:text-base rounded cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>{submitting ? "送出中..." : "送出許願"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* --- DAY D-1: 收到回覆+播放劇情 --- */}
      {currentDay === "D-1" && (
        <div className="flex flex-col gap-5">
          {/* Drift bottle received card: ONLY render if user actually completed D-3 AND received a bottle */}
          {isD3Submitted && receivedBottle && (
            <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-black font-black uppercase flex items-center gap-1.5 text-base md:text-lg">
                <MessageCircle className="w-5 h-5 text-black" /> 你的瓶子漂回來了！
              </span>

              <div className="bg-yellow-50 border-2 border-black p-4 rounded flex flex-col gap-3 font-bold">
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm text-stone-700 font-extrabold uppercase">
                    你之前丟進瓶子裡的...:
                  </span>
                  <p className="text-black text-sm md:text-base leading-relaxed bg-white p-3 border-2 border-black rounded">
                    {cleanPostText(receivedBottle.worryText)}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm text-stone-700 font-extrabold uppercase">
                    不知道是誰回應了：...:
                  </span>
                  <p className="text-black text-sm md:text-base leading-relaxed bg-amber-200 p-3 border-2 border-black rounded">
                    {cleanPostText(receivedBottle.replyText)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowRPGModal(true)}
            className="w-full py-4 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-black uppercase text-base sm:text-lg rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-none active:translate-x-0.5 active:translate-y-0.5"
          >
            <Tv className="w-5 h-5" />
            <span>看看發生什麼事了</span>
          </button>
        </div>
      )}

      {/* Full-Screen Visual Novel RPG Overlay Component */}
      {showRPGModal && (
        <RPGDialogBox onClose={() => setShowRPGModal(false)} />
      )}
    </div>
  );
}
