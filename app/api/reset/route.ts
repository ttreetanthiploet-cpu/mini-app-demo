import fs from "fs";
import path from "path";

const READ_DIR = path.join(process.cwd(), "database");
const IS_READONLY_FS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const WRITE_DIR = IS_READONLY_FS ? "/tmp/database" : READ_DIR;

const RESET_FILES = [
  "conversation.json",
  "restructure_offer_account.json",
  "restructure_offer_summary.json",
  "session_info.json",
  "staff_escalation_info.json",
];

export async function POST() {
  const results: { file: string; status: string }[] = [];

  for (const filename of RESET_FILES) {
    const writePath = path.join(WRITE_DIR, filename);
    const readPath = path.join(READ_DIR, filename);
    // Write to writable path; also clear the read path when they're the same (local dev)
    try {
      if (fs.existsSync(writePath)) {
        fs.writeFileSync(writePath, "[]", "utf-8");
        results.push({ file: filename, status: "reset" });
      } else if (WRITE_DIR === READ_DIR && fs.existsSync(readPath)) {
        fs.writeFileSync(readPath, "[]", "utf-8");
        results.push({ file: filename, status: "reset" });
      } else {
        results.push({ file: filename, status: "not found" });
      }
    } catch (err) {
      results.push({ file: filename, status: `error: ${err}` });
    }
  }

  return Response.json({ ok: true, results });
}
