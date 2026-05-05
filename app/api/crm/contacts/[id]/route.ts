// PATCH /api/crm/contacts/[id]  — atualiza contato
// DELETE /api/crm/contacts/[id] — remove contato
import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, updateContact, deleteContact } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initCrmDB();
    const body = await req.json();
    const contact = await updateContact(params.id, body);
    if (!contact) return err("Contact not found", 404);
    return ok(contact);
  } catch (e) { return err(String(e)); }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initCrmDB();
    const removed = await deleteContact(params.id);
    if (!removed) return err("Contact not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e) { return err(String(e)); }
}
