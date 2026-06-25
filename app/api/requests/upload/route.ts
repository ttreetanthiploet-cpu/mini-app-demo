import fs from "fs";
import path from "path";

const IS_READONLY_FS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOAD_DIR = IS_READONLY_FS ? "/tmp/uploads" : path.join(process.cwd(), "uploads");

export async function POST(request: Request) {
  const formData = await request.formData();

  const cif = formData.get("cif") as string | null;
  const requestSubject = formData.get("request_subject") as string | null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!files.length) {
    return Response.json({ error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" }, { status: 400 });
  }

  // Create upload directory: uploads/<cif>/ (sanitised)
  const safeCif = (cif ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dest = path.join(UPLOAD_DIR, safeCif);
  fs.mkdirSync(dest, { recursive: true });

  const saved: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dest, `${Date.now()}_${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    saved.push(filePath);
  }

  return Response.json({ success: true, saved, cif, requestSubject });
}
