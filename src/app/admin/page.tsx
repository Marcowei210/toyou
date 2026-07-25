"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ShieldAlert,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Radio,
  Award,
  Crown,
  Send,
  Plus,
  ArrowLeft,
  Terminal,
  Activity,
  Layers,
  Calendar,
  Megaphone,
  Trash2,
} from "lucide-react";
import BroadcastBanner from "@/components/BroadcastBanner";

// Types
interface UserDoc {
  accountId: string;
  nickname: string;
  score: number;
  avatarUrl?: string;
  team?: string;
  isLeader?: boolean;
  role?: string;
}

interface MessageDoc {
  id: string;
  authorId: string;
  text: string;
  assignedTo?: string;
  status?: string;
  createdAt: string;
}

interface SubmissionDoc {
  id: string;
  accountId: string;
  imageUrl?: string;
  note: string;
  day?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface SystemGameState {
  phase?: string;
  currentDay?: string;
  event?: string;
  broadcast?: string;
  broadcastTime?: string;
}

export default function AdminDashboard() {
  const { user, loading, toggleHostRole } = useAuth();
  const router = useRouter();

  // Active Tab: "users" | "messages" | "queue" | "system"
  const [activeTab, setActiveTab] = useState<"users" | "messages" | "queue" | "system">("users");

  // Panel Data Collections
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [messagesList, setMessagesList] = useState<MessageDoc[]>([]);
  const [submissionsList, setSubmissionsList] = useState<SubmissionDoc[]>([]);
  const [gameState, setGameState] = useState<SystemGameState>({});

  // Local score input state for fluid typing without onSnapshot resets
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});

  // Synchronize scoreInputs when usersList loads or updates
  useEffect(() => {
    setScoreInputs((prev) => {
      const updated = { ...prev };
      usersList.forEach((u) => {
        if (updated[u.accountId] === undefined) {
          updated[u.accountId] = String(u.score || 0);
        }
      });
      return updated;
    });
  }, [usersList]);

  // Input states for triggers
  const [broadcastText, setBroadcastText] = useState("");
  const [customPhase, setCustomPhase] = useState("");
  const [customEvent, setCustomEvent] = useState("");

  // Route Protection Check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } else if (user.role !== "host") {
        // Redirect non-hosts back to main dashboard
        router.push("/");
      }
    }
  }, [user, loading, router]);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!user || user.role !== "host") return;

    // 1. Fetch all users
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const docs: UserDoc[] = [];
        snapshot.forEach((d) => docs.push(d.data() as UserDoc));
        setUsersList(docs);
      },
      (err) => console.warn("Admin Users listener warning:", err)
    );

    // Fetch all secret worries from /worries collection
    const unsubWorries = onSnapshot(
      collection(db, "worries"),
      (snapshot) => {
        const docs: MessageDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          docs.push({
            id: d.id,
            authorId: data.authorId || "anonymous",
            text: data.worryText || data.text || "",
            assignedTo: data.assignedTo || "",
            status: data.replyText ? "replied" : data.assignedTo ? "assigned" : "unassigned",
            createdAt: data.createdAt || new Date().toISOString(),
          } as MessageDoc);
        });
        setMessagesList(docs);
      },
      (err) => console.warn("Admin Worries listener warning:", err)
    );

    // 3. Fetch all puzzle/evidence submissions
    const unsubSubmissions = onSnapshot(
      collection(db, "submissions"),
      (snapshot) => {
        const docs: SubmissionDoc[] = [];
        snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() } as SubmissionDoc));
        setSubmissionsList(docs);
      },
      (err) => console.warn("Admin Submissions listener warning:", err)
    );

    // 4. Fetch global system state
    const unsubSystem = onSnapshot(
      doc(db, "system", "gameState"),
      (snapshot) => {
        if (snapshot.exists()) {
          setGameState(snapshot.data() as SystemGameState);
        }
      },
      (err) => console.warn("Admin System listener warning:", err)
    );

    return () => {
      unsubUsers();
      unsubWorries();
      unsubSubmissions();
      unsubSystem();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] text-[#1c1917] flex flex-col items-center justify-center font-bold">
        <Activity className="w-10 h-10 text-amber-700 animate-spin mb-4" />
        <span className="text-sm font-bold uppercase tracking-widest text-stone-700 animate-pulse">
          Authenticating GM Clearance level...
        </span>
      </div>
    );
  }

  if (!user || user.role !== "host") {
    return (
      <div className="min-h-screen bg-[#F4F1EA] text-red-600 p-8 flex flex-col items-center justify-center font-bold gap-4">
        <ShieldAlert className="w-12 h-12 animate-bounce" />
        <h1 className="text-lg uppercase font-bold tracking-widest">
          ACCESS DENIED // HOST CLEARANCE REQUIRED
        </h1>
        <p className="text-xs text-stone-700">Redirecting to public area...</p>
      </div>
    );
  }

  // --- PANEL A HANDLERS ---
  const handleUpdateUser = async (accountId: string, updates: Partial<UserDoc>) => {
    try {
      await updateDoc(doc(db, "users", accountId), updates);
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Failed to update user.");
    }
  };

  // --- PANEL B HANDLERS ---
  const handleAssignMessage = async (messageId: string, targetAccountId: string) => {
    try {
      // Try updating in worries collection first, fallback to messages
      try {
        await updateDoc(doc(db, "worries", messageId), {
          assignedTo: targetAccountId,
          status: "assigned",
          assignedAt: new Date().toISOString(),
        });
      } catch (e) {
        await updateDoc(doc(db, "messages", messageId), {
          assignedTo: targetAccountId,
          status: "assigned",
          assignedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to assign message:", err);
      alert("Failed to assign message.");
    }
  };

  const handleUpdateCurrentDay = async (newDay: string) => {
    try {
      await setDoc(
        doc(db, "system", "gameState"),
        {
          currentDay: newDay,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to update current day:", err);
      alert("Failed to update Day Stage.");
    }
  };

  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    await setDoc(doc(db, "system", "gameState"), {
      broadcast: broadcastText.trim(),
      broadcastTime: new Date().toISOString(),
    });
    setBroadcastText("");
  };

  const handleCreateSampleMessage = async () => {
    try {
      await addDoc(collection(db, "worries"), {
        authorId: user.accountId,
        worryText: "Sample Secret Worry: Who leaked the classified case documents?",
        replyText: "",
        assignedTo: "",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to create sample worry:", err);
    }
  };

  // --- PANEL C HANDLERS ---
  const handleReviewSubmission = async (
    submission: SubmissionDoc,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateDoc(doc(db, "submissions", submission.id), { status });
    } catch (err) {
      console.error("Failed to review submission:", err);
    }
  };

  const handleApproveAndPostToBoard = async (submission: SubmissionDoc) => {
    try {
      // 1. Mark submission as approved
      await updateDoc(doc(db, "submissions", submission.id), { status: "approved" });

      // 2. Write new document to /bulletin collection as Anonymous Agent
      await addDoc(collection(db, "bulletin"), {
        authorId: "anonymous",
        authorName: "Anonymous Agent",
        avatarUrl: "",
        text: submission.note || "Approved photo evidence file.",
        imageUrl: submission.imageUrl,
        day: submission.day || "D-5",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to approve and post to bulletin board:", err);
      alert("Failed to approve and post to board.");
    }
  };

  const handleDeleteWorry = async (messageId: string) => {
    try {
      try {
        await deleteDoc(doc(db, "worries", messageId));
      } catch (e) {
        await deleteDoc(doc(db, "messages", messageId));
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
      alert("Failed to delete entry.");
    }
  };

  const handleDismissSubmission = async (submissionId: string) => {
    try {
      await deleteDoc(doc(db, "submissions", submissionId));
    } catch (err) {
      console.error("Failed to dismiss submission:", err);
      alert("Failed to dismiss submission from queue.");
    }
  };

  const handleCreateSampleSubmission = async () => {
    try {
      await addDoc(collection(db, "submissions"), {
        accountId: user.accountId,
        note: "Decoded Puzzle Fragment #4",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to create sample submission:", err);
    }
  };

  // --- PANEL D HANDLERS ---
  const handleSetGameState = async (updates: Partial<SystemGameState>) => {
    try {
      await setDoc(doc(db, "system", "gameState"), updates, { merge: true });
    } catch (err) {
      console.error("Failed to update system game state:", err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    await handleSetGameState({
      broadcast: broadcastText.trim(),
      broadcastTime: new Date().toISOString(),
    });
    setBroadcastText("");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0c] text-[#e6e0d4] font-mono flex flex-col select-none typewriter-fade">
      {/* Broadcast Ticker Bar */}
      <BroadcastBanner />

      {/* GM Top Navigation Control Bar */}
      <header className="bg-[#1b1a18] border-b border-[#38342e] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 border border-[#38342e] hover:border-amber-500 text-[#8e8576] hover:text-amber-500 rounded transition-colors cursor-pointer"
            title="Return to Main Agency view"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500 animate-pulse" />
            <h1 className="text-base font-bold uppercase tracking-widest text-amber-500">
              Agency HQ // GM "God Mode" Control Center
            </h1>
          </div>
        </div>

        {/* Host Clearance Badge & Host Role Switcher for Dev */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-600/60 px-3 py-1 rounded">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Host Clearance Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Command Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Navigation Control Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#38342e] pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs uppercase font-bold tracking-widest rounded border flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "border-amber-500 bg-amber-950/30 text-amber-500"
                : "border-[#38342e] bg-[#1b1a18] text-[#8e8576] hover:text-[#e6e0d4]"
            }`}
          >
            <Users className="w-4 h-4" /> Panel A: User Management ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-2 text-xs uppercase font-bold tracking-widest rounded border flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "messages"
                ? "border-amber-500 bg-amber-950/30 text-amber-500"
                : "border-[#38342e] bg-[#1b1a18] text-[#8e8576] hover:text-[#e6e0d4]"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Panel B: Message Routing ({messagesList.length})
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 text-xs uppercase font-bold tracking-widest rounded border flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "queue"
                ? "border-amber-500 bg-amber-950/30 text-amber-500"
                : "border-[#38342e] bg-[#1b1a18] text-[#8e8576] hover:text-[#e6e0d4]"
            }`}
          >
            <Layers className="w-4 h-4" /> Panel C: Approval Queue ({submissionsList.filter(s => s.status === 'pending').length})
          </button>
        </div>

        {/* PANEL A: USER MANAGEMENT & GLOBAL CONTROLS */}
        {activeTab === "users" && (
          <div className="bg-[#1b1a18] border border-[#38342e] p-6 rounded-sm flex flex-col gap-6">
            
            {/* Global Controls: Day Selector & System Broadcast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#38342e]">
              {/* Day Stage Control Selector */}
              <div className="flex flex-col gap-2 bg-[#24221f] border border-amber-800/60 p-4 rounded">
                <label className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" /> Control Game Flow: Set Current Day Stage
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    value={gameState.currentDay || "D-7"}
                    onChange={(e) => handleSetGameState({ currentDay: e.target.value })}
                    className="bg-[#1b1a18] border border-amber-600 rounded px-4 py-2 text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="D-7">D-7 (Music Recommendation - 2 Inputs)</option>
                    <option value="D-6">D-6 (Detective Trivia - 4 Radio Choices)</option>
                    <option value="D-5">D-5 (Photo Upload File)</option>
                    <option value="D-4">D-4 (Board Post Directive)</option>
                    <option value="D-3">D-3 (Secret Worry Bottle)</option>
                    <option value="D-2">D-2 (Assigned Worry Reply & General Question)</option>
                    <option value="D-1">D-1 (Received Bottle Letter & Mission Briefing)</option>
                  </select>
                  <span className="text-[10px] text-[#8e8576]">
                    Instantly updates player dashboard to the selected day stage.
                  </span>
                </div>
              </div>

              {/* System Broadcast Message Sender */}
              <form onSubmit={handleSendBroadcast} className="flex flex-col gap-2 bg-[#24221f] border border-[#38342e] p-4 rounded">
                <label htmlFor="broadcast-msg" className="text-xs uppercase text-amber-500 font-bold flex items-center gap-1.5">
                  <Send className="w-4 h-4" /> Send System Broadcast Message
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="broadcast-msg"
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Type urgent broadcast message to display to all players..."
                    className="flex-1 bg-[#1b1a18] border border-[#38342e] rounded px-3 py-2 text-xs text-[#e6e0d4] placeholder-[#8e8576] focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase text-xs rounded tracking-wider transition-colors cursor-pointer shrink-0"
                  >
                    Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGameState({ broadcast: "", broadcastTime: "" })}
                    className="px-2.5 py-2 border border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs rounded font-bold uppercase cursor-pointer transition-colors shrink-0"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between border-b border-[#38342e] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Real-time Roster & Attribute Editing
              </h2>
              <span className="text-xs text-[#8e8576]">
                Changes write directly to Firestore in real-time
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#38342e] text-[#8e8576] uppercase">
                    <th className="p-3">Agent ID</th>
                    <th className="p-3">Alias</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Role / Leader</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262421]">
                  {usersList.map((u) => (
                    <tr key={u.accountId} className="hover:bg-[#24221f] transition-colors">
                      {/* Account ID */}
                      <td className="p-3 font-bold text-amber-500">{u.accountId}</td>

                      {/* Nickname */}
                      <td className="p-3 text-[#e6e0d4]">{u.nickname}</td>

                      {/* Score Inline Editor */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={scoreInputs[u.accountId] !== undefined ? scoreInputs[u.accountId] : (u.score || 0)}
                            onChange={(e) => {
                              setScoreInputs({ ...scoreInputs, [u.accountId]: e.target.value });
                            }}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (!isNaN(val)) {
                                handleUpdateUser(u.accountId, { score: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = Number((e.target as HTMLInputElement).value);
                                if (!isNaN(val)) {
                                  handleUpdateUser(u.accountId, { score: val });
                                  (e.target as HTMLInputElement).blur();
                                }
                              }
                            }}
                            className="w-20 bg-[#262421] border border-[#38342e] rounded px-2 py-1 text-xs text-amber-500 font-bold focus:outline-none focus:border-amber-500"
                            placeholder="0"
                          />
                          <button
                            onClick={() => {
                              const current = Number(scoreInputs[u.accountId] ?? u.score ?? 0);
                              const updatedScore = current + 10;
                              setScoreInputs({ ...scoreInputs, [u.accountId]: String(updatedScore) });
                              handleUpdateUser(u.accountId, { score: updatedScore });
                            }}
                            className="px-1.5 py-0.5 border border-[#38342e] hover:border-amber-500 text-[10px] rounded cursor-pointer transition-colors"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Team Selector */}
                      <td className="p-3">
                        <select
                          value={u.team || "Unassigned"}
                          onChange={(e) =>
                            handleUpdateUser(u.accountId, { team: e.target.value })
                          }
                          className="bg-[#262421] border border-[#38342e] rounded px-2 py-1 text-xs text-[#e6e0d4] focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="Unassigned">Unassigned</option>
                          <option value="Team 1">Team 1</option>
                          <option value="Team 2">Team 2</option>
                          <option value="Team 3">Team 3</option>
                        </select>
                      </td>

                      {/* Leader Toggle & Role */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateUser(u.accountId, { isLeader: !u.isLeader })
                            }
                            className={`px-2 py-1 text-[10px] rounded border uppercase font-bold transition-all cursor-pointer ${
                              u.isLeader
                                ? "border-amber-500 bg-amber-950/40 text-amber-400"
                                : "border-[#38342e] bg-[#262421] text-[#8e8576]"
                            }`}
                          >
                            {u.isLeader ? "★ Team Leader" : "Member"}
                          </button>

                          <span className="text-[10px] text-[#8e8576] uppercase">
                            ({u.role || "player"})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL B: MESSAGE ROUTING */}
        {activeTab === "messages" && (
          <div className="bg-[#1b1a18] border border-[#38342e] p-6 rounded-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#38342e] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Secret Worries & Message Routing
              </h2>
              <button
                onClick={handleCreateSampleMessage}
                className="px-3 py-1 border border-amber-600 bg-amber-950/20 text-amber-500 hover:bg-amber-600 hover:text-black text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Test Secret Worry
              </button>
            </div>

            {messagesList.length === 0 ? (
              <p className="text-xs text-[#8e8576] italic py-8 text-center">
                No secret worries currently logged in the message queue.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {messagesList.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#24221f] border border-[#38342e] p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-500">
                          Author: {m.authorId}
                        </span>
                        <span className="text-[10px] text-[#8e8576]">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#e6e0d4] italic bg-[#1b1a18] p-2 border border-[#38342e] rounded">
                        "{m.text}"
                      </p>
                    </div>

                    {/* Routing Assignee Selector & Delete Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#8e8576]">Assign Reply To:</span>
                      <select
                        value={m.assignedTo || ""}
                        onChange={(e) => handleAssignMessage(m.id, e.target.value)}
                        className="bg-[#1b1a18] border border-[#38342e] rounded px-3 py-1.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">-- Select Detective --</option>
                        {usersList.map((u) => (
                          <option key={u.accountId} value={u.accountId}>
                            {u.accountId} ({u.nickname})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDeleteWorry(m.id)}
                        className="p-1.5 border border-red-900/60 hover:border-red-500 bg-red-950/40 text-red-400 hover:text-red-200 rounded transition-colors cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL C: MANUAL APPROVAL QUEUE */}
        {activeTab === "queue" && (
          <div className="bg-[#1b1a18] border border-[#38342e] p-6 rounded-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#38342e] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Evidence & Puzzle Approval Queue
              </h2>
              <button
                onClick={handleCreateSampleSubmission}
                className="px-3 py-1 border border-amber-600 bg-amber-950/20 text-amber-500 hover:bg-amber-600 hover:text-black text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Submit Test Puzzle Evidence
              </button>
            </div>

            {submissionsList.length === 0 ? (
              <p className="text-xs text-[#8e8576] italic py-8 text-center">
                Approval queue is clear. No pending evidence or puzzle submissions.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissionsList.map((sub) => (
                  <div
                    key={sub.id}
                    className={`bg-[#24221f] border p-4 rounded flex flex-col gap-3 relative ${
                      sub.status === "approved"
                        ? "border-emerald-900/60"
                        : sub.status === "rejected"
                        ? "border-red-900/60"
                        : "border-amber-600/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-500">
                        Agent: {sub.accountId}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          sub.status === "approved"
                            ? "bg-emerald-950/40 border-emerald-600 text-emerald-400"
                            : sub.status === "rejected"
                            ? "bg-red-950/40 border-red-600 text-red-400"
                            : "bg-amber-950/40 border-amber-600 text-amber-400 animate-pulse"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#e6e0d4] bg-[#1b1a18] p-2 border border-[#38342e] rounded">
                      "{sub.note}"
                    </p>

                    {sub.imageUrl && (
                      <div className="w-full h-40 bg-black rounded overflow-hidden border border-[#38342e]">
                        <img
                          src={sub.imageUrl}
                          alt="Submission"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {sub.status === "pending" && (
                      <div className="flex flex-col gap-2 mt-2">
                        {sub.imageUrl ? (
                          <button
                            onClick={() => handleApproveAndPostToBoard(sub)}
                            className="w-full py-1.5 border border-amber-600 bg-amber-950/40 hover:bg-amber-600 hover:text-black text-amber-400 rounded text-xs font-bold uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Approve and publish photo anonymously to Agency Bulletin Board"
                          >
                            <Megaphone className="w-3.5 h-3.5" /> Approve & Post to Board (Anonymous)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReviewSubmission(sub, "approved")}
                            className="w-full py-1.5 border border-emerald-600 bg-emerald-950/30 hover:bg-emerald-600 hover:text-black text-emerald-400 rounded text-xs font-bold uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}

                        <button
                          onClick={() => handleReviewSubmission(sub, "rejected")}
                          className="w-full py-1.5 border border-red-600 bg-red-950/30 hover:bg-red-600 hover:text-white text-red-400 rounded text-xs font-bold uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {/* Functional Delete / Dismiss button for ALL items in queue */}
                    <button
                      onClick={() => handleDismissSubmission(sub.id)}
                      className="w-full mt-2 py-1 px-3 border border-[#38342e] hover:border-red-600/80 bg-[#1b1a18] text-[#8e8576] hover:text-red-400 rounded text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Delete / Dismiss from Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete / Dismiss from Queue
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
