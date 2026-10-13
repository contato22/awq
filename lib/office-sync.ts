/**
 * Sincronização do estado do Office com o servidor (/api/office/state). O navegador continua sendo
 * o cache (localStorage); o servidor passa a ser a cópia durável e compartilhada. Em conflito de
 * versão, mescla por id e tenta de novo. Se a tabela ainda não existe, segue só local.
 */
import type { EstadoHead } from "./office-head";
import { MAX_EVENTOS, type EventoOffice } from "./office-events";
import { MAX_MISSOES, type Missao } from "./office-missions";
import type { Politicas } from "./office-policy";

export type ChaveSync = "head" | "missions" | "events" | "policies";
export type StatusSync = "verificando" | "servidor" | "local" | "erro";

export interface ValoresSync { head: EstadoHead; missions: Missao[]; events: EventoOffice[]; policies: Politicas }

// ── Mescla (puras) ─────────────────────────────────────────────────────────────

function porId<T>(a: T[], b: T[], id: (x: T) => string, escolhe: (x: T, y: T) => T): T[] {
  const m = new Map<string, T>();
  for (const x of [...a, ...b]) {
    const k = id(x);
    const atual = m.get(k);
    m.set(k, atual ? escolhe(atual, x) : x);
  }
  return Array.from(m.values());
}

export function mesclarEventos(a: EventoOffice[], b: EventoOffice[]): EventoOffice[] {
  return porId(a, b, (e) => e.id, (x) => x).sort((x, y) => x.ts.localeCompare(y.ts)).slice(-MAX_EVENTOS);
}

export function mesclarMissoes(a: Missao[], b: Missao[]): Missao[] {
  return porId(a, b, (m) => m.id, (x, y) => (y.atualizadaEm > x.atualizadaEm ? y : x)).sort((x, y) => x.criadaEm.localeCompare(y.criadaEm)).slice(-MAX_MISSOES);
}

export function mesclarPoliticas(local: Politicas, remoto: Politicas): Politicas {
  return { ...remoto, ...local };
}

export function mesclarHead(l: EstadoHead, r: EstadoHead): EstadoHead {
  const maisNova = <T extends { atualizadaEm: string }>(x: T, y: T) => (y.atualizadaEm > x.atualizadaEm ? y : x);
  const tarefas = porId(l.tarefas, r.tarefas, (t) => t.id, maisNova).sort((x, y) => x.criadaEm.localeCompare(y.criadaEm));
  const aprovacoes = porId(l.aprovacoes, r.aprovacoes, (a) => a.id, (x, y) => (x.estado !== "pendente" ? x : y)).sort((x, y) => x.ts.localeCompare(y.ts));
  const mensagens = porId(l.mensagens, r.mensagens, (m) => m.id, (x) => x).sort((x, y) => x.ts.localeCompare(y.ts)).slice(-80);
  const ativacoes = porId(l.ativacoes, r.ativacoes, (a) => a.id, (x) => x).sort((x, y) => x.ts.localeCompare(y.ts)).slice(-20);
  const contas = { ...r.contas };
  for (const [bu, c] of Object.entries(l.contas)) if (!contas[bu] || c.atualizadaEm >= contas[bu].atualizadaEm) contas[bu] = c;
  const ckpt = !l.checkpoint ? r.checkpoint : !r.checkpoint ? l.checkpoint : r.checkpoint.ts > l.checkpoint.ts ? r.checkpoint : l.checkpoint;
  const pend = porId(l.eventosPendentes, r.eventosPendentes, (e) => `${e.ts}|${e.tipo}|${e.bu ?? ""}`, (x) => x)
    .filter((e) => !ckpt || e.ts > ckpt.ts).sort((x, y) => x.ts.localeCompare(y.ts)).slice(-60);
  const uso = l.uso.dia === r.uso.dia ? { dia: l.uso.dia, ativacoes: Math.max(l.uso.ativacoes, r.uso.ativacoes), tokensSaida: Math.max(l.uso.tokensSaida, r.uso.tokensSaida) } : l.uso.dia > r.uso.dia ? l.uso : r.uso;
  const ultima = [l.ultimaAtivacaoEm, r.ultimaAtivacaoEm].filter(Boolean).sort().pop() ?? null;
  return { ...l, tarefas: tarefas.slice(-120), aprovacoes: aprovacoes.slice(-60), mensagens, ativacoes, contas, checkpoint: ckpt, eventosPendentes: pend, uso, ultimaAtivacaoEm: ultima };
}

