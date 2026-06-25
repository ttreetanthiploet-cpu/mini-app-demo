"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IcAttach, IcCheck } from "@/components/icons";

export type RequestItem = {
  request_subject: string;
  request_type: string;
  report_date: string;
  proposed_solution: string;
  review_status: string;
  staff_request_text: string;
};

type UploadState = {
  files: File[];
  uploading: boolean;
  done: boolean;
  error: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  "อยู่ระหว่างตรวจสอบ": {
    bg: "#fff7ed",
    color: "#9a3412",
    border: "#fed7aa",
    dot: "#f97316",
  },
  "ขอเอกสารเพิ่มเติม": {
    bg: "#e0f5fd",
    color: "#005f84",
    border: "#7ed0f5",
    dot: "#00a4e5",
  },
  "อนุมัติ": {
    bg: "#dcfce7",
    color: "#14532d",
    border: "#86efac",
    dot: "#22c55e",
  },
  "ไม่อนุมัติ": {
    bg: "#fef2f2",
    color: "#7f1d1d",
    border: "#fca5a5",
    dot: "#ef4444",
  },
};

const FALLBACK_STYLE = { bg: "var(--accent-soft)", color: "var(--accent-ink)", border: "var(--accent-line)", dot: "var(--accent)" };

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? FALLBACK_STYLE;
}

function parseReportDate(dateStr: string): number {
  // ISO or standard format
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();

  // DD/MM/YYYY or DD-MM-YYYY
  const m = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m) {
    const year = parseInt(m[3]);
    // Convert Buddhist Era (พ.ศ.) to CE if needed
    const adjustedYear = year > 2500 ? year - 543 : year;
    return new Date(adjustedYear, parseInt(m[2]) - 1, parseInt(m[1])).getTime();
  }

  return 0;
}

function sortByDateDesc(items: RequestItem[]): RequestItem[] {
  return [...items].sort((a, b) => parseReportDate(b.report_date) - parseReportDate(a.report_date));
}

