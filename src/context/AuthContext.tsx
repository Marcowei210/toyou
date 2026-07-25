"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { signInAnonymously, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

export interface DetectiveUser {
  accountId: string;
  nickname: string;
  score: number;
  avatarUrl: string;
  role?: string;
  team?: string;
  isLeader?: boolean;
  completedTasks?: string[];
  d5UploadCount?: number;
  d6Attempts?: number;
}

interface AuthContextType {
  user: DetectiveUser | null;
  loading: boolean;
  login: (accountId: string, password: string) => Promise<void>;
  register: (accountId: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  updateScore: (increment: number) => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
  toggleHostRole: () => Promise<void>;
  completeTaskAndReward: (taskId: string, rewardPoints: number) => Promise<void>;
  recordD6Attempt: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DetectiveUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  const logout = () => {
    try {
      localStorage.removeItem("detectiveAccountId");
    } catch (e) {
      console.warn("Failed to clear localStorage session:", e);
    }
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      setUnsubscribeSnapshot(null);
    }
    try {
      signOut(auth);
    } catch (e) {
      console.warn("Failed to sign out of Firebase auth:", e);
    }
    setUser(null);
    setLoading(false);
  };

  // Set up real-time listener for the user's Firestore document
  const setupRealtimeListener = (accountId: string) => {
    // Clean up existing listener if any
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    const docRef = doc(db, "users", accountId);
    const unsub = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const currentScore = data.score || 0;
          
          const updatedUser: DetectiveUser = {
            accountId: data.accountId || accountId,
            nickname: data.nickname || "Detective",
            score: currentScore,
            avatarUrl: data.avatarUrl || "",
            role: data.role || "player",
            team: data.team || "Unassigned",
            isLeader: !!data.isLeader,
            completedTasks: Array.isArray(data.completedTasks) ? data.completedTasks : [],
            d5UploadCount: typeof data.d5UploadCount === "number" ? data.d5UploadCount : 0,
            d6Attempts: typeof data.d6Attempts === "number" ? data.d6Attempts : 0,
          };
          
          setUser(updatedUser);
        } else {
          // Document was wiped or doesn't exist (e.g. emulator restart)
          console.warn(`User document for ${accountId} not found. Clearing session.`);
          logout();
        }
        setLoading(false);
      },
      (error) => {
        // Handle permission-denied or network errors gracefully by logging out
        console.error("Firestore onSnapshot error, auto-resetting session:", error);
        logout();
      }
    );

    setUnsubscribeSnapshot(() => unsub);
  };

  // Check for persisted session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const savedAccountId = localStorage.getItem("detectiveAccountId");
        if (savedAccountId) {
          // Authenticate connection anonymously for firestore rules safety
          try {
            await signInAnonymously(auth);
          } catch (authErr) {
            console.warn("Anonymous authentication warning:", authErr);
          }
          setupRealtimeListener(savedAccountId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err);
        logout();
      }
    };

    initSession();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async (accountId: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Authenticate anonymously on client
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Anonymous auth failed on login:", e);
    }

    // Save session locally
    localStorage.setItem("detectiveAccountId", accountId);

    // Bind real-time Firestore updates
    setupRealtimeListener(accountId);
  };

  const register = async (accountId: string, password: string, nickname: string) => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, password, nickname }),
    });

    const data = await res.json();
    if (!res.ok) {
      // STOP execution immediately if API returns non-200 OK
      throw new Error(data.error || "Registration failed. Account ID may already be taken.");
    }

    // ONLY after 200 OK response from API, sign in anonymously and set up session
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Anonymous auth warning after registration:", e);
    }

    // Save session locally
    localStorage.setItem("detectiveAccountId", accountId);

    // Bind real-time Firestore updates
    setupRealtimeListener(accountId);
  };

  const updateScore = async (increment: number) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.accountId);
      await updateDoc(docRef, {
        score: user.score + increment,
      });
    } catch (err) {
      console.error("Failed to update score in real-time:", err);
      throw err;
    }
  };

  const updateAvatar = async (url: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.accountId);
      await updateDoc(docRef, {
        avatarUrl: url,
      });
    } catch (err) {
      console.error("Failed to update avatar in real-time:", err);
      throw err;
    }
  };

  const toggleHostRole = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.accountId);
      const nextRole = user.role === "host" ? "player" : "host";
      await updateDoc(docRef, { role: nextRole });
    } catch (err) {
      console.error("Failed to toggle host role:", err);
      throw err;
    }
  };

  const completeTaskAndReward = async (taskId: string, rewardPoints: number) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.accountId);
      const currentCompleted = user.completedTasks || [];
      const alreadyCompleted = currentCompleted.includes(taskId);

      const updates: any = {};
      if (!alreadyCompleted) {
        updates.completedTasks = [...currentCompleted, taskId];
      }

      if (rewardPoints > 0) {
        updates.score = (user.score || 0) + rewardPoints;
      }

      if (taskId === "D-5") {
        const currentCount = user.d5UploadCount || 0;
        updates.d5UploadCount = currentCount + 1;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, updates);
      }
    } catch (err) {
      console.error("Failed to complete task and reward points:", err);
      throw err;
    }
  };

  const recordD6Attempt = async (): Promise<number> => {
    if (!user) return 0;
    try {
      const docRef = doc(db, "users", user.accountId);
      const currentAttempts = user.d6Attempts || 0;
      const newAttempts = currentAttempts + 1;
      await updateDoc(docRef, { d6Attempts: newAttempts });
      return newAttempts;
    } catch (err) {
      console.error("Failed to record D6 attempt:", err);
      return (user.d6Attempts || 0) + 1;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateScore,
        updateAvatar,
        toggleHostRole,
        completeTaskAndReward,
        recordD6Attempt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
