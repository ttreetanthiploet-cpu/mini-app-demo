export async function POST(request: Request) {
  const { cif } = (await request.json()) as { cif: string };

  const webhookUrl = process.env.N8N_REQUEST_STATUS_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json(
      { error: "ยังไม่ได้กำหนด webhook URL สำหรับดึงสถานะคำขอ" },
      { status: 503 }
    );
  }

  const upstream = await fetch(webhookUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: cif }),
  });

  if (!upstream.ok) {
    return Response.json(
      { error: "ไม่สามารถเชื่อมต่อระบบได้" },
      { status: upstream.status }
    );
  }

  const data = await upstream.json();
  // n8n wraps each item as [{ json: {...} }, ...] — unwrap if needed
  const items = Array.isArray(data)
    ? data.map((d: Record<string, unknown>) => (d.json && typeof d.json === "object" ? d.json : d))
    : data;
  return Response.json(items);
}
