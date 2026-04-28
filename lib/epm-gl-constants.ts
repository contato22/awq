// ─── EPM GL Types and Chart of Accounts ───────────────────────────────────────
//
// Safe to import in client components — no Node.js built-ins (fs, path, crypto).
// epm-gl.ts (server-only) re-exports everything from here.

export type AccountType =
  | "ASSET" | "LIABILITY" | "EQUITY"
  | "REVENUE" | "COGS" | "EXPENSE"
  | "FINANCIAL_REVENUE" | "FINANCIAL_EXPENSE"
  | "INTERCOMPANY";

export type BuCode = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

export interface AccountRef {
  account_code:   string;
  account_name:   string;
  account_type:   AccountType;
  normal_balance: "DEBIT" | "CREDIT";
  level:          number;
}

export const CHART_OF_ACCOUNTS: AccountRef[] = [
  { account_code: "1.1.01", account_name: "Caixa e Equivalentes",            account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.02", account_name: "Contas a Receber",                 account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.03", account_name: "Adiantamentos a Fornecedores",     account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.04", account_name: "Outros Créditos Circulantes",      account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.01", account_name: "Imobilizado (líquido)",            account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.02", account_name: "Intangível (líquido)",             account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.03", account_name: "Investimentos / Aplicações LP",    account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "2.1.01", account_name: "Fornecedores (Contas a Pagar)",    account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.02", account_name: "Obrigações Fiscais",               account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.03", account_name: "Obrigações Trabalhistas",          account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.04", account_name: "Outros Passivos Circulantes",      account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.2.01", account_name: "Empréstimos e Financiamentos LP",  account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.01", account_name: "Capital Social",                   account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.02", account_name: "Reservas de Lucros",               account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.03", account_name: "Lucros / Prejuízos Acumulados",    account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.01", account_name: "Receita de Serviços (JACQES)",     account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.02", account_name: "Receita de Produção (Caza Vision)",account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.03", account_name: "Receita de Consultoria (Advisor)", account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.04", account_name: "Fee de Gestão (Venture)",          account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.05", account_name: "Outras Receitas de Serviços",      account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.2.01", account_name: "Rendimentos de Aplicações",        account_type: "FINANCIAL_REVENUE",  normal_balance: "CREDIT", level: 3 },
  { account_code: "4.2.02", account_name: "Ajustes e Créditos Bancários",     account_type: "FINANCIAL_REVENUE",  normal_balance: "CREDIT", level: 3 },
  { account_code: "5.1.01", account_name: "Freelancers e Terceiros",          account_type: "COGS",               normal_balance: "DEBIT",  level: 3 },
  { account_code: "5.1.02", account_name: "Fornecedor Operacional",           account_type: "COGS",               normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.01", account_name: "Salários e Encargos",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.02", account_name: "Pró-labore / Retirada do Sócio",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.03", account_name: "Impostos e Tributos",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.04", account_name: "Tarifa Bancária",                  account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.05", account_name: "Software e Assinaturas",           account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.06", account_name: "Aluguel e Locação",                account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.07", account_name: "Energia / Água / Internet",        account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.08", account_name: "Serviços Contábeis / Jurídicos",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.2.01", account_name: "Marketing e Mídia Paga",           account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.2.02", account_name: "Comissões de Venda",               account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.01", account_name: "Deslocamento e Combustível",       account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.02", account_name: "Alimentação e Representação",      account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.03", account_name: "Viagem e Hospedagem",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.04", account_name: "Compras via Cartão Corporativo",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.05", account_name: "Despesas Pessoais Mistas",         account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "7.1.01", account_name: "Juros / Multa / IOF",              account_type: "FINANCIAL_EXPENSE",  normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.1.01", account_name: "AR Intercompany — JACQES",         account_type: "INTERCOMPANY",       normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.1.02", account_name: "AR Intercompany — Caza Vision",    account_type: "INTERCOMPANY",       normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.2.01", account_name: "AP Intercompany — AWQ Holding",    account_type: "INTERCOMPANY",       normal_balance: "CREDIT", level: 3 },
];
