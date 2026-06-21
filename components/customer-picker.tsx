"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface Customer { name: string; cif: string }

function randomSessionId() {
  return `session-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default function CustomerPicker({ onStart }: { onStart: (cif: string, sessionId: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(randomSessionId);
  const [resetting, setResetting] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const handleReset = useCallback(async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch("/api/reset", { method: "POST" });
    } finally {
      setResetting(false);
    }
  }, [resetting]);

  useEffect(() => {
    fetch("/api/customers")
      .then(r => r.json())
      .then((data: Customer[]) => setCustomers(data))
      .catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers.slice(0, 25);
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.cif.includes(q)
    ).slice(0, 25);
  }, [customers, query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = useCallback((c: Customer) => {
    setSelected(c);
    setQuery(c.name);
    setOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selected || !sessionId.trim()) return;
    onStart(selected.cif, sessionId.trim());
  }, [selected, sessionId, onStart]);

  const canStart = selected !== null && sessionId.trim().length > 0;

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      background: "var(--bg)",
    }}>
      {/* Brand hero */}
      <div style={{
        background: "linear-gradient(160deg, #005f8f 0%, var(--accent) 100%)",
        padding: "52px 28px 64px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 4,
        }}>
          🏦
        </div>
        <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
          ที่ปรึกษาการเงิน
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: 14, textAlign: "center", lineHeight: 1.6 }}>
          เลือกลูกค้าและระบุ Session ID<br />เพื่อเริ่มต้นการสนทนา
        </p>
      </div>

      {/* Form card */}
      <div style={{
        background: "var(--card)",
        borderRadius: "24px 24px 0 0",
        marginTop: -24,
        flex: 1,
        padding: "28px 22px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        overflowY: "auto",
      }}>
        {/* Customer name combobox */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: 0.1 }}>
            ชื่อลูกค้า
          </label>
          <div ref={comboRef} style={{ position: "relative" }}>
            <input
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1.5px solid ${open ? "var(--accent)" : "var(--line)"}`,
                fontSize: 15,
                color: "var(--ink)",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
                fontFamily: "inherit",
              }}
              placeholder="ค้นหาชื่อลูกค้า หรือ CIF..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
              onFocus={() => setOpen(true)}
              autoComplete="off"
            />
            {open && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1.5px solid var(--line)",
                borderRadius: 12,
                boxShadow: "0 8px 28px rgba(0,20,40,0.12)",
                zIndex: 50,
                maxHeight: 232,
                overflowY: "auto",
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "13px 14px", color: "var(--muted)", fontSize: 14 }}>
                    ไม่พบลูกค้า
                  </div>
                ) : filtered.map((c, i) => (
                  <button
                    key={c.cif}
                    onMouseDown={() => pick(c)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "11px 14px",
                      border: "none",
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--line-2)" : "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 12,
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{c.cif}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div style={{
              fontSize: 12,
              color: "var(--accent-ink)",
              padding: "7px 11px",
              background: "var(--accent-soft)",
              borderRadius: 8,
              lineHeight: 1.5,
            }}>
              CIF: <b>{selected.cif}</b>
            </div>
          )}
        </div>

        {/* Session ID */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: 0.1 }}>
            Session ID
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1.5px solid var(--line)",
                fontSize: 14,
                color: "var(--ink)",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
                fontFamily: "monospace",
                minWidth: 0,
              }}
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              placeholder="session-xxxxxx"
            />
            <button
              onClick={() => setSessionId(randomSessionId())}
              style={{
                padding: "0 14px",
                borderRadius: 12,
                border: "1.5px solid var(--line)",
                background: "#fff",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              สุ่มใหม่
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            ใช้รหัสที่สุ่มมา หรือพิมพ์เองเพื่อแยกการสนทนาแต่ละครั้ง
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* Start button */}
        <button
          disabled={!canStart}
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 14,
            border: "none",
            background: canStart ? "var(--accent)" : "var(--line)",
            color: canStart ? "#fff" : "var(--muted)",
            fontSize: 16,
            fontWeight: 700,
            cursor: canStart ? "pointer" : "not-allowed",
            transition: "background 0.15s, color 0.15s",
            fontFamily: "inherit",
            letterSpacing: 0.3,
          }}
        >
          เริ่มต้นการสนทนา
        </button>

        {/* Reset history */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              background: "none",
              border: "none",
              fontFamily: "inherit",
              fontSize: 12,
              color: "var(--muted)",
              cursor: resetting ? "not-allowed" : "pointer",
              padding: "6px 10px",
              borderRadius: 8,
              opacity: resetting ? 0.5 : 1,
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { if (!resetting) { (e.currentTarget as HTMLButtonElement).style.color = "#e53e3e"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(229,62,62,0.07)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            {resetting ? "กำลังล้างประวัติ..." : "ล้างประวัติการสนทนา"}
          </button>
        </div>
      </div>
    </div>
  );
}
