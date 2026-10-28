// Envolve handlers de /api/erp/* para que falhas de configuração do banco ERP
// (variáveis ausentes) virem 503 com mensagem, e erros inesperados virem 500 JSON,
// em vez de um 500 sem corpo.
import { NextResponse } from "next/server";

const CONFIG_ERROR = /^Missing NEXT_PUBLIC_ERP_SUPABASE_URL/;

export function erpErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  if (CONFIG_ERROR.test(message)) {
    return NextResponse.json(
      { error: "Banco ERP não configurado neste ambiente.", configured: false },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: message || "Erro interno" }, { status: 500 });
}

export function withErpErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      return erpErrorResponse(err);
    }
  };
}
