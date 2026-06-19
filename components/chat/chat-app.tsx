"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { nowTime, sleep } from "@/lib/utils";
import Header from "./header";
import Welcome from "./welcome";
import InputBar from "./input-bar";
import Bubble from "@/components/messages/bubble";
import TypingIndicator from "@/components/messages/typing-indicator";
import ChipRow from "@/components/messages/chip-row";
import ActionRow from "@/components/messages/action-row";
import Connecting from "@/components/messages/connecting";
import SystemDivider from "@/components/messages/system-divider";
import IntakeForm from "@/components/intake/intake-form";
import SummaryCard from "@/components/intake/summary-card";
import type { ChipItem } from "@/components/messages/chip-row";
import type { FormSubmitData } from "@/components/intake/intake-form";
import type { SummaryData } from "@/components/intake/summary-card";


// ─── Webhook & customer config ────────────────────────────────────────────────
// customerId = cif (the database customer ID)
const DEFAULT_CIF     = "121000143468";
const DEFAULT_SESSION_ID = "demo-session-001";
const N8N_WEBHOOK_URL = "/api/chat";
const AGENT_NAME      = "น้องฟิน";

// ─── Message type union ───────────────────────────────────────────────────────
type MsgBase = { id: number };
type TextMsg     = MsgBase & { type: "user" | "bot" | "agent"; text: string; time: string };
type TypingMsg   = MsgBase & { type: "typing"; who: "bot" | "agent" };
type ChipsMsg    = MsgBase & { type: "chips"; items: ChipItem[] };
type ActionsMsg  = MsgBase & { type: "actions" };
type ConnectingMsg = MsgBase & { type: "connecting" };
type SystemMsg   = MsgBase & { type: "system"; text: string };
type FormMsg     = MsgBase & { type: "form" } & ({ locked: false } | { locked: true; data: SummaryData });
// New: offer cards returned by n8n
type OfferCardsMsg = MsgBase & { type: "offerCards"; cards: OfferCardEntry[] };

export type Message =
  | TextMsg | TypingMsg | ChipsMsg | ActionsMsg
  | ConnectingMsg | SystemMsg | FormMsg | OfferCardsMsg;

type MsgInit = Message extends infer M ? M extends { id: number } ? Omit<M, "id"> : never : never;

// ─── Offer card types (n8n schema) ───────────────────────────────────────────
export interface OfferCardEntry {
  jsonType: string;
  planId: string;
  offerCard: OfferCardData;
}
export interface OfferCardData {
  plan_id: string;
  plan_desc: string;
  ncb_badge: string;
  accounts: string;
  cnt_eligible: string;
  cnt_total: string;
  total_os: string;
  prev_inst: string;
  new_inst: string;
  step_label: string;
  source_desc: string;
  int_rate_new: string;
  term_actual_old: string;
  term_remain_new: string;
  term_change: string;
  inst_y2y3: string;
  inst_after_3m: string;
  int_total_change: string;
  balloon_rows: string[];
  notes: string[];
  account_details: AccountDetailData[];
}
export interface AccountDetailData {
  acc_no: string;
  acc_name: string;
  os: string;
  int_rate: string;
  term_old: string;
  term_change: string;
  inst_old: string;
  inst_change: string;
  inst_change_y1?: string;
  inst_y2y3?: string;
  inst_after_3m?: string;
  inst_new_loan?: string;
  balloon_payment?: string;
  int_total_old: string;
  int_total_change: string;
  inelig_note: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"bot" | "agent">("bot");
  const [busy, setBusy] = useState(false);
  const sessionId = DEFAULT_SESSION_ID; // In production, this would come from server/session management
  const customerId = DEFAULT_CIF;
  const idRef     = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const nid = () => idRef.current++;

  const add = useCallback((m: MsgInit): number => {
    const id = nid();
    setMessages((p) => [...p, { ...m, id } as Message]);
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    setMessages((p) => p.filter((m) => m.id !== id));
  }, []);

