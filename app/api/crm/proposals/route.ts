import { NextRequest, NextResponse } from "next/server";
import {
  initCrmDB,
  listProposals, getProposal, createProposal, updateProposal,
  listProposalTemplates,
} from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;

    if (p.get("resource") === "templates") {
      const rows = await listProposalTemplates({ bu: p.get("bu") ?? undefined });
      return ok(rows);
    }

    const id = p.get("id");
    if (id) {
      const row = await getProposal(id);
      if (!row) return err("Not found", 404);
      return ok(row);
    }

    const rows = await listProposals({
      opportunity_id: p.get("opportunity_id") ?? undefined,
      status:         p.get("status")         ?? undefined,
      bu:             p.get("bu")             ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.opportunity_id) return err("opportunity_id required");
      if (!data.title?.trim())  return err("title required");
      const row = await createProposal(data);
      return ok(row);
    }

    if (action === "update") {
      const { proposal_id, ...rest } = data;
      if (!proposal_id) return err("proposal_id required");
      const row = await updateProposal(proposal_id, rest);
      return ok(row);
    }

    // Mark as sent — sets sent_at + signature_status pending
    if (action === "send") {
      const { proposal_id, signer_email } = data;
      if (!proposal_id) return err("proposal_id required");
      const link = `https://sign.awq.com.br/${proposal_id}`;
      const row = await updateProposal(proposal_id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        signature_status: "pending",
        signature_requested_at: new Date().toISOString(),
        signature_link: link,
        signer_email: signer_email ?? undefined,
      });
      return ok(row);
    }

    // Simulate signature (for demo/testing)
    if (action === "sign") {
      const { proposal_id, signer_name, signer_email } = data;
      if (!proposal_id) return err("proposal_id required");
      const row = await updateProposal(proposal_id, {
        status: "signed",
        signature_status: "signed",
        signed_at: new Date().toISOString(),
        signer_name: signer_name ?? "—",
        signer_email: signer_email ?? undefined,
      });
      return ok(row);
    }

    if (action === "decline") {
      const { proposal_id, decline_reason } = data;
      if (!proposal_id) return err("proposal_id required");
      const row = await updateProposal(proposal_id, {
        status: "declined",
        signature_status: "declined",
        declined_at: new Date().toISOString(),
        decline_reason: decline_reason ?? null,
      });
      return ok(row);
    }

    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
