"use client";

import { useState, useEffect, useRef } from "react";
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

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "อยู่ระหว่างตรวจสอบ": {
    bg: "color-mix(in oklab, #00a4e5, #fff 86%)",
    color: "color-mix(in oklab, #00a4e5, #003a55 52%)",
    border: "color-mix(in oklab, #00a4e5, #fff 65%)",
  },
  "ขอเอกสารเพิ่มเติม": {
    bg: "color-mix(in oklab, #f59e0b, #fff 82%)",
    color: "#92400e",
    border: "color-mix(in oklab, #f59e0b, #fff 58%)",
  },
  "อนุมัติ": {
    bg: "color-mix(in oklab, #1f9d6b, #fff 85%)",
    color: "color-mix(in oklab, #1f9d6b, #000 32%)",
    border: "color-mix(in oklab, #1f9d6b, #fff 65%)",
  },
  "ไม่อนุมัติ": {
    bg: "color-mix(in oklab, #dc2626, #fff 85%)",
    color: "#991b1b",
    border: "color-mix(in oklab, #dc2626, #fff 65%)",
  },
};

const FALLBACK_STYLE = { bg: "var(--accent-soft)", color: "var(--accent-ink)", border: "var(--accent-line)" };

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? FALLBACK_STYLE;
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
        <span className="req-detail-status-value">{item.review_status}</span>
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
          {!loading && !error && !selected && requests.map((item, i) => (
            <RequestCard key={i} item={item} onOpen={() => setSelected(item)} />
          ))}
          {selected && <RequestDetail item={selected} cif={cif} />}
        </div>
      </div>
    </>
  );
}
