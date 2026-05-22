import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, createAccount } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

function digits(raw: string) { return raw.replace(/\D/g, ""); }

function fmtCnpj(d: string) {
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(De|Do|Da|Dos|Das|E|A|O|Em|Para|Com|Por|Na|No|Nas|Nos)\b/g, m => m.toLowerCase());
}

function porteToSize(porte: string): string | null {
  switch (porte?.toUpperCase()) {
    case "ME":     return "1-10";
    case "EPP":    return "11-50";
    case "DEMAIS": return "51-200";
    default:       return null;
  }
}

// CNAE is a 7-digit number; first 2 digits are the divisão
function cnaeToIndustry(cnae: number): string {
  const div = Math.floor(cnae / 100000);
  if (div >= 62 && div <= 63) return "technology";
  if (div >= 64 && div <= 66) return "financial_services";
  if (div >= 86 && div <= 88) return "healthcare";
  if (div === 85)              return "education";
  if (div >= 47 && div <= 49) return "retail";
  if (div === 68)              return "real_estate";
  if (div >= 69 && div <= 70) return "consulting";
  return "other";
}

interface BrApiResp {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  porte?: string;
  capital_social?: number;
  qsa?: Array<{ nome_socio: string; cargo: string }>;
  // error case
  message?: string;
}

export type CnpjData = {
  account_name: string;
  trade_name: string | null;
  document_number: string;
  industry: string | null;
  cnae_descricao: string | null;
  company_size: string | null;
  annual_revenue_estimate: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  situacao: string | null;
  socios: Array<{ nome: string; cargo: string }>;
};

function mapToAccountData(j: BrApiResp): CnpjData {
  const d = digits(j.cnpj);
  const streetParts = [
    j.logradouro,
    j.numero && j.numero !== "S/N" ? `nº ${j.numero}` : j.numero,
    j.complemento || undefined,
    j.bairro || undefined,
  ].filter(Boolean);

  const phone = [j.ddd_telefone_1, j.ddd_telefone_2]
    .map(p => p?.trim()).filter(Boolean)[0] ?? null;

  return {
    account_name:            titleCase(j.razao_social ?? ""),
    trade_name:              j.nome_fantasia?.trim() ? titleCase(j.nome_fantasia) : null,
    document_number:         fmtCnpj(d),
    industry:                j.cnae_fiscal != null ? cnaeToIndustry(j.cnae_fiscal) : null,
    cnae_descricao:          j.cnae_fiscal_descricao ?? null,
    company_size:            j.porte ? porteToSize(j.porte) : null,
    annual_revenue_estimate: j.capital_social && j.capital_social > 0 ? j.capital_social : null,
    address_street:          streetParts.length ? streetParts.join(", ") : null,
    address_city:            j.municipio ? titleCase(j.municipio) : null,
    address_state:           j.uf ?? null,
    address_zip:             j.cep ? digits(j.cep) : null,
    phone,
    situacao:                j.descricao_situacao_cadastral ?? null,
    socios:                  (j.qsa ?? []).map(q => ({ nome: titleCase(q.nome_socio), cargo: q.cargo })),
  };
}

// GET /api/crm/cnpj?cnpj=12345678000190
// GET /api/crm/cnpj?cnpj=12345678000190&save=true  → also creates account in DB
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("cnpj") ?? "";
    const d = digits(raw);
    if (d.length !== 14) return err("CNPJ inválido — informe 14 dígitos", 400);

    const upstream = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, {
      headers: { Accept: "application/json", "User-Agent": "AWQ-ERP/1.0" },
      next: { revalidate: 86400 },
    });

    if (upstream.status === 404) return err("CNPJ não encontrado na Receita Federal", 404);
    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      return err(`Receita Federal indisponível (${upstream.status}): ${body.slice(0, 200)}`, 502);
    }

    const json = await upstream.json() as BrApiResp;
    if (json.message) return err(json.message, 404);

    const cnpj_data = mapToAccountData(json);
    const save = req.nextUrl.searchParams.get("save") === "true";

    if (save) {
      await initCrmDB();
      const account = await createAccount({
        account_name:            cnpj_data.account_name,
        trade_name:              cnpj_data.trade_name,
        document_number:         cnpj_data.document_number,
        industry:                cnpj_data.industry ?? undefined,
        company_size:            cnpj_data.company_size ?? undefined,
        annual_revenue_estimate: cnpj_data.annual_revenue_estimate ?? undefined,
        address_street:          cnpj_data.address_street ?? undefined,
        address_city:            cnpj_data.address_city ?? undefined,
        address_state:           cnpj_data.address_state ?? undefined,
        address_zip:             cnpj_data.address_zip ?? undefined,
        account_type:            "prospect",
      });
      return ok({ cnpj_data, account });
    }

    return ok({ cnpj_data });
  } catch (e) {
    return err(String(e));
  }
}
