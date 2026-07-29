"use client";

import React from "react";
import D1StoryPage from "@/components/D1StoryPage";

interface RPGDialogBoxProps {
  onClose: () => void;
  onFinishedBriefing?: () => void;
}

export default function RPGDialogBox({ onClose, onFinishedBriefing }: RPGDialogBoxProps) {
  return <D1StoryPage onClose={onClose} onComplete={onFinishedBriefing} />;
}
