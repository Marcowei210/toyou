"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot, setDoc, updateDoc, runTransaction, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  MapPin,
  Crown,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Users,
  Send,
  Coffee,
  Volume2,
  Grid,
  Award,
  Trophy,
  Upload,
  Camera,
  Clock,
  Check,
  X,
  FileImage,
} from "lucide-react";

export interface GroupQuestion {
  id: string;
  qKey: "q1" | "q2" | "q3" | "q4" | "q5";
  groupId: number; // 1 | 2 | 3
  title: string;
  image?: string;
  pieceNumber: number;
  correctAnswer: string;
  prefixText?: string;
  suffixText?: string;
  hintNumber?: string;
}

export interface GridPieceDef {
  pieceNumber: number;
  groupId: number;
  qKey: "q1" | "q2" | "q3" | "q4" | "q5";
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  soundFile: string;
  hintNumber?: string;
}

export interface SecondHalfPieceDef {
  pieceNumber: number;
  groupId: number; // 1 | 2 | 3
  qKey: string; // "p1", "p2", ..., "p18"
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  soundFile: string;
  requiresUpload?: boolean;
  title: string;
}

const MUTUAL_QA_LIST = [
  "",
  "Q1: (A)耳環 (B)眼鏡 (C)項鍊 (由 Group 1 猜測 Group 2)",
  "Q2: (A)腳踏車 (B)跑步 (C)爬山 (由 Group 2 猜測 Group 3)",
  "Q3: (A)排球 (B)桌球 (C)羽球 (由 Group 3 猜測 Group 1)",
  "Q4: (A)綠色 (B)黃色 (C)藍色 (由 Group 1 猜測 Group 3)",
  "Q5: (A)花蓮 (B)南投 (C)馬祖 (由 Group 2 猜測 Group 1)",
  "Q6: (A)蜘蛛 (B)蛇 (C)老鼠 (由 Group 3 猜測 Group 2)"
];

// First Half 15 Grid Pieces Mapping (Numbered 1 to 15 from Top-Left to Bottom-Right)
const GRID_PIECES: GridPieceDef[] = [
  // --- ROW 1 (Horizontal 1x2, Cols 1-6) ---
  { pieceNumber: 1, groupId: 1, qKey: "q1", colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 1, soundFile: "2,2.wav", hintNumber: "33" },
  { pieceNumber: 2, groupId: 2, qKey: "q1", colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 1, soundFile: "2,1.wav", hintNumber: "1" },
  { pieceNumber: 3, groupId: 3, qKey: "q1", colStart: 5, colSpan: 2, rowStart: 1, rowSpan: 1, soundFile: "1,1.wav", hintNumber: "32" },

  // --- ROWS 2-3 (Vertical 2x1, Cols 1-6) ---
  { pieceNumber: 4, groupId: 1, qKey: "q2", colStart: 1, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "0,0.wav", hintNumber: "36" },
  { pieceNumber: 5, groupId: 1, qKey: "q3", colStart: 2, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "0,0.wav", hintNumber: "3" },
  { pieceNumber: 6, groupId: 2, qKey: "q2", colStart: 3, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "1,1.wav", hintNumber: "63" },
  { pieceNumber: 7, groupId: 2, qKey: "q3", colStart: 4, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "2,2.wav", hintNumber: "47" },
  { pieceNumber: 8, groupId: 3, qKey: "q2", colStart: 5, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "2,2.wav", hintNumber: "4" },
  { pieceNumber: 9, groupId: 3, qKey: "q3", colStart: 6, colSpan: 1, rowStart: 2, rowSpan: 2, soundFile: "0,0.wav", hintNumber: "2" },

  // --- ROWS 4-5 (Vertical 2x1, Cols 1-6) ---
  { pieceNumber: 10, groupId: 1, qKey: "q4", colStart: 1, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "0,2.wav", hintNumber: "22" },
  { pieceNumber: 11, groupId: 1, qKey: "q5", colStart: 2, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "0,2.wav" },
  { pieceNumber: 12, groupId: 2, qKey: "q4", colStart: 3, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "2,2.wav", hintNumber: "81" },
  { pieceNumber: 13, groupId: 2, qKey: "q5", colStart: 4, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "1,2.wav" },
  { pieceNumber: 14, groupId: 3, qKey: "q4", colStart: 5, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "0,2.wav", hintNumber: "68" },
  { pieceNumber: 15, groupId: 3, qKey: "q5", colStart: 6, colSpan: 1, rowStart: 4, rowSpan: 2, soundFile: "0,1.wav" },
];

// Second Half 18 Grid Pieces Mapping (6x6 Grid, Numbered 1 to 18)
const SECOND_HALF_GRID_PIECES: SecondHalfPieceDef[] = [
  // Row 1-2 (Cols 1-6) - 2x1 Vertical pieces
  { pieceNumber: 1, groupId: 1, qKey: "p1", colStart: 1, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "1,0.wav", requiresUpload: true, title: "地圖碎片 #1 (照片任務: GM審核)" },
  { pieceNumber: 2, groupId: 1, qKey: "p2", colStart: 2, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "1,0.wav", requiresUpload: true, title: "地圖碎片 #2 (照片任務: GM審核)" },
  { pieceNumber: 3, groupId: 2, qKey: "p3", colStart: 3, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "2,2.wav", title: "地圖碎片 #3 (午餐活動獎勵)" },
  { pieceNumber: 4, groupId: 2, qKey: "p4", colStart: 4, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "2,0.wav", requiresUpload: true, title: "地圖碎片 #4 (照片任務: GM審核)" },
  { pieceNumber: 5, groupId: 3, qKey: "p5", colStart: 5, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "2,0.wav", title: "地圖碎片 #5 (午餐活動獎勵)" },
  { pieceNumber: 6, groupId: 3, qKey: "p6", colStart: 6, colSpan: 1, rowStart: 1, rowSpan: 2, soundFile: "2,0.wav", requiresUpload: true, title: "地圖碎片 #6 (照片任務: GM審核)" },

  // Row 3-4 (Cols 1-6) - 2x1 Vertical pieces
  { pieceNumber: 7, groupId: 1, qKey: "p7", colStart: 1, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "0,0.wav", title: "地圖碎片 #7 (午餐活動獎勵)" },
  { pieceNumber: 8, groupId: 1, qKey: "p8", colStart: 2, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "1,0.wav", requiresUpload: true, title: "地圖碎片 #8 (照片任務: GM審核)" },
  { pieceNumber: 9, groupId: 2, qKey: "p9", colStart: 3, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "2,2.wav", requiresUpload: true, title: "地圖碎片 #9 (照片任務: GM審核)" },
  { pieceNumber: 10, groupId: 2, qKey: "p10", colStart: 4, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "2,0.wav", requiresUpload: true, title: "地圖碎片 #10 (照片任務: GM審核)" },
  { pieceNumber: 11, groupId: 3, qKey: "p11", colStart: 5, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "2,1.wav", title: "地圖碎片 #11 (地點任務)" },
  { pieceNumber: 12, groupId: 3, qKey: "p12", colStart: 6, colSpan: 1, rowStart: 3, rowSpan: 2, soundFile: "0,0.wav", requiresUpload: true, title: "地圖碎片 #12 (照片任務: GM審核)" },

  // Row 5-6 (Cols 1-6) - 2x1 Vertical pieces
  { pieceNumber: 13, groupId: 1, qKey: "p13", colStart: 1, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "0,1.wav", title: "地圖碎片 #13 (地點任務)" },
  { pieceNumber: 14, groupId: 1, qKey: "p14", colStart: 2, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "0,1.wav", requiresUpload: true, title: "地圖碎片 #14 (照片任務: GM審核)" },
  { pieceNumber: 15, groupId: 2, qKey: "p15", colStart: 3, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "2,1.wav", title: "地圖碎片 #15 (地點任務)" },
  { pieceNumber: 16, groupId: 2, qKey: "p16", colStart: 4, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "0,1.wav", title: "地圖碎片 #16 (終極拼圖)" },
  { pieceNumber: 17, groupId: 3, qKey: "p17", colStart: 5, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "1,1.wav", title: "地圖碎片 #17 (終極拼圖)" },
  { pieceNumber: 18, groupId: 3, qKey: "p18", colStart: 6, colSpan: 1, rowStart: 5, rowSpan: 2, soundFile: "0,1.wav", title: "地圖碎片 #18 (終極拼圖)" },
];

