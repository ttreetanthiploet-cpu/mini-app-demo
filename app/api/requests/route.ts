type AnyObj = Record<string, unknown>;

// Handles all n8n response shapes:
//   [[{json:{...}}]]          double-nested
//   [[{json:{request_offer:[...]}}]]  double-nested with request_offer
//   [{json:{...}}]            single-nested
//   {request_offer:[...]}     flat with request_offer
//   {...item fields...}        single flat item
function extractItems(data: unknown): unknown[] {
  if (!data) return [];

  // Unwrap double-nesting: [[...]] → [...]
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return extractItems(data[0]);
  }

  // Array of n8n-wrapped items: [{json:{...}}, ...]
  if (Array.isArray(data)) {
    const inner = data.map((d) => {
      const obj = d as AnyObj;
      return obj?.json && typeof obj.json === "object" ? obj.json : obj;
    });
    // If the single unwrapped item has request_offer, expand it
    if (inner.length === 1 && Array.isArray((inner[0] as AnyObj)?.request_offer)) {
      return (inner[0] as AnyObj).request_offer as unknown[];
    }
    return inner;
  }

  // Single object with request_offer field — recurse to unwrap nesting inside
  const obj = data as AnyObj;
  if (Array.isArray(obj?.request_offer)) return extractItems(obj.request_offer);

  // Single flat item
  return [data];
}

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

  const text = await upstream.text();
  if (!text.trim()) return Response.json([]);

  const data = JSON.parse(text);
  return Response.json(extractItems(data));
}
