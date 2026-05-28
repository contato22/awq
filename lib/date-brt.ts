// Helpers de data no fuso horário de Brasília (America/Sao_Paulo, BRT UTC-3 / BRST UTC-2).
// Use SEMPRE estas funções em vez de new Date().toISOString() para evitar que o servidor
// Vercel (UTC) retorne a data errada para usuários brasileiros (impacto: 3h/dia às 21-24h BRT).

const TZ = "America/Sao_Paulo";

/** "YYYY-MM-DD" de hoje no horário de Brasília */
export function todayBRT(): string {
  return new Date().toLocaleDateString("sv", { timeZone: TZ });
}

/** "YYYY-MM-DD" de N dias atrás no horário de Brasília */
export function daysAgoBRT(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toLocaleDateString("sv", { timeZone: TZ });
}

/** "YYYY-MM-DD" de N dias à frente no horário de Brasília */
export function daysAheadBRT(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toLocaleDateString("sv", { timeZone: TZ });
}

/** Ano e mês atual em BRT — month é 0-indexed (como Date.getMonth()) */
export function nowBRT(): { year: number; month: number; day: number } {
  const [y, m, d] = todayBRT().split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}