  // Fire-and-forget: save any message to the conversation DB
  const dbSave = useCallback(
    (role: string, content: string, agentUsed: string, type = "text") => {
      fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role, content, agentUsed, type }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const say = useCallback(
    async (text: string, { who = "bot" as "bot" | "agent", delay = 950 } = {}) => {
      const tid = nid();
      setMessages((p) => [...p, { id: tid, type: "typing", who } as TypingMsg]);
      await sleep(delay);
      setMessages((p) =>
        p
          .filter((m) => m.id !== tid)
          .concat({ id: nid(), type: who, text, time: nowTime() } as TextMsg)
      );
      dbSave("Auto", text, "Auto", "text");
    },
    [dbSave]
  );

  const userSay = useCallback(
    (text: string) => add({ type: "user", text, time: nowTime() }),
    [add]
  );

  // ─── n8n webhook call — payload built server-side from DB ──────────────────
  const callWebhook = useCallback(
    async (TEXT: string, opts?: { msgType?: string }) => {
      const msgType = opts?.msgType ?? "TEXT";

      const tid = nid();
      setMessages((p) => [...p, { id: tid, type: "typing", who: "bot" } as TypingMsg]);

      try {
        const res = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            customerId,
            message:     TEXT,
            messageType: msgType,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reply = Array.isArray(data) ? data[0] : data;

        setMessages((p) => p.filter((m) => m.id !== tid));

        const replyType = (reply.type ?? "").toLowerCase();

        if (replyType === "json") {
          const raw = reply.replyMessage ?? reply.content ?? "[]";
          const items: OfferCardEntry[] =
            typeof raw === "string" ? JSON.parse(raw) : raw;
          const offerCards = items.filter(
            (item) => (item.jsonType ?? "").toLowerCase() === "offercard"
          );
          if (offerCards.length > 0) {
            add({ type: "offerCards", cards: offerCards });
            add({
              type: "chips",
              items: [
                { label: "ดูข้อเสนออื่น", act: "free", text: "ขอดูข้อเสนออื่นเพิ่มเติม" },
                { label: "อยากผ่อนน้อยกว่านี้", act: "free", text: "ต้องการค่างวดที่น้อยกว่านี้" },
                { label: "อยากผ่อนมากกว่านี้", act: "free", text: "ยอมผ่อนมากขึ้นเพื่อปิดหนี้เร็วขึ้น" },
              ],
            });
          }
        } else {
          const text =
            reply.replyMessage ?? reply.content ?? reply.message ??
            "ขออภัย ไม่สามารถตอบได้ในขณะนี้ค่ะ";
          setMessages((p) =>
            p.concat({ id: nid(), type: "bot", text, time: nowTime() } as TextMsg)
          );
        }
      } catch (err) {
        console.error("Webhook error:", err);
        setMessages((p) => p.filter((m) => m.id !== tid));
        setMessages((p) =>
          p.concat({
            id: nid(),
            type: "bot",
            text: "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งค่ะ",
            time: nowTime(),
          } as TextMsg)
        );
      }
    },
    [add, sessionId, customerId]
  );

  // ─── Apply offer — sends selected offer card back to n8n as JSON ──────────
  const applyOffer = useCallback(
    async (entry: OfferCardEntry) => {
      if (busy) return;
      setBusy(true);
      userSay(`สมัครมาตรการ ${entry.offerCard.plan_desc}`);
      await callWebhook(JSON.stringify(entry), { msgType: "json" });
      setBusy(false);
    },
    [busy, callWebhook, userSay]
  );

  // ─── Local flows (kept identical to original) ───────────────────────────────
  const runRestructure = useCallback(async () => {
    setBusy(true);
    await say(
      "ยินดีให้คำปรึกษาเรื่องการปรับโครงสร้างหนี้ค่ะ\n\nเพื่อให้ดิฉันช่วยได้ตรงจุด รบกวนระบุข้อมูลดังนี้ค่ะ\n\n• บัญชีที่ต้องการพิจารณา เช่น หมายเลขบัญชีหรือประเภทสินเชื่อ\n• ปัญหาที่กำลังเผชิญ เช่น ค่างวดสูงเกินไป ผ่อนไม่ไหว หรือมีหนี้หลายก้อน\n• ยอดที่ยินดีจ่ายต่อเดือน (หากมีในใจแล้วสามารถแจ้งได้เลยค่ะ)"
    );
    setBusy(false);
  }, [say]);

  const runProducts = useCallback(async () => {
    setBusy(true);
    await say(
      "ผลิตภัณฑ์สินเชื่อยอดนิยมของกรุงไทยค่ะ:\n\n•  สินเชื่อบ้านกรุงไทย — ดอกเบี้ยพิเศษ ผ่อนนานสูงสุด 40 ปี\n•  สินเชื่อส่วนบุคคล Krungthai Smart Money\n•  สินเชื่อรถยนต์ และรีไฟแนนซ์\n•  กรุงไทยธนวัฏ / บัตรกดเงินสด\n\nสนใจผลิตภัณฑ์ไหนเป็นพิเศษไหมคะ?",
      { delay: 1100 }
    );
    add({
      type: "chips",
      items: [
        { label: "สอบถามสินเชื่อบ้าน", act: "free", text: "ขอข้อมูลสินเชื่อบ้านเพิ่มเติม" },
        { label: "ปรึกษาแก้ปัญหาหนี้ส่วนบุคคล", act: "restructure" },
        { label: "คุยกับเจ้าหน้าที่", act: "agent" },
      ],
    });
    setBusy(false);
  }, [say, add]);

  const runBalance = useCallback(async () => {
    setBusy(true);
    await say("ตรวจสอบยอดและทำรายการได้จากเมนูลัดด้านล่างนี้เลยค่ะ ปลอดภัยด้วยระบบยืนยันตัวตนของเป๋าตัง");
    add({ type: "actions" });
    add({
      type: "chips",
      items: [
        { label: "ปรึกษาแก้ปัญหาหนี้ส่วนบุคคล", act: "restructure" },
        { label: "คุยกับเจ้าหน้าที่", act: "agent" },
      ],
    });
    setBusy(false);
  }, [say, add]);

  const runAgent = useCallback(async () => {
    setBusy(true);
    await say("กำลังเชื่อมต่อท่านกับเจ้าหน้าที่ที่ปรึกษาค่ะ สักครู่นะคะ");
    const cid = add({ type: "connecting" });
    await sleep(2200);
    remove(cid);
    add({ type: "system", text: `${AGENT_NAME} เข้าร่วมการสนทนา` });
    setMode("agent");
    await say(
      `สวัสดีครับ ผม${AGENT_NAME} ทีมที่ปรึกษาสินเชื่อกรุงไทย ยินดีดูแลเรื่องการปรับโครงสร้างหนี้ของคุณครับ มีเรื่องใดให้ช่วยเพิ่มเติมไหมครับ`,
      { who: "agent", delay: 1300 }
    );
    setBusy(false);
  }, [say, add, remove]);

  // ─── runFree: routes to n8n webhook ────────────────────────────────────────
  const runFree = useCallback(
    async (text: string, currentMode: "bot" | "agent") => {
      setBusy(true);
      if (currentMode === "agent") {
        await say("รับทราบครับ เดี๋ยวผมตรวจสอบและดูแลให้นะครับ สักครู่ครับ", {
          who: "agent",
          delay: 1000,
        });
      } else {
        await callWebhook(text);
      }
      setBusy(false);
    },
    [say, callWebhook]
  );

  const dispatch = useCallback(
    (act: string, payload?: string) => {
      // helper: show user bubble + save to DB (local flows only; n8n path saves server-side)
      const localUserAct = (text: string, fn: () => void) => {
        userSay(text);
        dbSave("USER", text, "UserMessage", "text");
        fn();
      };

      if (act === "restructure") {
        localUserAct("ปรึกษาแก้ปัญหาหนี้ส่วนบุคคล", runRestructure);
      } else if (act === "products") {
        localUserAct("ผลิตภัณฑ์สินเชื่อกรุงไทย", runProducts);
      } else if (act === "balance") {
        localUserAct("ตรวจสอบยอดและชำระ", runBalance);
      } else if (act === "agent") {
        localUserAct("ขอคุยกับเจ้าหน้าที่", runAgent);
      } else if (act === "free") {
        const txt = payload || "";
        userSay(txt);
        runFree(txt, mode); // server saves user + bot messages for this path
      }
    },
    [runRestructure, runProducts, runBalance, runAgent, runFree, userSay, dbSave, mode]
  );

  const onFormSubmit = useCallback(
    async (data: FormSubmitData) => {
      setMessages((p) =>
        p.map((m) =>
          m.type === "form" && !m.locked
            ? ({ ...m, locked: true, data } as FormMsg)
            : m
        )
      );
      setBusy(true);
      await sleep(400);
      const goal = data.values.goal || "";
      await say("ได้รับข้อมูลเรียบร้อยแล้วค่ะ ขอบคุณที่ไว้วางใจกรุงไทย", { delay: 900 });
      await say(
        `จากเป้าหมาย "${goal || "จัดการหนี้"}" มีแนวทางที่เป็นไปได้ดังนี้ค่ะ:\n\n•  ขยายระยะเวลาผ่อน เพื่อลดยอดผ่อนต่อเดือน\n•  ปรับลดอัตราดอกเบี้ยตามเงื่อนไขที่เข้าเกณฑ์\n•  รวมหนี้หลายบัญชีเป็นก้อนเดียว จัดการง่ายขึ้น`,
        { delay: 1300 }
      );
      await say(
        "ทีมที่ปรึกษาจะตรวจสอบข้อมูลและติดต่อกลับโดยเร็วที่สุดค่ะ ระหว่างนี้จัดการธุรกรรมอื่นได้เลยนะคะ",
        { delay: 1100 }
      );
      add({ type: "actions" });
      add({
        type: "chips",
        items: [
          { label: "คุยกับเจ้าหน้าที่ตอนนี้", act: "agent" },
          { label: "ดูผลิตภัณฑ์สินเชื่อ", act: "products" },
        ],
      });
      setBusy(false);
    },
    [say, add]
  );

  const onSend = useCallback(
    (text: string) => {
      if (busy) return;
      userSay(text);
      runFree(text, mode);
    },
    [busy, userSay, runFree, mode]
  );

  const onChip = useCallback(
    (chipMsgId: number, chip: ChipItem) => {
      remove(chipMsgId);
      dispatch(chip.act, chip.text);
    },
    [remove, dispatch]
  );

  const onAction = useCallback(
    async (action: { label: string }) => {
      userSay(action.label);
      setBusy(true);
      try {
        await say(`กำลังพาคุณไปยังหน้า "${action.label}" ของเป๋าตังค่ะ (ตัวอย่างการสาธิต)`, {
          delay: 800,
        });
      } finally {
        setBusy(false);
      }
    },
    [userSay, say]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setMode("bot");
    setBusy(false);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderMsg = useCallback(
    (m: Message) => {
      switch (m.type) {
        case "user":
        case "bot":
        case "agent":
          return <Bubble key={m.id} kind={m.type} text={m.text} time={m.time} />;
        case "typing":
          return <TypingIndicator key={m.id} who={m.who} />;
        case "chips":
          return <ChipRow key={m.id} items={m.items} onTap={(c) => onChip(m.id, c)} />;
        case "actions":
          return <ActionRow key={m.id} onAction={onAction} />;
        case "connecting":
          return <Connecting key={m.id} />;
        case "system":
          return <SystemDivider key={m.id} text={m.text} />;
        case "form":
          return m.locked ? (
            <SummaryCard key={m.id} data={m.data} />
          ) : (
            <IntakeForm key={m.id} onSubmit={onFormSubmit} />
          );
        case "offerCards":
          return <OfferCardsBlock key={m.id} cards={m.cards} onApply={applyOffer} />;
        default:
          return null;
      }
    },
    [onChip, onAction, onFormSubmit, applyOffer]
  );

  return (
    <div className="chat-screen">
      <Header mode={mode} onBack={reset} onReset={reset} />
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <Welcome onPick={(act, text) => dispatch(act, text)} />
        ) : (
          <>
            <div className="day-chip">วันนี้</div>
            {messages.map(renderMsg)}
          </>
        )}
      </div>
      <InputBar
        onSend={onSend}
        placeholder={mode === "agent" ? "พิมพ์ถึงเจ้าหน้าที่…" : "พิมพ์ข้อความถึงน้องฟิน…"}
      />
    </div>
  );
}