// ─── Condensed list card ───────────────────────────────────────────────────────
function RequestCard({ item, onOpen }: { item: RequestItem; onOpen: () => void }) {
  const ss = statusStyle(item.review_status);
  const needsAction = item.review_status === "ขอเอกสารเพิ่มเติม";

  return (
    <button className="req-card req-card-btn" onClick={onOpen}>
      <div className="req-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="req-subject">{item.request_subject}</div>
          <div className="req-card-meta">
            <span className="req-type-pill">{item.request_type}</span>
            <span className="req-date-text">{item.report_date}</span>
          </div>
        </div>
        <span
          className="req-status-badge"
          style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}
        >
          <span className="req-status-dot" style={{ background: ss.dot }} />
          {item.review_status}
        </span>
      </div>
      {needsAction && (
        <div className="req-action-hint">
          <span>ต้องการเอกสารเพิ่มเติม — แตะเพื่อแนบไฟล์</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── Carousel (multiple requests) ────────────────────────────────────────────
function RequestsCarousel({
  requests,
  onSelect,
}: {
  requests: RequestItem[];
  onSelect: (item: RequestItem) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIdx(idx);
  }, []);

  return (
    <div className="req-carousel">
      <div className="req-carousel-track" ref={trackRef} onScroll={handleScroll}>
        {requests.map((item, i) => (
          <div key={i} className="req-slide">
            <RequestCard item={item} onOpen={() => onSelect(item)} />
          </div>
        ))}
      </div>
      <div className="req-dots">
        {requests.map((_, i) => (
          <span
            key={i}
            className={`req-dot${i === activeIdx ? " req-dot-active" : ""}`}
            onClick={() => {
              trackRef.current?.scrollTo({ left: i * (trackRef.current.clientWidth), behavior: "smooth" });
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Full detail view ──────────────────────────────────────────────────────────
function RequestDetail({ item, cif }: { item: RequestItem; cif: string }) {
  const [upload, setUpload] = useState<UploadState>({ files: [], uploading: false, done: false, error: null });
  const fileRef = useRef<HTMLInputElement>(null);
  const needsUpload = item.review_status === "ขอเอกสารเพิ่มเติม";
  const ss = statusStyle(item.review_status);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setUpload((p) => ({ ...p, files: [...p.files, ...picked], done: false, error: null }));
    e.target.value = "";
  }

  function removeFile(i: number) {
    setUpload((p) => ({ ...p, files: p.files.filter((_, fi) => fi !== i) }));
  }

  async function handleUpload() {
    if (!upload.files.length) return;
    setUpload((p) => ({ ...p, uploading: true, error: null }));
    await new Promise((r) => setTimeout(r, 1200));
    setUpload({ files: [], uploading: false, done: true, error: null });
  }

  return (
    <div className="req-detail">
      {/* Status banner */}
      <div
        className="req-detail-status"
        style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}
      >
        <span className="req-detail-status-label">สถานะ</span>
        <span className="req-detail-status-value">
          <span className="req-status-dot req-status-dot-lg" style={{ background: ss.dot }} />
          {item.review_status}
        </span>
      </div>

      {/* Meta */}
      <div className="req-detail-section">
        <div className="req-detail-row">
          <span className="req-detail-k">เรื่อง</span>
          <span className="req-detail-v req-detail-v-bold">{item.request_subject}</span>
        </div>
        <div className="req-detail-row">
          <span className="req-detail-k">ประเภท</span>
          <span className="req-detail-v">{item.request_type}</span>
        </div>
        <div className="req-detail-row">
          <span className="req-detail-k">วันที่ขอ</span>
          <span className="req-detail-v">{item.report_date}</span>
        </div>
      </div>

      {/* Scrollable detail */}
      <div className="req-detail-section bg-subtle">
        <div className="req-detail-section-title">รายละเอียด</div>
        <div className="req-detail-scroll-box">
          <p className="req-detail-pre">{item.proposed_solution}</p>
        </div>
      </div>

      {/* Upload section */}
      {needsUpload && (
        <div className="req-upload-section">
          <div className="req-staff-note">
            <span className="req-staff-note-label">คำขอเพิ่มเติมจากเจ้าหน้าที่</span>
            <p className="req-staff-note-text">{item.staff_request_text}</p>
          </div>

          {upload.done ? (
            <div className="req-upload-success">
              <IcCheck />
              ส่งเอกสารเรียบร้อยแล้ว
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <button
                className="req-attach-btn"
                onClick={() => fileRef.current?.click()}
                disabled={upload.uploading}
              >
                <IcAttach />
                แนบเอกสาร
              </button>

              {upload.files.length > 0 && (
                <div className="req-file-list">
                  {upload.files.map((f, fi) => (
                    <div key={fi} className="req-file-item">
                      <span className="req-file-name">{f.name}</span>
                      <button className="req-file-remove" onClick={() => removeFile(fi)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {upload.error && <div className="req-upload-error">{upload.error}</div>}

              {upload.files.length > 0 && (
                <button className="req-upload-btn" onClick={handleUpload} disabled={upload.uploading}>
                  {upload.uploading ? "กำลังส่ง…" : `ส่งเอกสาร (${upload.files.length} ไฟล์)`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drawer shell ──────────────────────────────────────────────────────────────
type RequestsDrawerProps = {
  cif: string;
  open: boolean;
  onClose: () => void;
};

export default function RequestsDrawer({ cif, open, onClose }: RequestsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RequestItem | null>(null);

  useEffect(() => {
    if (!open) { setSelected(null); return; }
    setRequests([]);
    setError(null);
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cif }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "ไม่สามารถโหลดข้อมูลได้");
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : data ? [data] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="req-overlay" onClick={onClose} />
      <div className="req-drawer">
        <div className="req-drag-handle" />
        <div className="req-drawer-header">
          {selected && (
            <button className="req-back-btn" onClick={() => setSelected(null)} aria-label="ย้อนกลับ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <span className="req-drawer-title">{selected ? "รายละเอียดคำขอ" : "คำขอและแผนของฉัน"}</span>
          <button className="req-drawer-close" onClick={onClose} aria-label="ปิด">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="req-drawer-body">
          {loading && (
            <div className="req-loading">
              <div className="req-spinner" />
              <span>กำลังโหลดข้อมูล…</span>
            </div>
          )}
          {!loading && error && (
            <div className="req-error-state">
              <p>{error}</p>
              <button className="req-retry-btn" onClick={fetchRequests}>ลองอีกครั้ง</button>
            </div>
          )}
          {!loading && !error && !selected && requests.length === 0 && (
            <div className="req-empty-state">
              <p>ไม่พบคำขอในระบบ</p>
            </div>
          )}
          {!loading && !error && !selected && (() => {
            const sorted = sortByDateDesc(requests);
            return sorted.length === 1
              ? <RequestCard item={sorted[0]} onOpen={() => setSelected(sorted[0])} />
              : sorted.length > 1
                ? <RequestsCarousel requests={sorted} onSelect={setSelected} />
                : null;
          })()}
          {selected && <RequestDetail item={selected} cif={cif} />}
        </div>
      </div>
    </>
  );
}
