import { appendConversation } from "@/lib/database";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    sessionId,
    role,
    content,
    agentUsed,
    type = "text",
  } = body as {
    sessionId: string;
    role: string;
    content: string;
    agentUsed: string;
    type?: string;
  };

  appendConversation({ sessionId, role, content, agentUsed, type });
  return Response.json({ ok: true });
}
