"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Paintbrush, Eraser, Trash2, UploadCloud, Sparkles, Check } from "lucide-react";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  isForced?: boolean;
}

// EXACT 8 Required Colors
const PALETTE_COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Black", hex: "#000000" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#a855f7" },
  { name: "White", hex: "#ffffff" },
];

export default function AvatarModal({ isOpen, onClose, isForced }: AvatarModalProps) {
  const { user, updateAvatar } = useAuth();
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [uploading, setUploading] = useState(false);

  // Tab 1: Draw states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ef4444"); // Red by default
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);

  // Tab 2: Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Initialize Canvas background and load existing avatar if available
  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current && isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill canvas with dark background first
      ctx.fillStyle = "#1b1a18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If user has an existing avatarUrl, load and draw it onto the canvas
      if (user?.avatarUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            const currentCtx = canvasRef.current.getContext("2d");
            if (currentCtx) {
              currentCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          }
        };
        img.onerror = (err) => {
          console.warn("Could not pre-load existing avatar onto canvas:", err);
        };
        img.src = user.avatarUrl;
      }
    }
  }, [activeTab, isOpen, user?.avatarUrl]);

  if (!isOpen || !user) return null;

  // --- DRAW TAB HANDLERS ---
  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1b1a18";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isEraser ? "#1b1a18" : selectedColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Upload Canvas drawing to Vercel Blob via /api/upload
  const handleSaveDrawing = async () => {
    if (!canvasRef.current) return;
    setUploading(true);

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setUploading(false);
          return;
        }

        try {
          const file = new File([blob], `avatar_${user.accountId}.png`, { type: "image/png" });
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

          await updateAvatar(data.url);
          onClose();
        } catch (err: any) {
          console.error("Failed to upload drawing avatar:", err);
          alert(`儲存大頭照失敗: ${err.message || err}`);
        } finally {
          setUploading(false);
        }
      }, "image/png");
    } catch (err: any) {
      console.error("Canvas blob conversion error:", err);
      setUploading(false);
    }
  };

  // --- UPLOAD TAB HANDLERS ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Upload selected file directly to Vercel Blob via /api/upload
  const handleApplyUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Upload failed");
      }

      await updateAvatar(data.url);
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`上傳圖片失敗: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-bold select-none">
      <div className="w-full max-w-lg bg-[#E6D5B8] border-2 border-black rounded p-5 sm:p-6 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative flex flex-col gap-4 box-border max-w-full overflow-hidden">
        
        {/* Header: Translated Title */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 w-full max-w-full box-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black shrink-0" />
            <h2 className="text-base sm:text-lg font-black tracking-wider text-black">
              使用者大頭照設定
            </h2>
          </div>
          {!isForced && (
            <button
              onClick={onClose}
              className="text-stone-800 hover:text-black transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2-Option Tab Navigation: 自己畫一個 vs 上傳 */}
        <div className="flex border-b-2 border-black gap-2 w-full max-w-full box-border">
          <button
            onClick={() => setActiveTab("draw")}
            className={`flex-1 py-2 text-sm md:text-base font-extrabold tracking-wider transition-none border-2 border-black rounded-t cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "draw"
                ? "bg-amber-300 text-black font-black"
                : "bg-yellow-100 text-stone-800 hover:bg-white"
            }`}
          >
            <Paintbrush className="w-4 h-4 shrink-0" /> 自己畫一個
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 text-sm md:text-base font-extrabold tracking-wider transition-none border-2 border-black rounded-t cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-amber-300 text-black font-black"
                : "bg-yellow-100 text-stone-800 hover:bg-white"
            }`}
          >
            <UploadCloud className="w-4 h-4 shrink-0" /> 上傳
          </button>
        </div>

        {/* TAB 1: DRAW IT (自己畫一個) */}
        {activeTab === "draw" && (
          <div className="flex flex-col gap-4 items-center w-full max-w-full box-border">
            {/* Canvas Container */}
            <div className="relative border-2 border-black rounded bg-[#1b1a18] p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <canvas
                ref={canvasRef}
                width={260}
                height={260}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair block rounded touch-none"
              />
            </div>

            {/* Drawing Tools & EXACT 8-Color Palette */}
            <div className="w-full flex flex-col gap-3 max-w-full box-border">
              {/* Color Palette */}
              <div className="w-full">
                <label className="block text-xs text-stone-800 font-extrabold mb-1.5 text-center">
                  選擇顏色 (8 Colors)
                </label>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {PALETTE_COLORS.map((col) => (
                    <button
                      key={col.name}
                      onClick={() => {
                        setSelectedColor(col.hex);
                        setIsEraser(false);
                      }}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-7 h-7 rounded-full border-2 border-black transition-transform cursor-pointer relative ${
                        selectedColor === col.hex && !isEraser
                          ? "ring-2 ring-black scale-110"
                          : "hover:scale-105"
                      }`}
                    >
                      {selectedColor === col.hex && !isEraser && (
                        <Check className={`w-3.5 h-3.5 absolute inset-0 m-auto ${
                          col.hex === "#ffffff" || col.hex === "#eab308" ? "text-black" : "text-white"
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-black pt-3 w-full max-w-full box-border">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`px-3 py-1.5 text-xs md:text-sm font-extrabold rounded border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                      !isEraser
                        ? "bg-amber-300 text-black font-black"
                        : "bg-white text-stone-800 hover:bg-yellow-100"
                    }`}
                  >
                    <Paintbrush className="w-4 h-4 shrink-0" /> 筆刷
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`px-3 py-1.5 text-xs md:text-sm font-extrabold rounded border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                      isEraser
                        ? "bg-amber-300 text-black font-black"
                        : "bg-white text-stone-800 hover:bg-yellow-100"
                    }`}
                  >
                    <Eraser className="w-4 h-4 shrink-0" /> 橡皮擦
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="px-3 py-1.5 text-xs md:text-sm font-extrabold rounded border-2 border-black bg-red-200 hover:bg-black hover:text-white text-black flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" /> 清除
                  </button>
                </div>

                {/* Brush Size Slider */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs md:text-sm font-extrabold text-black">大小:</span>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 md:w-24 accent-amber-500 cursor-pointer shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* Save & Apply Button */}
            <button
              onClick={handleSaveDrawing}
              disabled={uploading}
              className="w-full mt-2 bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black py-3 rounded text-base md:text-lg font-black uppercase tracking-wider transition-none cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              {uploading ? "儲存中..." : "儲存並完成設定"}
            </button>
          </div>
        )}

        {/* TAB 2: UPLOAD (上傳) */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-4 items-center py-2 w-full max-w-full box-border">
            <div className="w-full border-2 border-dashed border-black rounded p-6 flex flex-col items-center justify-center gap-3 bg-yellow-50">
              {uploadPreview ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <UploadCloud className="w-12 h-12 text-stone-700" />
              )}
              
              <div className="text-center font-bold">
                <p className="text-sm text-stone-900">
                  {selectedFile ? selectedFile.name : "請從您的裝置選擇圖片檔案"}
                </p>
                <p className="text-xs text-stone-600 mt-1">支援 PNG, JPG, SVG (最大 5MB)</p>
              </div>

              <input
                type="file"
                id="modal-file-upload"
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <label
                htmlFor="modal-file-upload"
                className="px-4 py-2 border-2 border-black bg-amber-300 hover:bg-black hover:text-white text-black text-sm font-extrabold rounded cursor-pointer transition-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                選擇檔案
              </label>
            </div>

            <button
              onClick={handleApplyUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-amber-300 hover:bg-black hover:text-white border-2 border-black text-black py-3 rounded text-base md:text-lg font-black uppercase tracking-wider transition-none cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              {uploading ? "上傳中..." : "儲存並完成設定"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