// ─── OfferCardsBlock ──────────────────────────────────────────────────────────

function OfferCardsBlock({
  cards,
  onApply,
}: {
  cards: OfferCardEntry[];
  onApply?: (entry: OfferCardEntry) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="sys-divider">
        <span>จากความต้องการ น้องฟินมีข้อเสนอ {cards.length} แผนให้พิจารณาค่ะ</span>
      </div>
      {cards.map((entry) => (
        <OfferCardFrame key={entry.planId} entry={entry} onApply={onApply} />
      ))}
    </div>
  );
}

function OfferCardFrame({
  entry,
  onApply,
}: {
  entry: OfferCardEntry;
  onApply?: (entry: OfferCardEntry) => void;
}) {
  const frameId = useRef(`f${Math.random().toString(36).slice(2)}`);
  const html = buildOfferCardHtml(entry.offerCard, frameId.current);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.frameId !== frameId.current || !iframeRef.current) return;
      if (e.data.action === "resize") {
        iframeRef.current.style.height = e.data.height + "px";
      } else if (e.data.action === "applyOffer") {
        onApply?.(entry);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onApply, entry]);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const body = iframe.contentDocument?.body;
      if (body) {
        const setH = () => { iframe.style.height = body.scrollHeight + 24 + "px"; };
        setH();
        setTimeout(setH, 350);
      }
    } catch {}
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      sandbox="allow-scripts"
      onLoad={handleLoad}
      style={{ width: "100%", border: "none", borderRadius: 16, minHeight: 480, display: "block" }}
    />
  );
}