/** Mescla genérica por chave. */
export function mesclar<K extends ChaveSync>(chave: K, local: ValoresSync[K], remoto: ValoresSync[K]): ValoresSync[K] {
  switch (chave) {
    case "head": return mesclarHead(local as EstadoHead, remoto as EstadoHead) as ValoresSync[K];
    case "missions": return mesclarMissoes(local as Missao[], remoto as Missao[]) as ValoresSync[K];
    case "events": return mesclarEventos(local as EventoOffice[], remoto as EventoOffice[]) as ValoresSync[K];
    default: return mesclarPoliticas(local as Politicas, remoto as Politicas) as ValoresSync[K];
  }
}

// ── Sincronizador ──────────────────────────────────────────────────────────────

interface RegistroRemoto { value: unknown; version: number }

export interface Sincronizador {
  /** Lê o servidor, mescla com o local e devolve os valores mesclados (ou null se não houver servidor). */
  iniciar: (locais: ValoresSync) => Promise<Partial<ValoresSync> | null>;
  /** Agenda a gravação (com atraso) de uma chave; em conflito mescla e chama aoMesclar. */
  agendar: <K extends ChaveSync>(chave: K, valor: ValoresSync[K]) => void;
}

export function criarSincronizador(cb: { status: (s: StatusSync, detalhe?: string) => void; aoMesclar: <K extends ChaveSync>(chave: K, valor: ValoresSync[K]) => void }, atrasoMs = 1500): Sincronizador {
  const versoes: Partial<Record<ChaveSync, number>> = {};
  const timers: Partial<Record<ChaveSync, ReturnType<typeof setTimeout>>> = {};
  let ativo = false;

  async function enviar<K extends ChaveSync>(chave: K, valor: ValoresSync[K], tentativa = 0): Promise<void> {
    try {
      const res = await fetch("/api/office/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: chave, value: valor, base: versoes[chave] ?? 0 }) });
      if (res.ok) { versoes[chave] = ((await res.json()) as { version: number }).version; cb.status("servidor"); return; }
      if (res.status === 409 && tentativa < 2) {
        const { atual } = (await res.json()) as { atual: RegistroRemoto | null };
        if (atual) {
          versoes[chave] = atual.version;
          const mesclado = mesclar(chave, valor, atual.value as ValoresSync[K]);
          cb.aoMesclar(chave, mesclado);
          await enviar(chave, mesclado, tentativa + 1);
          return;
        }
      }
      if (res.status === 503) { ativo = false; cb.status("local", "Tabela do servidor ainda não criada"); return; }
      cb.status("erro", `Falha ao gravar (${res.status})`);
    } catch {
      cb.status("erro", "Sem conexão com o servidor");
    }
  }

  return {
    async iniciar(locais) {
      cb.status("verificando");
      try {
        const res = await fetch("/api/office/state");
        if (!res.ok) { cb.status("local", res.status === 503 ? "Tabela do servidor ainda não criada" : res.status === 403 || res.status === 401 ? "Sem permissão no servidor" : `Servidor indisponível (${res.status})`); return null; }
        const { chaves } = (await res.json()) as { chaves: Partial<Record<ChaveSync, RegistroRemoto>> };
        const out: Partial<ValoresSync> = {};
        (Object.keys(locais) as ChaveSync[]).forEach((k) => {
          const r = chaves[k];
          if (r) { versoes[k] = r.version; (out as Record<string, unknown>)[k] = mesclar(k, locais[k] as never, r.value as never); }
        });
        ativo = true;
        cb.status("servidor");
        // Empurra de volta o que o servidor ainda não tem (primeira vez) ou o que a mescla mudou.
        (Object.keys(locais) as ChaveSync[]).forEach((k) => { void enviar(k, ((out as Record<string, unknown>)[k] ?? locais[k]) as never); });
        return out;
      } catch {
        cb.status("local", "Sem conexão com o servidor");
        return null;
      }
    },
    agendar(chave, valor) {
      if (!ativo) return;
      clearTimeout(timers[chave]);
      timers[chave] = setTimeout(() => { void enviar(chave, valor); }, atrasoMs);
    },
  };
}
