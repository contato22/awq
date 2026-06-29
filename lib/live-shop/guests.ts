// ─── Live Shop — Convidados (acesso individual à área da marca) ───────────────
//
// Contas "convidado" da área da marca (login individual, liberado por marca).
// NÃO são usuários da Plataforma: role 'live-guest', escopo só
// /awq/live-shop/publico/<marca-liberada>. Persistidos em ls_guest (migration
// 010). Senha com bcrypt. Acesso SOMENTE server-side (NextAuth + API do owner).

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";

export interface Guest {
  id: string;
  email: string;
  name: string;
  brandIds: string[];
  status: "active" | "revoked";
  createdAt?: string;
}

const db = erpAdmin ?? erpAnon;
export const GUESTS_DB_AVAILABLE = !!db;

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rowToGuest(r: any): Guest {
  return {
    id: r.id, email: r.email, name: r.name,
    brandIds: r.brand_ids ?? [], status: r.status, createdAt: r.created_at,
  };
}

/** Valida credenciais de convidado. Retorna o convidado (sem hash) ou null. */
export async function verifyGuest(email: string, password: string): Promise<Guest | null> {
  if (!db) return null;
  const { data } = await db
    .from("ls_guest")
    .select("*")
    .eq("email", normEmail(email))
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const ok = await bcrypt.compare(password, data.password_hash);
  if (!ok) return null;
  return rowToGuest(data);
}

export async function listGuests(): Promise<Guest[]> {
  if (!db) return [];
  const { data } = await db
    .from("ls_guest")
    .select("*")
    .eq("bu_id", LIVE_SHOP_BU)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToGuest);
}

export interface CreateGuestInput {
  email: string;
  name: string;
  password: string;
  brandIds: string[];
}

/** Cria um convidado (login + liberação por marca). Idempotente por email. */
export async function createGuest(input: CreateGuestInput): Promise<Guest> {
  if (!db) throw new Error("ERP Supabase não configurado — convidados exigem migration 010.");
  const email = normEmail(input.email);
  const password_hash = await bcrypt.hash(input.password, 10);
  const id = `guest_${randomUUID().slice(0, 12)}`;
  const { data, error } = await db
    .from("ls_guest")
    .upsert({
      id, bu_id: LIVE_SHOP_BU, email, name: input.name,
      password_hash, brand_ids: input.brandIds, status: "active",
    }, { onConflict: "email" })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createGuest: ${error?.message ?? "falha"}`);
  return rowToGuest(data);
}

/** Revoga (status='revoked') — bloqueia login sem apagar o histórico. */
export async function revokeGuest(id: string): Promise<void> {
  if (!db) throw new Error("ERP Supabase não configurado.");
  await db.from("ls_guest").update({ status: "revoked" }).eq("id", id).eq("bu_id", LIVE_SHOP_BU);
}
