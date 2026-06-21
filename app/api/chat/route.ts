import {
  getCustomerInfo,
  getAccountDetails,
  getConversationHistory,
  getSessionInfo,
  getOfferSummary,
  getOfferAccount,
  appendConversation,
  upsertSessionInfo,
  appendOfferSummary,
  appendOfferAccount,
  appendStaffEscalationInfo,
} from "@/lib/database";

const N8N_URL =
  process.env.N8N_WEBHOOK_URL ??
  "https://alphamakeathon-automation.arisetech.dev/webhook/ab7cbae4-8fed-413e-8281-00b053145a79";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    sessionId,
    customerId, // = cif
    message,
    messageType = "TEXT",
  } = body as {
    sessionId: string;
    customerId: string;
    message: string;
    messageType?: string;
  };

  // 1. Record the user message in the conversation table
  appendConversation({
    sessionId,
    role: "USER",
    content: message,
    agentUsed: "UserMessage",
    type: "text",
  });

  // 2. Load all context from the database
  const customer = getCustomerInfo(customerId);
  const accounts = getAccountDetails(customerId);
  const offerSoln = getOfferSummary(sessionId, 20);
  const offerSolnAcc = getOfferAccount(sessionId);
  const sessionInfo = getSessionInfo(sessionId);
  const history = getConversationHistory(sessionId);

  // 3. Build InputPayloadWebhook (field names match the code conventions)
  const inputPayload = {
    sessionId,
    customerId,
    message,
    messageType,

    customer: customer
      ? {
          mdata: customer.mdata,
          cif: customer.cif,
          mob: customer.mob,
          customerSegment: customer.customerSegment,
          debtMindSegment: customer.debtMindSegment,
          grpDpd: customer.grpDpd,
          sumOsNcb: customer.sumOsNcb,
          ncbCheckDate: customer.ncbCheckDate,
          eligibleProgram: customer.eligibleProgram,
          incomeFromSystem: customer.incomeFromSystem,
          name: customer.name,
          age: customer.age,
          employmentType: customer.employmentType,
          installmentNcbY1: customer.installmentNcbY1,
          installmentNcbY2: customer.installmentNcbY2,
          installmentNcbY3: customer.installmentNcbY3,
        }
      : null,

    account: accounts.map((acc) => ({
      mdata: acc.mdata,
      cif: acc.cif,
      accNo: acc.accNo,
      port: acc.port,
      cntrDate: acc.cntrDate,
      tdrDate: acc.tdrDate,
      currentDpd: acc.currentDpd,
      creditLimit: acc.creditLimit,
      os: acc.os,
      accruedInt: acc.accruedInt,
      intRate: acc.intRate,
      remainTerm: acc.remainTerm,
      installment: acc.installment,
    })),

    offerSoln: offerSoln.map((o) => ({
      solutionDesc: o.solutionDesc,
      plan: o.plan,
      sessionId: o.sessionId,
      planDesc: o.planDesc,
      totalExpInt: o.totalExpInt,
      term: o.term,
      installment: o.installment,
      constantPayment: o.constantPayment,
      planId: o.planId,
      refAccNo: o.refAccNo,
    })),

    offerSolnAcc: offerSolnAcc.map((o) => ({
      sessionId: o.sessionId,
      plan: o.plan,
      planId: o.planId,
      refAccNo: o.refAccNo,
      installment: o.installment,
      installmentY2: o.installmentY2 ?? null,
      installmentY3: o.installmentY3 ?? null,
      os: o.os ?? null,
      term: o.term,
      intRate: o.intRate,
      expIntTotal: o.expIntTotal ?? null,
      extraPaymentLastMth: o.extraPaymentLastMth ?? null,
    })),

    sessionInfo: sessionInfo.map((s) => ({
      considerAccount: s.considerAccount,
      maxPayment: s.maxPayment,
      sessionId: s.sessionId,
      maxTerm: s.maxTerm,
      narrative: s.narrative,
      preference: s.preference,
    })),

    history: history.map((h) => ({
      role: h.role,
      sessionId: h.sessionId,
      content: h.content,
      agentUsed: h.agentUsed,
      type: h.type,
      createdAt: h.createdAt,
    })),
  };

  // 4. Call n8n webhook
  let rawOutput: unknown;
  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputPayload),
    });
    if (!res.ok) {
      return Response.json(
        { error: `n8n error: ${res.status}` },
        { status: res.status }
      );
    }
    rawOutput = await res.json();
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }

  // 5. Parse OutputResponseWebhook
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: any = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

  // 6. Record BOT replies in conversation (replyMessage is now an array of {type, content})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replyMessages: any[] = Array.isArray(output.replyMessage) ? output.replyMessage : [];
  for (const msg of replyMessages) {
    appendConversation({
      sessionId,
      role: "BOT",
      content: msg.content ?? "",
      agentUsed: output.agentUsed ?? "Bot",
      type: (msg.type ?? "text").toLowerCase(),
    });
  }

  // 7. Upsert sessionInfo — sessionState is now a plain object (not an array).
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nsi: any = output.sessionState ?? null;

    const update: Record<string, unknown> = {};
    if (nsi?.consultAcc != null || nsi?.considerAccount != null)
      update.considerAccount = nsi.consultAcc ?? nsi.considerAccount;
    if (nsi?.maxTerm != null)    update.maxTerm    = nsi.maxTerm;
    if (nsi?.maxPayment != null) update.maxPayment = nsi.maxPayment;
    if (nsi?.preference != null) update.preference = nsi.preference;
    if (nsi?.narrative != null)  update.narrative  = nsi.narrative;

    upsertSessionInfo(sessionId, update);
  }

  // 8. Append new offer summaries (output.newOfferSoln[].totalIntPaid → totalExpInt)
  if (Array.isArray(output.newOfferSoln) && output.newOfferSoln.length > 0) {
    appendOfferSummary(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output.newOfferSoln.map((o: any) => ({
        sessionId: o.sessionId ?? sessionId,
        solutionDesc: o.solutionDesc ?? null,
        plan: o.plan ?? null,
        planDesc: o.planDesc ?? null,
        totalExpInt: o.totalIntPaid ?? o.totalExpInt ?? null,
        term: o.term ?? null,
        installment: o.installment ?? null,
        constantPayment: o.constantPayment ?? null,
        planId: o.planId ?? null,
        refAccNo: o.refAccNo ?? null,
      }))
    );
  }

  // 9. Append new offer account details
  if (Array.isArray(output.newOfferSolnAcc) && output.newOfferSolnAcc.length > 0) {
    appendOfferAccount(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output.newOfferSolnAcc.map((o: any) => ({
        sessionId: o.sessionId ?? sessionId,
        plan: o.plan ?? null,
        planId: o.planId ?? null,
        refAccNo: o.refAccNo ?? null,
        installment: o.installment ?? null,
        installmentY2: o.installment_Y2 ?? o.installmentY2 ?? null,
        installmentY3: o.installment_Y3 ?? o.installmentY3 ?? null,
        os: o.os ?? null,
        term: o.term ?? null,
        intRate: o.intRate ?? null,
        expIntTotal: o.expIntTotal ?? null,
        extraPaymentLastMth: o.extraPaymentlastMth ?? o.extraPaymentLastMth ?? null,
      }))
    );
  }

  // 10. Append staff escalation info (n8n sends PascalCase key)
  const escalation = output.StaffEscalationInfo ?? output.staffEscalationInfo;
  if (Array.isArray(escalation) && escalation.length > 0) {
    appendStaffEscalationInfo(escalation);
  }

  return Response.json(output);
}
