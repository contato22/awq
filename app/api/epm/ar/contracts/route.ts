import { NextRequest, NextResponse } from "next/server";
import {
  getContracts,
  addContract,
  generateARFromContracts,
  initContractsDB,
  type BuCode,
  type ARContract,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initContractsDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const activeOnly = req.nextUrl.searchParams.get("active") !== "false";
    return ok(await getContracts(activeOnly));
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      return ok(await generateARFromContracts());
    }

    const {
      bu_code, customer_name, customer_doc, description, category,
      monthly_amount, billing_day, iss_rate, start_date, end_date,
    } = body;

    if (!bu_code || !customer_name || !description || !monthly_amount || !billing_day || !start_date)
      return err("bu_code, customer_name, description, monthly_amount, billing_day and start_date are required");
    if (typeof monthly_amount !== "number" || monthly_amount <= 0)
      return err("monthly_amount must be a positive number");
    if (typeof billing_day !== "number" || billing_day < 1 || billing_day > 28)
      return err("billing_day must be between 1 and 28");

    const input: Omit<ARContract, "id" | "created_at"> = {
      bu_code: bu_code as BuCode,
      customer_name, customer_doc,
      description, category: category ?? "Serviço Recorrente",
      monthly_amount, billing_day,
      iss_rate: iss_rate ?? 0.05,
      start_date, end_date,
      is_active: true,
    };

    return ok(await addContract(input));
  } catch (e) { return err(String(e)); }
}
