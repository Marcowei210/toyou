"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-dismiss errorMsg after 3000ms (3 seconds)
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Form states
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!nickname.trim()) {
          throw new Error("請輸入名字 (10字以內)");
        }
        await register(accountId, password, nickname);
      } else {
        await login(accountId, password);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      if (!isRegister) {
        // Login failed: set exact error message and automatically toggle to Register mode
        setErrorMsg("沒有這個使用者");
        setIsRegister(true);
      } else {
        setErrorMsg(err.message || "註冊失敗，請重試。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 relative font-sans select-none overflow-hidden">
      {/* Outer Paper Container strictly matching pdf_page-1.png and pdf_page-2.png */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[360px] sm:max-w-[390px] aspect-[390/640] mx-auto bg-[url('/login.png')] bg-[length:100%_100%] bg-no-repeat bg-center shadow-2xl transition-all duration-300 select-none overflow-visible"
      >
        {/* Top Toast Logo Badge (Circular image with orange border overlapping paper top edge) */}
        <img
          src="/icon_toast.jpg"
          alt="Toast Logo"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-amber-500 object-cover absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none shadow-md"
        />

        {/* 2-Line Header Title (Matches pdf_page-1.png & pdf_page-2.png) */}
        <div className="absolute top-[16%] left-[22%] right-[6%] text-stone-900 font-extrabold text-xl sm:text-2xl tracking-wider leading-snug z-10">
          <div>吐吐吐吐遊遊遊遊</div>
          <div>之居然第四屆了</div>
        </div>

        {/* Error Alert Display with Smooth Fade-Out */}
        <div
          className={`absolute top-[28%] left-[22%] right-[6%] text-red-600 font-bold text-xs text-center bg-red-100/90 p-1 rounded border border-red-300 z-30 shadow-sm transition-opacity duration-500 ${
            errorMsg ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {errorMsg}
        </div>

        {/* --- PAGE 1: LOGIN MODE (pdf_page-1.png) --- */}
        {!isRegister ? (
          <>
            {/* Input 1: Account ID */}
            <div className="absolute top-[35%] left-[22%] right-[6%] flex items-baseline gap-1 text-stone-900 font-bold text-sm sm:text-base z-10">
              <span className="shrink-0 font-extrabold text-stone-950 text-base sm:text-lg">帳號:</span>
              <input
                type="text"
                id="account-id"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                pattern="^[a-zA-Z0-9]{4,10}$"
                minLength={4}
                maxLength={10}
                required
                placeholder="(ID, 4~10碼英數組合)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-stone-900 placeholder:text-stone-400 font-semibold text-xs sm:text-sm p-0 m-0"
              />
            </div>

            {/* Input 2: Password */}
            <div className="absolute top-[49%] left-[22%] right-[6%] flex items-baseline gap-1 text-stone-900 font-bold text-sm sm:text-base z-10">
              <span className="shrink-0 font-extrabold text-stone-950 text-base sm:text-lg">密碼:</span>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                pattern="^[a-zA-Z0-9!\-=+?*$]{4,10}$"
                minLength={4}
                maxLength={10}
                required
                placeholder="(ID, 4~10碼英數或特殊符號!-=+?*$組合)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-stone-900 placeholder:text-stone-400 font-semibold text-xs sm:text-sm p-0 m-0"
              />
            </div>

            {/* Hand-Drawn Wavy Oval Cloud Confirmation Button ("確認") */}
            <button
              type="submit"
              disabled={loading}
              className="absolute top-[63%] left-1/2 -translate-x-1/2 border-2 border-stone-900 bg-white/95 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] px-10 sm:px-12 py-1.5 text-stone-950 font-extrabold text-lg sm:text-xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 z-20 flex items-center justify-center"
            >
              {loading ? "處理中..." : "確認"}
            </button>

            {/* Toggle Text at Bottom */}
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMsg("");
              }}
              className="absolute top-[75%] left-0 right-0 text-center text-stone-800 hover:text-stone-950 font-extrabold text-base sm:text-lg tracking-wider transition-colors cursor-pointer z-10 leading-snug"
            >
              <div>還沒註冊過?</div>
              <div>點這裡註冊</div>
            </button>
          </>
        ) : (
          /* --- PAGE 2: REGISTER MODE (pdf_page-2.png) --- */
          <>
            {/* Input 1: Account ID */}
            <div className="absolute top-[33%] left-[22%] right-[6%] flex items-baseline gap-1 text-stone-900 font-bold text-sm sm:text-base z-10">
              <span className="shrink-0 font-extrabold text-stone-950 text-base sm:text-lg">帳號:</span>
              <input
                type="text"
                id="account-id"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                pattern="^[a-zA-Z0-9]{4,10}$"
                minLength={4}
                maxLength={10}
                required
                placeholder="(4~10碼英數組合, 就是登入用的ID)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-stone-900 placeholder:text-stone-400 font-semibold text-xs sm:text-sm p-0 m-0"
              />
            </div>

            {/* Input 2: Password */}
            <div className="absolute top-[44%] left-[22%] right-[6%] flex items-baseline gap-1 text-stone-900 font-bold text-sm sm:text-base z-10">
              <span className="shrink-0 font-extrabold text-stone-950 text-base sm:text-lg">密碼:</span>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                pattern="^[a-zA-Z0-9!\-=+?*$]{4,10}$"
                minLength={4}
                maxLength={10}
                required
                placeholder="(ID, 4~10碼英數或特殊符號!-=+?*$組合)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-stone-900 placeholder:text-stone-400 font-semibold text-xs sm:text-sm p-0 m-0"
              />
            </div>

            {/* Input 3: Nickname */}
            <div className="absolute top-[55%] left-[22%] right-[6%] flex items-baseline gap-1 text-stone-900 font-bold text-sm sm:text-base z-10">
              <span className="shrink-0 font-extrabold text-stone-950 text-base sm:text-lg">名字:</span>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={1}
                maxLength={10}
                required={isRegister}
                placeholder="(10字以內, 就是呈現的名字啦)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 text-stone-900 placeholder:text-stone-400 font-semibold text-xs sm:text-sm p-0 m-0"
              />
            </div>

            {/* Hand-Drawn Wavy Oval Cloud Confirmation Button ("確認") */}
            <button
              type="submit"
              disabled={loading}
              className="absolute top-[67%] left-1/2 -translate-x-1/2 border-2 border-stone-900 bg-white/95 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] px-10 sm:px-12 py-1.5 text-stone-950 font-extrabold text-lg sm:text-xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 z-20 flex items-center justify-center"
            >
              {loading ? "處理中..." : "確認"}
            </button>

            {/* Toggle Text at Bottom */}
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMsg("");
              }}
              className="absolute top-[78%] left-0 right-0 text-center text-stone-800 hover:text-stone-950 font-extrabold text-base sm:text-lg tracking-wider transition-colors cursor-pointer z-10 leading-snug"
            >
              <div>已經註冊過?</div>
              <div>點這裡登入</div>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
