// ─── Google Drive Storage — AWQ PLATAFORM GROUP ───────────────────────────────
//
// Storage centralizado da plataforma AWQ via Google Drive API.
// Toda criação de arquivo — presente e futura — é roteada para as subpastas
// corretas dentro de AWQ PLATAFORM GROUP (eqoa@ultrapack.cloud, 10 TB).
//
// AUTENTICAÇÃO: Service Account (server-to-server — sem OAuth de usuário).
//   awq-ingest@awq-storage.iam.gserviceaccount.com
//
// VARIÁVEIS DE AMBIENTE:
//   GOOGLE_SERVICE_ACCOUNT_KEY  – JSON completo da service account
//   GOOGLE_DRIVE_FOLDER_ID      – ID da pasta raiz ou subpasta padrão
//
// STORAGE PRIORITY (upload/route.ts):
//   Google Drive > Vercel Blob > filesystem local
//
// blobUrl no DB: "gdrive://{fileId}"
// Storage: 10 TB (eqoa@ultrapack.cloud — Google Workspace)
// Deduplicação: SHA-256 em financial-db (independente do storage)

import crypto from "crypto";

// ─── AWQ PLATAFORM GROUP — Estrutura de pastas (IDs fixos) ────────────────────
//
//   AWQ PLATAFORM GROUP/              1nQRL0GEZz1QNVGqpS1kprr9qnFAfWStV
//   ├── PDFs Financeiros/             1--4XbF_2hws1Xr12ZFRd5o6Q31AhJnhm
//   ├── Extratos Bancários/           1aO0YlFJ2aS05KKx7NjSL9YfLL57ZodJs
//   ├── Segurança & Auditoria/        1JCufL7BhHkmgY2AOvReLhQ2VzERwPpMc
//   └── Dados & Infra/                1ivE-J4lMmo-atYcPNOcVLj5shIqmYHvF

export const AWQ_DRIVE_ROOT     = "1nQRL0GEZz1QNVGqpS1kprr9qnFAfWStV";

export const AWQ_DRIVE_FOLDERS = {
  root:       "1nQRL0GEZz1QNVGqpS1kprr9qnFAfWStV", // AWQ PLATAFORM GROUP
  pdfs:       "1--4XbF_2hws1Xr12ZFRd5o6Q31AhJnhm", // PDFs Financeiros
  extratos:   "1aO0YlFJ2aS05KKx7NjSL9YfLL57ZodJs", // Extratos Bancários
  seguranca:  "1JCufL7BhHkmgY2AOvReLwPpMc",         // Segurança & Auditoria
  infra:      "1ivE-J4lMmo-atYcPNOcVLj5shIqmYHvF",  // Dados & Infra
} as const;

export type DriveFolder = keyof typeof AWQ_DRIVE_FOLDERS;

// Roteamento por tipo de arquivo
export function getFolderForType(type: DriveFolder = "pdfs"): string {
  return AWQ_DRIVE_FOLDERS[type] ?? AWQ_DRIVE_FOLDERS.pdfs;
}

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

// ─── Env helpers ──────────────────────────────────────────────────────────────

export const USE_GDRIVE: boolean = !!(
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  process.env.GOOGLE_DRIVE_FOLDER_ID
);

export const GDRIVE_PREFIX = "gdrive://";

export function isGDriveUrl(url: string): boolean {
  return url.startsWith(GDRIVE_PREFIX);
}

export function makeGDriveUrl(fileId: string): string {
  return `${GDRIVE_PREFIX}${fileId}`;
}

export function extractFileId(gdriveUrl: string): string {
  return gdriveUrl.slice(GDRIVE_PREFIX.length);
}

// ─── Service Account auth — JWT → access token ────────────────────────────────

function parseServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não configurado.");
  try {
    return JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY: JSON inválido.");
  }
}

let _cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (_cachedToken && _cachedToken.expiresAt > now + 60) {
    return _cachedToken.value;
  }

  const key = parseServiceAccountKey();

  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss:   key.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  })).toString("base64url");

  const toSign = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(toSign);
  const signature = signer.sign(key.private_key, "base64url");
  const jwt = `${toSign}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth error: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return _cachedToken.value;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadToDrive(
  filename: string,
  buffer: Buffer,
  mimeType = "application/pdf",
  folderType: DriveFolder = "pdfs"
): Promise<string> {
  // Usa sempre a subpasta correta dentro de AWQ PLATAFORM GROUP
  const folderId = getFolderForType(folderType);

  const token    = await getAccessToken();
  const boundary = "awq_drive_boundary";
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  const preamble = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
  ].join("\r\n") + "\r\n";

  const body = Buffer.concat([
    Buffer.from(preamble),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive upload error (${res.status}): ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function downloadFromDrive(fileId: string): Promise<Buffer> {
  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Google Drive download error (${res.status}): fileId=${fileId}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFromDrive(fileId: string): Promise<void> {
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
