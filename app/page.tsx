"use client";

import { useState } from "react";
import CustomerPicker from "@/components/customer-picker";
import ChatApp from "@/components/chat/chat-app";

export default function Home() {
  const [session, setSession] = useState<{ cif: string; sessionId: string } | null>(null);

  if (!session) {
    return <CustomerPicker onStart={(cif, sessionId) => setSession({ cif, sessionId })} />;
  }
  return <ChatApp cif={session.cif} sessionId={session.sessionId} />;
}