// Sound mapping for First Half according to /public/piece_to_sound.txt
const PIECE_SOUND_MAP: Record<number, string> = {
  1: "2,2.wav",
  2: "2,1.wav",
  3: "1,1.wav",
  4: "0,0.wav",
  5: "0,0.wav",
  6: "1,1.wav",
  7: "2,2.wav",
  8: "2,2.wav",
  9: "0,0.wav",
  10: "0,2.wav",
  11: "0,2.wav",
  12: "2,2.wav",
  13: "1,2.wav",
  14: "0,2.wav",
  15: "0,1.wav",
};

// Sound mapping for Second Half according to /public/piece_to_sound.txt
const SECOND_HALF_PIECE_SOUND_MAP: Record<number, string> = {
  1: "1,0.wav",
  2: "1,0.wav",
  3: "2,2.wav",
  4: "2,0.wav",
  5: "2,0.wav",
  6: "2,0.wav",
  7: "0,0.wav",
  8: "1,0.wav",
  9: "2,2.wav",
  10: "2,0.wav",
  11: "2,1.wav",
  12: "0,0.wav",
  13: "0,1.wav",
  14: "0,1.wav",
  15: "2,1.wav",
  16: "0,1.wav",
  17: "1,1.wav",
  18: "0,1.wav",
};

// Questions per Group (Strict Q1, Q2, Q3, Q4 with Location Hints on ALL questions)
const GROUP_QUESTIONS: GroupQuestion[] = [
  // --- GROUP 1 ---
  {
    id: "g1_q1",
    qKey: "q1",
    groupId: 1,
    title: "Q1: 那個木頭牌子上寫了什麼？",
    image: "/first_half/g1-q1_33.jpg",
    pieceNumber: 1,
    correctAnswer: "松風水月",
    hintNumber: "33",
  },
  {
    id: "g1_q2",
    qKey: "q2",
    groupId: 1,
    title: "Q2: 這是什麼單位把這個塑膠盒子放在這裡啊？",
    image: "/first_half/g1-q2_36.jpg",
    pieceNumber: 4,
    correctAnswer: "學生輔導中心",
    hintNumber: "36",
  },
  {
    id: "g1_q3",
    qKey: "q3",
    groupId: 1,
    title: "Q3: 我上次去了交誼廳的左邊，咦，那地方叫什麼啊？",
    image: "/first_half/g1-q3_3.jpg",
    pieceNumber: 5,
    correctAnswer: "小中大電視台",
    hintNumber: "3",
  },
  {
    id: "g1_q4",
    qKey: "q4",
    groupId: 1,
    title: "Q4: 這棵小樹的認養人說過一句很棒的話，但我忘了，幫我看看他說了什麼？",
    image: "/first_half/g1-q4_22.jpg",
    pieceNumber: 10,
    correctAnswer: "精實、誠信、共好",
    hintNumber: "22",
  },

  // --- GROUP 2 ---
  {
    id: "g2_q1",
    qKey: "q1",
    groupId: 2,
    title: "Q1: 這告示跑馬燈真氣派，咦幫我看看是誰贊助的啊？",
    image: "/first_half/g2-q1_1.jpg",
    pieceNumber: 2,
    correctAnswer: "中央光電系友會",
    hintNumber: "1",
  },
  {
    id: "g2_q2",
    qKey: "q2",
    groupId: 2,
    title: "Q2: 餐廳外的飲料店沒開欸，上面有一個TW-...的編號也不知道是什麼意思，不過你幫我記錄下來好嗎？",
    image: "/first_half/g2-q2_63.jpg",
    pieceNumber: 6,
    correctAnswer: "336",
    hintNumber: "63",
  },
  {
    id: "g2_q3",
    qKey: "q3",
    groupId: 2,
    title: "Q3: 廁所左邊的教室是做什麼的啊？",
    image: "/first_half/g2-q3_47.jpg",
    pieceNumber: 7,
    correctAnswer: "陶藝",
    suffixText: "教室",
    hintNumber: "47",
  },
  {
    id: "g2_q4",
    qKey: "q4",
    groupId: 2,
    title: "Q4: 要來搭車囉！地上那條是什麼線？",
    image: "/first_half/g2-q4_81.jpg",
    pieceNumber: 12,
    correctAnswer: "市區公車等候",
    suffixText: "線",
    hintNumber: "81",
  },

  // --- GROUP 3 ---
  {
    id: "g3_q1",
    qKey: "q1",
    groupId: 3,
    title: "Q1: 管二的要求很多欸，上面好像寫了某些地方是他的管理範圍，是哪些地方啊？",
    image: "/first_half/g3-q1_32.jpg",
    pieceNumber: 3,
    correctAnswer: "管二館前廣場、一樓門廳、地下室中庭",
    suffixText: "及各樓層走廊樓梯",
    hintNumber: "32",
  },
  {
    id: "g3_q2",
    qKey: "q2",
    groupId: 3,
    title: "Q2: 國鼎有夠多功能，不過台聯大系統左邊的是哪個組織也寫了他們在這裡啊？",
    image: "/first_half/g3-q2_4.jpg",
    pieceNumber: 8,
    correctAnswer: "臺灣經濟發展研究中心",
    hintNumber: "4",
  },
  {
    id: "g3_q3",
    qKey: "q3",
    groupId: 3,
    title: "Q3: 圖書館外面的燈很智慧，鐵定花了不少錢在上面吧？",
    image: "/first_half/g3-q3_2.jpg",
    pieceNumber: 9,
    correctAnswer: "89萬3仟5佰元",
    prefixText: "總工程費:新臺幣",
    suffixText: "整。",
    hintNumber: "2",
  },
  {
    id: "g3_q4",
    qKey: "q4",
    groupId: 3,
    title: "Q4: 這裡有好多雲! 好想知道總共有幾朵(阿拉伯數字)？",
    image: "/first_half/g3-q4_68.jpg",
    pieceNumber: 14,
    correctAnswer: "12",
    suffixText: "朵",
    hintNumber: "68",
  },
];

