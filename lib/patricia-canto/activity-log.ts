// Log de atividades por role — cada mutação relevante nas rotas de API
// grava uma linha (role + descrição + quando), exibido só pro master na
// aba Equipe. Best-effort: uma falha ao gravar o log nunca deve quebrar a
// operação principal (ver logActivity em db.ts).
import type { PcRole } from "./auth";

export interface ActivityLogEntry {
  id: string;
  role: PcRole;
  action: string;
  createdAt: string;
}
