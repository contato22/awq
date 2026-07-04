// ─── JACQES — Convidados (gerenciador de acessos à área /jacqes) ──────────────
//
// Contas "convidado" com login individual para acessar /jacqes. NÃO são usuários
// da Plataforma: role 'jacqes-guest', escopo só /jacqes. Persistidos em
// jacqes_guest (migration 012). Senha com bcrypt. Acesso SOMENTE server-side
// (NextAuth authorize + API do owner). Espelha lib/live-shop/guests.ts.

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { erpAdmin, erpAnon } from "@/lib/supabase";

export interface JacqesGuest {
  id: string;
  email: string; // login (usuário ou email)
  name: string;
  status: "active" | "revoked";
  createdAt?: string;
}

const db = erpAdmin ?? erpAnon;
export const JACQES_GUESTS_DB_AVAILABLE = !!db;

function normLogin(login: string): string {
  return login.trim().toLowerCase();
}

function rowToGuest(r: any): JacqesGuest {
  return { id: r.id, email: r.email, name: r.name, status: r.status, createdAt: r.created_at };
}

/** Valida credenciais de convidado JACQES. Retorna o convidado ou null. */
export async function verifyJacqesGuest(login: string, password: string): Promise<JacqesGuest | null> {
  if (!db) return null;
  const { data } = await db
    .from("jacqes_guest")
    .select("*")
    .eq("email", normLogin(login))
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const ok = await bcrypt.compare(password, data.password_hash);
  if (!ok) return null;
  return rowToGuest(data);
}

export async function listJacqesGuests(): Promise<JacqesGuest[]> {
  if (!db) return [];
  const { data } = await db
    .from("jacqes_guest")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToGuest);
}

export interface CreateJacqesGuestInput {
  login: string;
  name?: string;
  password: string;
}

/** Cria um convidado JACQES (login individual). Idempotente por login. */
export async function createJacqesGuest(input: CreateJacqesGuestInput): Promise<JacqesGuest> {
  if (!db) throw new Error("ERP Supabase não configurado — convidados exigem migration 012.");
  const login = normLogin(input.login);
  const password_hash = await bcrypt.hash(input.password, 10);
  const id = `jguest_${randomUUID().slice(0, 12)}`;
  const { data, error } = await db
    .from("jacqes_guest")
    .upsert({
      id, email: login, name: (input.name?.trim() || login),
      password_hash, status: "active",
    }, { onConflict: "email" })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createJacqesGuest: ${error?.message ?? "falha"}`);
  return rowToGuest(data);
}

/** Revoga (status='revoked') — bloqueia login sem apagar o histórico. */
export async function revokeJacqesGuest(id: string): Promise<void> {
  if (!db) throw new Error("ERP Supabase não configurado.");
  await db.from("jacqes_guest").update({ status: "revoked" }).eq("id", id);
}