const GROUP_LOCATIONS: Record<number, string> = {
  1: "請去【大嗑蛋餅】跟你的隊員見面吧~先吃頓早餐，一起商討策略！",
  2: "請去【惟客】跟你的隊員見面吧~先吃頓早餐，一起商討策略！",
  3: "請去【樂活堡】跟你的隊員見面吧~先吃頓早餐，一起商討策略！",
};

export default function DDayPage() {
  const { user, completeTaskAndReward } = useAuth();

  // Phase Tab State: "first" (上 - First Half 6x5) | "second" (下 - Second Half 6x6)
  const [activePhaseTab, setActivePhaseTab] = useState<"first" | "second">("first");
  const [isPhase2Unlocked, setIsPhase2Unlocked] = useState(false);
  const [hasReadPhase2Instructions, setHasReadPhase2Instructions] = useState(false);
  const [hasClickedProceed, setHasClickedProceed] = useState(false);
  const [mutualQaStep, setMutualQaStep] = useState(0);

  // State 1: Pre-Game Question State & Attempt Counter
  const [preGameAnswer, setPreGameAnswer] = useState<string>("");
  const [preGameAttempts, setPreGameAttempts] = useState<number>(0);
  const [preGameFeedback, setPreGameFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [isPreGameDone, setIsPreGameDone] = useState<boolean>(false);

  // State 2 & 3: Real-Time Group Data for Groups 1, 2, 3
  const [allGroupsData, setAllGroupsData] = useState<
    Record<
      number,
      {
        leaderId?: string;
        leaderName?: string;
        captainId?: string;
        captainName?: string;
        qSolved?: Record<string, boolean>;
        qAttempts?: Record<string, number>;
        qScores?: Record<string, number>;
        totalScore?: number;
        secondHalfSubmissions?: Record<string, { imageUrl: string; status: "pending" | "approved" | "rejected"; uploadedAt: string }>;
        activeTasks?: Record<string, boolean>;
      }
    >
  >({});

  const [submittingLeader, setSubmittingLeader] = useState(false);

  // Active Question Input State & Confirmed Location Hints State
  const [currentInput, setCurrentInput] = useState<string>("");
  const [questionFeedback, setQuestionFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [confirmedHints, setConfirmedHints] = useState<Record<string, boolean>>({});


  // Vercel Blob Photo Upload State for Second Half Tasks
  const [selectedUploadPiece, setSelectedUploadPiece] = useState<SecondHalfPieceDef | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Audio Playback Tracking Ref
  const prevUnlockedRef = useRef<Set<number>>(new Set());
  const prevSecondHalfUnlockedRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  // Helper to extract numeric Group ID (1, 2, 3) from user profile
  const getGroupId = (u: any): number => {
    if (!u) return 0;
    const rawGroup = u.group || u.team;
    if (!rawGroup) return 0;
    const str = String(rawGroup);
    if (str.includes("1")) return 1;
    if (str.includes("2")) return 2;
    if (str.includes("3")) return 3;
    return 0;
  };

  const groupId = user ? getGroupId(user) : 0;
  const currentGroupData = allGroupsData[groupId] || {};

  // Check if First Half is fully completed for this group
  const isFirstHalfComplete = ["q1", "q2", "q3", "q4", "q5"].every(
    (k) => currentGroupData.qSolved?.[k] === true
  );

  // Check if Second Half is fully completed for this group (3 specific questions)
  const secondHalfTargetPieces: Record<number, string[]> = {
    1: ["p1", "p4", "p10"],
    2: ["p2", "p8", "p14"],
    3: ["p6", "p9", "p12"],
  };
  const isSecondHalfComplete = secondHalfTargetPieces[groupId]?.every(
    (qKey) => currentGroupData.qSolved?.[qKey] === true
  );

  // Reactive Reward Listener (Awards points to ALL members automatically when group solves a question)
  const processingRewardsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!user?.accountId || !currentGroupData || !groupId || groupId === 0) return;
    const { qSolved, qScores } = currentGroupData;
    if (!qSolved || !qScores) return;

    const allKeys = Object.keys(qSolved);
    
    allKeys.forEach((qKey) => {
      const taskId = `D-Day-${qKey}`;
      const hasCompleted = user.completedTasks?.includes(taskId);
      const isSolved = qSolved[qKey] === true;
      const score = qScores[qKey] || 0;

      if (isSolved && !hasCompleted && score > 0 && !processingRewardsRef.current.has(taskId)) {
        processingRewardsRef.current.add(taskId);
        completeTaskAndReward(taskId, score)
          .catch((err) => {
            console.error(`Failed to claim reward for ${taskId}:`, err);
            processingRewardsRef.current.delete(taskId);
          });
      }
    });
  }, [currentGroupData.qSolved, currentGroupData.qScores, user?.completedTasks, user?.accountId, completeTaskAndReward]);

  // No longer auto-switching to Phase 2 tab based on First Half. Phase 2 unlocks globally.

  // Check if Pre-Game Question is completed
  useEffect(() => {
    if (user && ((user as any).ddayPreGameCompleted || user.completedTasks?.includes("D-Day-PreGame"))) {
      setIsPreGameDone(true);
    }
  }, [user]);

  // Play audio helper for a piece number (First Half 1-15)
  const playPieceAudio = (pieceNumber: number) => {
    const soundFile = PIECE_SOUND_MAP[pieceNumber];
    if (!soundFile) return;
    try {
      const audio = new Audio(`/piece_sound/${soundFile}`);
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Play audio helper for Second Half (1-18)
  const playSecondHalfPieceAudio = (pieceNumber: number) => {
    const soundFile = SECOND_HALF_PIECE_SOUND_MAP[pieceNumber];
    if (!soundFile) return;
    try {
      const audio = new Audio(`/piece_sound/${soundFile}`);
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Listen for global Phase 2 unlock state
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "dday_global"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.isPhase2Unlocked) {
          setIsPhase2Unlocked(true);
        } else {
          setIsPhase2Unlocked(false);
          setActivePhaseTab("first");
        }
        setMutualQaStep(data.mutualQaStep || 0);
      }
    });
    return () => unsub();
  }, []);

  // Real-time listener for ALL Groups (1, 2, 3) in Firestore (`/system/dday_group_X`)
  useEffect(() => {
    if (!user) return;

    const unsubs = [1, 2, 3].map((gId) =>
      onSnapshot(doc(db, "system", `dday_group_${gId}`), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAllGroupsData((prev) => ({
            ...prev,
            [gId]: {
              ...data,
              leaderId: data.leaderId || data.captainId,
              leaderName: data.leaderName || data.captainName,
            },
          }));

          // Check for newly unlocked First Half pieces and play audio automatically
          const currentSolved = data.qSolved || {};
          const hasGroupLeader = Boolean(data.leaderId || data.captainId);

          GRID_PIECES.forEach((p) => {
            if (p.groupId === gId) {
              const isPieceUnlocked =
                currentSolved[p.qKey] === true || (hasGroupLeader && p.qKey === "q1");
              if (isPieceUnlocked && !prevUnlockedRef.current.has(p.pieceNumber)) {
                prevUnlockedRef.current.add(p.pieceNumber);
                if (!isInitialLoadRef.current[gId] && gId === groupId) {
                  playPieceAudio(p.pieceNumber);
                }
              }
            }
          });

          // Check for newly unlocked Second Half pieces and play audio automatically
          SECOND_HALF_GRID_PIECES.forEach((p) => {
            if (p.groupId === gId) {
              const isPieceUnlocked = currentSolved[p.qKey] === true;
              if (isPieceUnlocked && !prevSecondHalfUnlockedRef.current.has(p.pieceNumber)) {
                prevSecondHalfUnlockedRef.current.add(p.pieceNumber);
                if (!isInitialLoadRef.current[gId] && gId === groupId) {
                  playSecondHalfPieceAudio(p.pieceNumber);
                }
              }
            }
          });

          // Mark initial load complete for this group
          if (isInitialLoadRef.current[gId]) {
            isInitialLoadRef.current[gId] = false;
          }
        }
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user, groupId]);

  if (!user) return null;

  // --- STATE 1: PRE-GAME QUESTION SUBMIT ---
  const handlePreGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preGameAnswer || isPreGameDone) return;

    const attempts = preGameAttempts + 1;
    setPreGameAttempts(attempts);

    if (preGameAnswer.toLowerCase() === "a") {
      const pointsEarned = attempts === 1 ? 2 : attempts === 2 ? 1 : 0;
      setIsPreGameDone(true);
      setPreGameFeedback({
        isCorrect: true,
        message: `回答正確！(+${pointsEarned} 分) 解鎖早餐會合地點與隊長選拔！`,
      });

      try {
        await setDoc(
          doc(db, "users", user.accountId),
          {
            ddayPreGameCompleted: true,
          },
          { merge: true }
        );
        await completeTaskAndReward("D-Day-PreGame", pointsEarned);
      } catch (err) {
        console.error("Error completing pre-game Q:", err);
      }
    } else {
      setPreGameFeedback({
        isCorrect: false,
        message: `回答錯誤！(第 ${attempts} 次嘗試) 馬可常與什麼東西一起作決定呢？請再想想看！`,
      });
    }
  };

  // --- STATE 2: LEADER SELECTION SUBMIT ---
  const handleClaimLeader = async () => {
    if (!user?.accountId || typeof groupId !== "number") {
      alert("隊長登記失敗: 無法取得帳號 ID 或組別資訊");
      return;
    }

    if (currentGroupData?.leaderId) {
      alert("已經有人搶先成為隊長囉！");
      return;
    }

    if (submittingLeader) return;

    setSubmittingLeader(true);
    try {
      const groupDocRef = doc(db, "system", `dday_group_${groupId}`);

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupDocRef);
        const existingData = groupSnap.data();
        if (groupSnap.exists() && (existingData?.leaderId || existingData?.captainId)) {
          throw new Error("已經有人搶先成為隊長囉！");
        }

        transaction.set(
          groupDocRef,
          {
            leaderId: user.accountId,
            leaderName: user.nickname,
            groupId: groupId,
            qSolved: { ...(existingData?.qSolved || {}), q1: true },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });

      await setDoc(
        doc(db, "users", user.accountId),
        {
          isLeader: true,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error("Leader Registration Error:", err);
      alert(err?.message || "隊長登記失敗");
    } finally {
      setSubmittingLeader(false);
    }
  };

  // --- STATE 3: SEQUENTIAL QUESTION SUBMIT ---
  const handleSequentialQuestionSubmit = async (activeQ: GroupQuestion, e: React.FormEvent) => {
    e.preventDefault();
    const isLeader = currentGroupData.leaderId === user.accountId || user.isLeader === true;
    if (!isLeader) return;

    const answerValue = currentInput.trim();
    if (!answerValue) return;

    const currentAttempts = (currentGroupData.qAttempts?.[activeQ.qKey] || 0) + 1;
    const isAnswerCorrect =
      answerValue.replace(/\s+/g, "") === activeQ.correctAnswer.replace(/\s+/g, "");

    if (isAnswerCorrect) {
      const pointsEarned = currentAttempts === 1 ? 2 : currentAttempts === 2 ? 1 : 0;

      const updatedSolved = { ...(currentGroupData.qSolved || {}), [activeQ.qKey]: true };

      if (activeQ.qKey === "q1") updatedSolved["q2"] = true;
      if (activeQ.qKey === "q2") updatedSolved["q3"] = true;
      if (activeQ.qKey === "q3") updatedSolved["q4"] = true;
      if (activeQ.qKey === "q4") updatedSolved["q5"] = true;

      const updatedAttempts = { ...(currentGroupData.qAttempts || {}), [activeQ.qKey]: currentAttempts };
      const updatedScores = { ...(currentGroupData.qScores || {}), [activeQ.qKey]: pointsEarned };

      const newTotalScore = Object.values(updatedScores).reduce((acc, curr) => acc + curr, 0);

      setCurrentInput("");
      setQuestionFeedback({
        isCorrect: true,
        message: `回答正確！(+${pointsEarned} 分) 解鎖拼圖！`,
      });

      try {
        await setDoc(
          doc(db, "system", `dday_group_${groupId}`),
          {
            qSolved: updatedSolved,
            qAttempts: updatedAttempts,
            qScores: updatedScores,
            totalScore: newTotalScore,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to update question progress:", err);
      }
    } else {
      setQuestionFeedback({
        isCorrect: false,
        message: `回答錯誤！(第 ${currentAttempts} 次嘗試) 請再想想看！`,
      });

      try {
        await setDoc(
          doc(db, "system", `dday_group_${groupId}`),
          {
            qAttempts: { ...(currentGroupData.qAttempts || {}), [activeQ.qKey]: currentAttempts },
          },
          { merge: true }
        );
      } catch (err) {}
    }
  };

  // --- VERCEL BLOB PHOTO UPLOAD HANDLER FOR SECOND HALF ---
  const handleVercelBlobUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedUploadPiece || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "照片上傳失敗");
      }

      const { url } = await response.json();

      // 1. Record submission in /submissions
      await addDoc(collection(db, "submissions"), {
        accountId: user.accountId,
        nickname: user.nickname,
        groupId: groupId,
        pieceKey: selectedUploadPiece.qKey,
        pieceNumber: selectedUploadPiece.pieceNumber,
        imageUrl: url,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // 2. Update /system/dday_group_${groupId} with pending status
      const updatedSubmissions = {
        ...(currentGroupData.secondHalfSubmissions || {}),
        [selectedUploadPiece.qKey]: {
          imageUrl: url,
          status: "pending" as const,
          uploadedAt: new Date().toISOString(),
        },
      };

      await setDoc(
        doc(db, "system", `dday_group_${groupId}`),
        {
          secondHalfSubmissions: updatedSubmissions,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      alert("照片上傳成功！已送出至 GM 審核對列中。");
      setSelectedUploadPiece(null);
      setUploadFile(null);
      setUploadPreview(null);
    } catch (err: any) {
      console.error("Vercel Blob Upload error:", err);
      alert("照片上傳失敗: " + (err?.message || String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  const isUserLeader = currentGroupData.leaderId === user.accountId || user.isLeader === true;
  const locationPrompt = GROUP_LOCATIONS[groupId] || GROUP_LOCATIONS[1];
  const hasLeader = Boolean(currentGroupData.leaderId);

  // Determine active question to solve in sequence for First Half (Q1 -> Q2 -> Q3 -> Q4)
  const getActiveQuestion = (): GroupQuestion | null => {
    const groupQs = GROUP_QUESTIONS.filter((q) => q.groupId === groupId);
    const q1 = groupQs.find((q) => q.qKey === "q1");
    const q2 = groupQs.find((q) => q.qKey === "q2");
    const q3 = groupQs.find((q) => q.qKey === "q3");
    const q4 = groupQs.find((q) => q.qKey === "q4");

    if (!currentGroupData.qSolved?.q2) return q1 || null;
    if (!currentGroupData.qSolved?.q3) return q2 || null;
    if (!currentGroupData.qSolved?.q4) return q3 || null;
    if (!currentGroupData.qSolved?.q5) return q4 || null;
    return null;
  };

  const activeQuestion = getActiveQuestion();

  // Reset feedback and input whenever the active question key changes
  useEffect(() => {
    setQuestionFeedback(null);
    setCurrentInput("");
  }, [activeQuestion?.qKey]);

  if (!groupId || groupId === 0) {
    return (
      <div className="flex flex-col gap-6 font-bold select-none p-4 animate-fadeIn">
        <div className="bg-amber-100 border-4 border-black p-10 rounded text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
          <span className="font-black text-xl sm:text-2xl text-black tracking-wider">尚未分配組別，請聯絡 GM 設定您的所屬小隊。</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-bold select-none">
      {/* ========================================================================= */}
      {/* --- STATE 1: INSTRUCTIONS & PRE-GAME QUESTION (EVERYONE CAN ANSWER) --- */}
      {/* ========================================================================= */}
      {!isPreGameDone && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Instructions Banner */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 text-black font-black uppercase text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>任務說明 by 馬：</span>
            </div>
            <div className="bg-yellow-50 border-2 border-black p-4 rounded text-stone-900 leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-sm sm:text-base font-extrabold leading-relaxed mb-3">
                嗨嗨大家，謝謝你來，我收集了一些他可能會出現的地方，但有些資訊好像有點缺漏了，希望你們可以分頭去看看那些缺漏的部分是什麼，不過在那之前先跟你的組員坐下來跟一起吃個早餐討論對策吧！然後為了聯絡方便，你們決定好誰要當組長，就用他的手機點選吧！
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-amber-800 bg-amber-100 p-2.5 rounded border border-amber-400">
                喔對！你問我早餐在哪裡吃......這個嘛，先回答下面的問題吧！
              </p>
            </div>
          </div>

          {/* Pre-Game Question */}
          <div className="bg-amber-100 border-2 border-black p-4 sm:p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
            <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-black font-black uppercase flex items-center gap-1.5 text-base md:text-lg">
                <HelpCircle className="w-5 h-5 text-black" /> 
              </span>
              <p className="leading-relaxed text-stone-900 font-extrabold text-base sm:text-lg md:text-xl">
                Q: 要吃早餐囉！問，馬可常常與什麼東西一起作決定
              </p>
            </div>

            <form onSubmit={handlePreGameSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5">
                {[
                  { id: "a", text: "a: 小轉盤" },
                  { id: "b", text: "b: 小籤桶" },
                  { id: "c", text: "c: 小拇指" },
                  { id: "d", text: "d: 小方塊" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`border-2 border-black p-3.5 rounded flex items-center gap-3 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-none ${
                      preGameAnswer === opt.id
                        ? "bg-amber-300 text-black font-black"
                        : "bg-white text-stone-900 hover:bg-yellow-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dday-pregame"
                      value={opt.id}
                      checked={preGameAnswer === opt.id}
                      onChange={(e) => setPreGameAnswer(e.target.value)}
                      className="accent-black w-5 h-5 cursor-pointer shrink-0"
                    />
                    <span className="text-base sm:text-lg font-black">{opt.text}</span>
                  </label>
                ))}
              </div>

              {preGameFeedback && (
                <div
                  className={`p-3 border-2 border-black rounded text-base font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    preGameFeedback.isCorrect ? "bg-amber-300 text-black" : "bg-red-200 text-black"
                  }`}
                >
                  {preGameFeedback.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-black" />
                  ) : (
                    <Lock className="w-5 h-5 shrink-0 text-black" />
                  )}
                  <span>{preGameFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!preGameAnswer}
                className="w-full py-3.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
              >
                <Send className="w-5 h-5" />
                <span>送出答案</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- STATE 2: BREAKFAST LOCATION & LEADER SELECTION (PRE-GAME DONE) --- */}
      {/* ========================================================================= */}
      {isPreGameDone && !hasLeader && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Location Reveal Box */}
          <div className="bg-yellow-200 border-2 border-black p-4 sm:p-5 rounded text-black flex flex-col gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <Coffee className="w-6 h-6 text-black shrink-0" />
              <span className="font-black text-lg sm:text-xl uppercase text-black">
                【解鎖隊伍早餐會合點 (Group {groupId})】
              </span>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <MapPin className="w-7 h-7 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <p className="text-base sm:text-lg md:text-xl font-black text-black leading-relaxed">
                {locationPrompt}
              </p>
            </div>
          </div>

          {/* Leader Selection Box */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 rounded text-black flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2 text-black font-black uppercase text-base sm:text-lg">
                <Crown className="w-6 h-6 text-amber-500 shrink-0" />
                <span>【Group {groupId} 隊長選拔】</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-black text-stone-800 bg-yellow-100 border border-black px-2.5 py-0.5 rounded">
                <Users className="w-3.5 h-3.5" /> Group {groupId}
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-yellow-50 p-4 border-2 border-black rounded text-center">
              <p className="text-base sm:text-lg font-bold text-stone-900 leading-relaxed">
                目前小隊尚未選出隊長。前往早餐店會合後，請由一位成員自告奮勇點擊下方按鈕擔任隊長！
              </p>
              <button
                onClick={handleClaimLeader}
                disabled={submittingLeader}
                className="w-full py-4 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-black uppercase text-lg sm:text-xl rounded tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none disabled:opacity-50"
              >
                <Crown className="w-6 h-6 text-amber-600" />
                <span>{submittingLeader ? "隊長登記中..." : "我要當隊長"}</span>
              </button>
            </div>
          </div>

          {/* Progression Lock Banner */}
          <div className="p-4 bg-stone-900 border-2 border-black text-amber-400 rounded text-center font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span>🔒 解密拼圖矩陣與小隊關卡鎖定中：必須先選出小隊長才能解鎖進入！</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- STATE 3: PUZZLE CANVAS WITH TABBED PHASE NAVIGATION (上 / 下) --- */}
      {/* ========================================================================= */}
      {isPreGameDone && hasLeader && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Leader Status Banner */}
          <div className="bg-white border-2 border-black p-4 rounded text-black flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500 shrink-0" />
              {isUserLeader ? (
                <span className="font-black text-base sm:text-lg text-black">
                  👑 你是 Group {groupId} 的隊長！請帶領隊友依序破解關卡。
                </span>
              ) : (
                <span className="font-black text-base sm:text-lg text-black">
                  🔒 隊長【{currentGroupData.leaderName}】作答中... 請與隊友現場討論！
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-200 border border-black px-3 py-1 rounded shrink-0">
              <Trophy className="w-4 h-4 text-amber-700" /> 小隊總分: {currentGroupData.totalScore || 0} 分
            </div>
          </div>

          {/* TABBED INTERFACE HEADER: [上] (First Half 6x5) and [下] (Second Half 6x6) */}
          {isFirstHalfComplete && (hasClickedProceed || hasReadPhase2Instructions) && (
            <div className="flex flex-col gap-4">
              {/* MUTUAL Q&A GLOBAL BANNER */}
              {isPhase2Unlocked && mutualQaStep > 0 && mutualQaStep <= 6 && (
                <div className="bg-amber-100 border-2 border-black p-4 sm:p-6 rounded text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce-slow">
                  <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-2">【默契考驗 - 全域即時問答】</h3>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-black leading-snug">
                    {MUTUAL_QA_LIST[mutualQaStep]}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-stone-600 mt-3">
                    (請直接與現場 GM 進行作答，不須在系統輸入)
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 bg-amber-100 p-2 border-2 border-black rounded shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => setActivePhaseTab("first")}
                  className={`flex-1 py-3 px-4 rounded border-2 border-black font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-none cursor-pointer ${
                    activePhaseTab === "first"
                      ? "bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white text-stone-700 hover:bg-yellow-200"
                  }`}
                >
                  <Grid className="w-5 h-5 text-black" />
                  <span>【上】</span>
                </button>

                <button
                  onClick={() => setActivePhaseTab("second")}
                  className={`flex-1 py-3 px-4 rounded border-2 border-black font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-none cursor-pointer ${
                    activePhaseTab === "second"
                      ? "bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white text-stone-700 hover:bg-yellow-200"
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <span>【下】</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE B: Interstitial Screen (Phase 2 Unlocked but Instructions Not Read) */}
          {isPhase2Unlocked && !hasReadPhase2Instructions && (
            <div className="bg-white border-2 border-black p-6 sm:p-10 rounded text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-6 animate-fadeIn">
              <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-widest">⚠️ 系統提示 ⚠️</h2>
              <div className="bg-stone-100 border-2 border-black p-4 sm:p-6 rounded text-left shadow-inner">
                <p className="text-lg sm:text-xl font-bold text-stone-800 leading-relaxed">
                  蛤？你們找我？喔......等一下啦，我現在還被抓著，我也好想放假啊啊，那、那等一下啦，你們先去做別的事，做完再來找我啊，說不定到時候我就放假了
                </p>
              </div>
              <button
                onClick={() => {
                  setHasReadPhase2Instructions(true);
                  setActivePhaseTab("second");
                }}
                className="w-full sm:w-auto py-3 px-8 bg-amber-400 hover:bg-black hover:text-white border-2 border-black text-black font-black text-xl rounded uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-none"
              >
                我已了解，去「做別的事」
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* --- TAB 1: FIRST HALF (6x5 Grid, Pieces 1 to 15) --- */}
          {/* ========================================================================= */}
          {(!isPhase2Unlocked || hasReadPhase2Instructions) && activePhaseTab === "first" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* 6 Columns x 5 Rows Grid Canvas (Strict 1 to 15 Pieces) */}
              <div className="bg-stone-900 border-2 border-black p-4 sm:p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b-2 border-stone-700 pb-2 text-white">
                  <div className="flex items-center gap-2 font-black text-base sm:text-lg">
                    <Grid className="w-5 h-5 text-amber-400" />
                    <span>【拼圖收集情形】</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-stone-500 rounded-sm border border-white inline-block" /> 未解鎖
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-white rounded-sm border border-black inline-block" /> 已解鎖 (點擊播聲音)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 grid-rows-5 gap-1.5 sm:gap-2.5 bg-black p-2 sm:p-3 border-2 border-amber-500 rounded w-full aspect-[6/5] auto-rows-fr">
                  {GRID_PIECES.map((piece) => {
                    const groupState = allGroupsData[piece.groupId] || {};
                    const hasGroupLeader = Boolean(groupState.leaderId || groupState.captainId);
                    const isUnlocked =
                      groupState.qSolved?.[piece.qKey] === true ||
                      (hasGroupLeader && piece.qKey === "q1");

                    return (
                      <div
                        key={`piece-block-${piece.pieceNumber}`}
                        style={{
                          gridColumn: `${piece.colStart} / span ${piece.colSpan}`,
                          gridRow: `${piece.rowStart} / span ${piece.rowSpan}`,
                        }}
                        onClick={() => {
                          if (isUnlocked) {
                            playPieceAudio(piece.pieceNumber);
                          }
                        }}
                        className={`rounded flex flex-col items-center justify-center border-2 transition-all p-1 select-none ${
                          isUnlocked
                            ? "bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-amber-100 hover:scale-[1.02]"
                            : "bg-stone-700 border-stone-800 text-stone-400 shadow-inner opacity-90"
                        }`}
                      >
                        {isUnlocked ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-black">
                              {piece.pieceNumber}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-800 bg-amber-200 px-1 rounded flex items-center gap-0.5">
                              <Volume2 className="w-2.5 h-2.5" /> G{piece.groupId}-{piece.qKey.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 opacity-60">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" />
                            <span className="text-[10px] sm:text-xs font-mono font-black">
                              #{piece.pieceNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- MANDATORY LOCATION HINT POPUP MODAL (SHOW BEFORE REVEALING ANY QUESTION INCLUDING Q1) --- */}
              {activeQuestion && activeQuestion.hintNumber && !confirmedHints[activeQuestion.qKey] && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-amber-100 border-4 border-black p-6 rounded-lg max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xl font-black text-black border-b-2 border-black pb-3">
                      <MapPin className="w-7 h-7 text-amber-600 animate-bounce" />
                      <span>【前往下一個地點】</span>
                    </div>
                    <div className="bg-white border-2 border-black p-4 rounded shadow-inner flex flex-col gap-1">
                      <span className="text-sm font-bold text-stone-700">任務指示地點代碼</span>
                      <span className="text-4xl font-black text-amber-600 tracking-wider">
                        提示號碼：{activeQuestion.hintNumber}
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-stone-800 leading-relaxed">
                      請與隊友依據提示號碼【{activeQuestion.hintNumber}】尋找目標地點。到達現場後，點擊下方按鈕開啟題目！
                    </p>
                    <button
                      onClick={() =>
                        setConfirmedHints((prev) => ({ ...prev, [activeQuestion.qKey]: true }))
                      }
                      className="w-full py-3.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-black text-lg sm:text-xl rounded uppercase tracking-wider cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
                    >
                      OK / 我已抵達
                    </button>
                  </div>
                </div>
              )}

              {/* --- STRICT SEQUENTIAL QUESTION LOCK AREA (SHOW ONLY AFTER HINT CONFIRMED) --- */}
              <div className="flex flex-col gap-4">
                {isFirstHalfComplete && !hasClickedProceed && !hasReadPhase2Instructions ? (
                  /* All First Half questions completed banner */
                  <div className="bg-amber-200 border-2 border-black p-6 rounded text-center flex flex-col items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fadeIn">
                    <Trophy className="w-12 h-12 text-amber-700 animate-bounce" />
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-black">
                     Group {groupId} 部分已完成
                    </h3>
                    <p className="text-base font-extrabold text-stone-800">
                      第一階段總得分：<span className="text-amber-800 text-xl font-black">{currentGroupData.totalScore || 0}</span> 分！請點擊下方按鈕繼續......！
                    </p>
                    <button
                      onClick={() => {
                        setHasClickedProceed(true);
                        setActivePhaseTab("second");
                      }}
                      className="mt-2 py-3 px-6 bg-black text-amber-300 hover:bg-amber-300 hover:text-black border-2 border-black font-black text-lg rounded uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                       ➔
                    </button>
                  </div>
                ) : activeQuestion && (!activeQuestion.hintNumber || confirmedHints[activeQuestion.qKey]) ? (
                  /* Display ONLY the current active question after hint is confirmed */
                  <div className="bg-white border-2 border-black p-4 sm:p-5 rounded flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fadeIn">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-black">
                          【進行中關卡】{activeQuestion.title}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-stone-600">
                        嘗試次數: {currentGroupData.qAttempts?.[activeQuestion.qKey] || 0} 次
                      </span>
                    </div>

                    {/* Active Question Image Preview */}
                    {activeQuestion.image && (
                      <div className="w-full max-w-md mx-auto border-2 border-black rounded overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <img
                          src={activeQuestion.image}
                          alt={`Question ${activeQuestion.qKey} preview`}
                          className="w-full h-auto object-contain bg-stone-100"
                        />
                      </div>
                    )}

                    {/* Fill-in-the-blank Form */}
                    <form
                      onSubmit={(e) => handleSequentialQuestionSubmit(activeQuestion, e)}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-col gap-2 bg-yellow-50 p-4 border-2 border-black rounded">
                        <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-extrabold text-stone-900 leading-relaxed">
                          {activeQuestion.prefixText && <span>{activeQuestion.prefixText}</span>}
                          <input
                            type="text"
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            placeholder={isUserLeader ? "請輸入答案..." : "等待隊長作答中..."}
                            disabled={!isUserLeader}
                            className="bg-white border-2 border-black rounded px-3 py-2 text-base font-black text-black focus:outline-none focus:border-amber-500 min-w-[200px] flex-1 disabled:bg-stone-200"
                          />
                          {activeQuestion.suffixText && <span>{activeQuestion.suffixText}</span>}
                        </div>
                      </div>

                      {/* Feedback Alert */}
                      {questionFeedback && (
                        <div
                          className={`p-3 border-2 border-black rounded text-sm font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            questionFeedback.isCorrect ? "bg-amber-300 text-black" : "bg-red-200 text-black"
                          }`}
                        >
                          {questionFeedback.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0 text-black" />
                          ) : (
                            <Lock className="w-5 h-5 shrink-0 text-black" />
                          )}
                          <span>{questionFeedback.message}</span>
                        </div>
                      )}

                      {/* Submit Button (Leader Only) */}
                      <button
                        type="submit"
                        disabled={!currentInput || !isUserLeader}
                        className="w-full py-3.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-extrabold uppercase text-base sm:text-lg rounded tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
                      >
                        <Send className="w-5 h-5" />
                        <span>{isUserLeader ? "送出答案 (解鎖拼圖)" : "僅隊長可送出答案"}</span>
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* --- TAB 2: SECOND HALF (6x6 Grid, 18 Pieces, Vercel Blob Upload & GM Review) --- */}
          {/* ========================================================================= */}
          {(!isPhase2Unlocked || hasReadPhase2Instructions) && activePhaseTab === "second" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* 6 Columns x 6 Rows Grid Canvas (18 Pieces) */}
              <div className="bg-stone-900 border-2 border-black p-4 sm:p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b-2 border-stone-700 pb-2 text-white">
                  <div className="flex items-center gap-2 font-black text-base sm:text-lg">
                    <Grid className="w-5 h-5 text-amber-400" />
                    <span>【拼圖收集情形-下】</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-stone-500 rounded-sm border border-white inline-block" /> 未解鎖
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-amber-400 rounded-sm border border-black inline-block" /> 審核中
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-white rounded-sm border border-black inline-block" /> 通過 (點擊播音)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 grid-rows-6 gap-1.5 sm:gap-2.5 bg-black p-2 sm:p-3 border-2 border-amber-500 rounded w-full aspect-square auto-rows-fr">
                  {SECOND_HALF_GRID_PIECES.map((piece) => {
                    const groupState = allGroupsData[piece.groupId] || {};
                    const isUnlocked = groupState.qSolved?.[piece.qKey] === true;
                    const submission = groupState.secondHalfSubmissions?.[piece.qKey];
                    const isPending = submission?.status === "pending" && !isUnlocked;

                    const isActiveTask = groupState.activeTasks?.[piece.qKey] === true;

                    return (
                      <div
                        key={`second-piece-block-${piece.pieceNumber}`}
                        style={{
                          gridColumn: `${piece.colStart} / span ${piece.colSpan}`,
                          gridRow: `${piece.rowStart} / span ${piece.rowSpan}`,
                        }}
                        onClick={() => {
                          if (isUnlocked) {
                            playSecondHalfPieceAudio(piece.pieceNumber);
                          } else if (piece.groupId === groupId && piece.requiresUpload && isActiveTask && !isPending) {
                            setSelectedUploadPiece(piece);
                          }
                        }}
                        className={`rounded flex flex-col items-center justify-center border-2 transition-all p-1 select-none ${
                          isUnlocked
                            ? "bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-amber-100 hover:scale-[1.02]"
                            : isPending
                            ? "bg-amber-300 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                            : piece.groupId === groupId && piece.requiresUpload && isActiveTask
                            ? "bg-amber-100 border-amber-500 text-stone-900 cursor-pointer hover:bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-stone-700 border-stone-800 text-stone-400 shadow-inner opacity-90"
                        }`}
                      >
                        {isUnlocked ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-black">
                              {piece.pieceNumber}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-800 bg-amber-200 px-1 rounded flex items-center gap-0.5">
                              <Volume2 className="w-2.5 h-2.5" /> 通過！ (G{piece.groupId})
                            </span>
                          </div>
                        ) : isPending ? (
                          <div className="flex flex-col items-center justify-center gap-1 text-center">
                            <Clock className="w-5 h-5 text-amber-800 animate-spin" />
                            <span className="text-xs font-black text-amber-900">審核中...</span>
                          </div>
                        ) : piece.groupId === groupId && piece.requiresUpload && isActiveTask ? (
                          <div className="flex flex-col items-center justify-center gap-1 text-center">
                            <Camera className="w-5 h-5 text-amber-700" />
                            <span className="text-[10px] sm:text-xs font-extrabold text-black">
                              #{piece.pieceNumber} 上傳照片
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 opacity-60">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" />
                            <span className="text-[10px] sm:text-xs font-mono font-black">
                              #{piece.pieceNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VERCEL BLOB PHOTO UPLOAD MODAL FOR SECOND HALF TASKS */}
              {selectedUploadPiece && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-amber-100 border-4 border-black p-6 rounded-lg max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b-2 border-black pb-3">
                      <div className="flex items-center gap-2 text-xl font-black text-black">
                        <Camera className="w-6 h-6 text-amber-600" />
                        <span>【{selectedUploadPiece.title}】</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUploadPiece(null);
                          setUploadFile(null);
                          setUploadPreview(null);
                        }}
                        className="p-1 border border-black rounded hover:bg-black hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleVercelBlobUpload} className="flex flex-col gap-4">
                      <div className="bg-white border-2 border-black p-4 rounded text-stone-800 text-sm font-extrabold leading-relaxed">
                        請拍攝現場解密任務相片並進行上傳，提交後將由 GM 進行審核。審核通過即可解鎖地圖碎片 #{selectedUploadPiece.pieceNumber}！
                      </div>

                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-black bg-white p-6 rounded cursor-pointer hover:bg-yellow-50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadFile(file);
                              setUploadPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="hidden"
                          id="dday-photo-upload"
                        />
                        <label
                          htmlFor="dday-photo-upload"
                          className="flex flex-col items-center gap-2 cursor-pointer w-full text-center"
                        >
                          {uploadPreview ? (
                            <img
                              src={uploadPreview}
                              alt="Upload preview"
                              className="w-full max-h-48 object-contain rounded border border-black"
                            />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-amber-600" />
                              <span className="text-base font-black text-black">點擊選擇照片進行上傳</span>
                            </>
                          )}
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={!uploadFile || isUploading}
                        className="w-full py-3.5 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black font-black text-lg rounded uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-none"
                      >
                        <Upload className="w-5 h-5" />
                        <span>{isUploading ? "照片上傳中 (Vercel Blob)..." : "送出照片進行審核"}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
