import fs from "fs";
import path from "path";

type CustomerRow = { name: string; cif: string };

export async function GET() {
  const file = path.join(process.cwd(), "database", "customer_info.json");
  const data: CustomerRow[] = JSON.parse(fs.readFileSync(file, "utf-8"));

  const seen = new Set<string>();
  const unique: CustomerRow[] = [];
  for (const { name, cif } of data) {
    if (!seen.has(cif)) { seen.add(cif); unique.push({ name, cif }); }
  }

  unique.sort((a, b) => a.name.localeCompare(b.name, "th"));
  return Response.json(unique);
}
