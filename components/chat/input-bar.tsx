"use client";

import { useState } from "react";
import { IcSend } from "@/components/icons";

interface InputBarProps {
  onSend: (text: string) => void;
  placeholder?: string;
}

export default function InputBar({ onSend, placeholder }: InputBarProps) {
  const [val, setVal] = useState("");

  const send = () => {
    const t = val.trim();
    if (!t) return;
    onSend(t);
    setVal("");
  };

  return (
    <div className="chat-input">
      <div className="input-wrap">
        <input
          value={val}
          placeholder={placeholder ?? "พิมพ์ข้อความ…"}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
      </div>
      <button
        className="send-btn"
        disabled={!val.trim()}
        onClick={send}
        aria-label="ส่ง"
      >
        <IcSend />
      </button>
    </div>
  );
}