// ─── Offer card HTML builder ──────────────────────────────────────────────────
const ICON_URL = "https://cdn-icons-png.flaticon.com/512/3135/3135706.png";

function buildOfferCardHtml(card: OfferCardData, frameId: string): string {
  const D = card;
  const dataJson = JSON.stringify(D);
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box}
body{margin:0;padding:12px;font-family:Arial,sans-serif;background:#EAF7FD;display:flex;justify-content:center}
.container{width:100%;max-width:400px}
.card{width:100%;background:#fff;border-radius:16px;padding:12px;border:1px solid rgba(0,164,229,.12);box-shadow:0 4px 12px rgba(0,164,229,.08);overflow:hidden}
.hidden{display:none!important}
.header{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.icon{width:36px;height:36px;background:#E6F7FD;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon img{width:18px;height:18px}
.title-wrap{flex:1;min-width:0}
.plan-id{display:block;color:#9ca3af;font-size:10px;font-weight:700;margin-bottom:2px}
.title{font-size:12px;line-height:1.4;color:#111827;font-weight:700;word-break:break-word}
.badge{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;background:#fff4e5;color:#b45309;font-size:9px;font-weight:700}
.status-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:999px;background:#fefce8;color:#854d0e;font-size:9px;font-weight:700;border:1px solid #fde047;white-space:nowrap;margin-top:4px}
.status-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#eab308;display:inline-block;flex-shrink:0}
.account-bar{margin-top:8px;padding:8px 10px;background:#F0FAFF;border:1px solid rgba(0,164,229,.20);border-radius:10px}
.account-label{font-size:10px;color:#6b7280;margin-bottom:2px}
.account-value{font-size:12px;color:#111827;font-weight:700;word-break:break-word}
.highlight-box{background:#E6F7FD;border-radius:14px;padding:12px;text-align:center;margin:12px 0}
.before-after{font-size:11px;color:#6b7280;margin-bottom:6px}
.price{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:6px}
.old-price{font-size:22px;font-weight:700;color:#111827}
.arr{color:#00A4E5;font-size:18px;font-weight:bold}
.after{color:#00A4E5;font-size:22px;font-weight:700}
.unit{font-size:11px;color:#6b7280;margin-left:2px}
.meta{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.mr{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.ml{font-size:11px;color:#6b7280;line-height:1.35;flex:1}
.mv{font-size:11px;color:#111827;font-weight:700;text-align:right;line-height:1.35;word-break:break-word}
.mv .b{color:#00A4E5}
.final-box{margin-top:8px;padding:9px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px}
.final-title{font-size:11px;font-weight:700;color:#111827;margin-bottom:6px}
.final-list{display:flex;flex-direction:column;gap:5px}
.fi{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.fa{font-size:10px;color:#374151;font-weight:700;flex:1;word-break:break-word}
.fd{font-size:10px;color:#6b7280;text-align:right;flex:1;word-break:break-word}
.fd .amt{color:#00A4E5;font-weight:700}
.action-btn,.back-btn,.apply-btn{display:block;text-align:center;padding:11px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;text-decoration:none}
.action-btn{width:100%;margin-top:10px;background:#00A4E5;color:#fff}
.action-btn:hover{background:#0090CC}
.detail-top{margin-bottom:12px}
.detail-heading{font-size:14px;font-weight:700;color:#111827}
.detail-sub{font-size:11px;color:#6b7280;margin-top:2px;line-height:1.4}
.ss{margin-top:10px;padding:10px;border-radius:12px;background:#E6F7FD;border:1px solid rgba(0,164,229,.20)}
.ss-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ss-cell{background:#fff;border-radius:10px;padding:8px;border:1px solid rgba(0,164,229,.15)}
.ss-label{font-size:10px;color:#6b7280;margin-bottom:3px}
.ss-value{font-size:12px;color:#111827;font-weight:700;word-break:break-word}
.accs{margin-top:12px}
.accs-title{font-size:12px;font-weight:700;color:#111827;margin-bottom:8px}
.acard{margin-top:10px;padding:12px;border:1px solid rgba(0,164,229,.20);background:#F8FCFF;border-radius:14px}
.acard:first-child{margin-top:0}
.achip{display:inline-block;padding:4px 8px;border-radius:999px;background:#E6F7FD;color:#00A4E5;font-size:10px;font-weight:700;margin-bottom:6px}
.aname{font-size:12px;font-weight:700;color:#111827;word-break:break-word}
.asub{font-size:10px;color:#6b7280;margin-top:3px;word-break:break-word}
.ameta{display:flex;flex-direction:column;gap:7px;margin-top:10px}
.amr{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.aml{font-size:11px;color:#6b7280;line-height:1.4;flex:1}
.amv{font-size:11px;color:#111827;font-weight:700;text-align:right;word-break:break-word}
.amv .b{color:#00A4E5}
.anote{margin-top:10px;padding:9px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px}
.anote-title{font-size:10px;font-weight:700;color:#111827;margin-bottom:4px}
.anote-text{font-size:10px;color:#6b7280;line-height:1.45;word-break:break-word}
.section{margin-top:12px;padding:10px;border:1px solid rgba(0,164,229,.15);border-radius:12px;background:#F8FCFF}
.section-title{font-size:11px;font-weight:700;color:#111827;margin-bottom:8px}
.note-list{margin:0;padding-left:18px}
.note-list li{font-size:11px;color:#4b5563;line-height:1.5;margin-bottom:4px}
.btn-row{display:flex;gap:8px;margin-top:12px}
.btn-row>*{flex:1 1 0}
.back-btn{background:#fff;color:#00A4E5;border:1px solid rgba(0,164,229,.35)}
.back-btn:hover{background:#F0FAFF}
.apply-btn{background:#00A4E5;color:#fff;border:none}
.apply-btn:hover{background:#0090CC}
</style>
</head>
<body>
<div class="container">
  <div class="card" id="sv"></div>
  <div class="card hidden" id="dv"></div>
</div>
<script>
const D=${dataJson};
const ICON="${ICON_URL}";
const FID="${frameId}";
const h=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function post(msg){window.parent.postMessage(Object.assign(msg,{frameId:FID}),'*');}
function resize(){post({action:'resize',height:document.body.scrollHeight+24});}
function mr(l,v){if(!v)return '';return '<div class="mr"><div class="ml">'+h(l)+'</div><div class="mv">'+v+'</div></div>';}
function amr(l,v){if(!v)return '';return '<div class="amr"><div class="aml">'+h(l)+'</div><div class="amv">'+v+'</div></div>';}
function summaryHTML(){
  const badge=D.ncb_badge?'<div class="badge">'+h(D.ncb_badge)+'</div>':'';
  const balloon=(D.balloon_rows||[]).length?'<div class="final-box"><div class="final-title">ค่างวดส่วนสุดท้าย</div><div class="final-list">'+D.balloon_rows.map(r=>{const p=r.split('|');return '<div class="fi"><div class="fa">บัญชี '+h(p[0])+'</div><div class="fd">งวด '+h(p[1])+' • <span class="amt">'+h(p[2])+' บาท</span></div></div>';}).join('')+'</div></div>':'';
  return '<div class="header"><div class="icon"><img src="'+ICON+'" alt=""></div><div class="title-wrap"><span class="plan-id">'+h(D.plan_id)+'</span><div class="title">'+h(D.plan_desc)+'</div>'+badge+'<div class="status-badge">ข้อเสนอเบื้องต้น</div></div></div>'
    +'<div class="account-bar"><div class="account-label">บัญชีที่พิจารณาเข้าร่วมมาตรการ</div><div class="account-value">'+h(D.accounts)+'</div></div>'
    +'<div class="highlight-box"><div class="before-after">ลดค่างวดรายเดือน'+h(D.step_label||'')+'</div><div class="price"><div class="old-price">'+h(D.prev_inst)+'</div><div class="arr">→</div><div><span class="after">'+h(D.new_inst)+'</span><span class="unit">บาท</span></div></div></div>'
    +'<div class="meta"><div class="mr"><div class="ml">ภาระหนี้คงเหลือรวม</div><div class="mv">'+h(D.total_os)+' บาท</div></div>'
    +mr('พิจารณาข้อเสนอ',h(D.source_desc))
    +mr('อัตราดอกเบี้ยใหม่',D.int_rate_new?'<span class="b">'+h(D.int_rate_new)+'</span>':'')
    +mr('ระยะเวลาผ่อนชำระจากอัตราผ่อนชำระเดิม',h(D.term_actual_old))
    +mr('ระยะเวลาผ่อนชำระจากอัตราผ่อนชำระใหม่',D.term_remain_new?'<span class="b">'+h(D.term_remain_new)+'</span>':'')
    +mr('ระยะเวลาผ่อนชำระ',D.term_change?'<span class="b">'+h(D.term_change)+'</span>':'')
    +mr('ค่างวดผ่อนชำระในปีที่ 2 และ 3',D.inst_y2y3?'<span class="b">'+h(D.inst_y2y3)+'</span>':'')
    +mr('อัตราผ่อนชำระรวมภายหลังจาก 3 เดือน',D.inst_after_3m?'<span class="b">'+h(D.inst_after_3m)+'</span>':'')
    +mr('ดอกเบี้ยรวมตลอดสัญญา',h(D.int_total_change))
    +'</div>'+balloon
    +'<button type="button" class="action-btn" id="openBtn">ดูรายละเอียดและสมัคร</button>';
}
function accHTML(a,idx){
  const note=a.inelig_note?'<div class="anote"><div class="anote-title">หมายเหตุ</div><div class="anote-text">'+h(a.inelig_note)+'</div></div>':'';
  return '<div class="acard"><div class="achip">บัญชีที่ '+idx+'</div><div class="aname">'+h(a.acc_name)+'</div><div class="asub">เลขที่บัญชี '+h(a.acc_no)+'</div><div class="ameta">'
    +'<div class="amr"><div class="aml">ยอดหนี้คงเหลือ</div><div class="amv">'+h(a.os)+' บาท</div></div>'
    +'<div class="amr"><div class="aml">อัตราดอกเบี้ย</div><div class="amv">'+h(a.int_rate)+'% ต่อปี</div></div>'
    +amr('ระยะเวลาผ่อนชำระตามสัญญาเดิม',h(a.term_old))
    +amr('ระยะเวลาผ่อนชำระ',a.term_change?'<span class="b">'+h(a.term_change)+'</span>':'')
    +amr('ค่างวดผ่อนชำระตามสัญญาเดิม',h(a.inst_old))
    +amr('ค่างวดผ่อนชำระ',a.inst_change?'<span class="b">'+h(a.inst_change)+'</span>':'')
    +amr('ค่างวดผ่อนชำระในปีที่แรก',a.inst_change_y1?'<span class="b">'+h(a.inst_change_y1)+'</span>':'')
    +amr('ค่างวดผ่อนชำระในปีที่ 2 และ 3',a.inst_y2y3?'<span class="b">'+h(a.inst_y2y3)+'</span>':'')
    +amr('อัตราผ่อนชำระรวมภายหลังจาก 3 เดือน',a.inst_after_3m?'<span class="b">'+h(a.inst_after_3m)+'</span>':'')
    +amr('อัตราการผ่อนชำระของสินเชื่อเพื่อเงินใหม่',a.inst_new_loan?'<span class="b">'+h(a.inst_new_loan)+'</span>':'')
    +amr('ค่างวดชำระส่วนสุดท้ายหลังสิ้นสุดสัญญา',a.balloon_payment?'<span class="b">'+h(a.balloon_payment)+'</span>':'')
    +amr('ดอกเบี้ยรวมตลอดสัญญาตามสัญญาเดิม',h(a.int_total_old))
    +amr('ดอกเบี้ยรวมตลอดสัญญา',a.int_total_change?'<span class="b">'+h(a.int_total_change)+'</span>':'')
    +'</div>'+note+'</div>';
}
function detailHTML(){
  const badge=D.ncb_badge?'<div class="badge">'+h(D.ncb_badge)+'</div>':'';
  const notes=(D.notes||[]).map(n=>'<li>'+h(n)+'</li>').join('');
  return '<div class="detail-top"><div class="detail-heading">รายละเอียดมาตรการแยกตามบัญชี</div><div class="detail-sub">กรุณาตรวจสอบเงื่อนไขและผลกระทบของแต่ละบัญชีก่อนสมัคร</div></div>'
    +'<div class="header"><div class="icon"><img src="'+ICON+'" alt=""></div><div class="title-wrap"><span class="plan-id">'+h(D.plan_id)+'</span><div class="title">'+h(D.plan_desc)+'</div>'+badge+'<div class="status-badge">ข้อเสนอเบื้องต้น</div></div></div>'
    +'<div class="ss"><div class="ss-grid"><div class="ss-cell"><div class="ss-label">จำนวนบัญชีที่เข้าร่วม/พิจารณา</div><div class="ss-value">'+h(D.cnt_eligible)+'/'+h(D.cnt_total)+' บัญชี</div></div><div class="ss-cell"><div class="ss-label">ภาระหนี้คงเหลือรวม</div><div class="ss-value">'+h(D.total_os)+' บาท</div></div><div class="ss-cell"><div class="ss-label">ค่างวดรวมเดิม</div><div class="ss-value">'+h(D.prev_inst)+' บาท</div></div><div class="ss-cell"><div class="ss-label">ค่างวดรวมใหม่</div><div class="ss-value">'+h(D.new_inst)+' บาท</div></div></div></div>'
    +'<div class="accs"><div class="accs-title">รายละเอียดรายบัญชี</div>'+(D.account_details||[]).map((a,i)=>accHTML(a,i+1)).join('')+'</div>'
    +'<div class="section"><div class="section-title">เงื่อนไขสำคัญ</div><ul class="note-list"><li>ข้อเสนอนี้เป็นเพียงการประเมินเบื้องต้น มิได้เป็นการรับประกันหรือยืนยันการอนุมัติ</li>'+notes+'</ul></div>'
    +'<div class="btn-row"><button type="button" class="back-btn" id="backBtn">ย้อนกลับ</button><button type="button" class="apply-btn" id="applyBtn">สมัคร</button></div>';
}
const sv=document.getElementById('sv');
const dv=document.getElementById('dv');
sv.innerHTML=summaryHTML();
dv.innerHTML=detailHTML();
document.getElementById('openBtn').addEventListener('click',()=>{
  sv.classList.add('hidden');dv.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(resize,50);
});
document.getElementById('backBtn').addEventListener('click',()=>{
  dv.classList.add('hidden');sv.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(resize,50);
});
document.getElementById('applyBtn').addEventListener('click',()=>{
  post({action:'applyOffer'});
});
</script>
</body>
</html>`;
}
