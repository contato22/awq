// ─── AWQ Google Drive Client ──────────────────────────────────────────────────
//
// Uses Google Drive REST API v3 with Service Account JWT auth.
// Zero extra dependencies — relies only on Node.js built-in `crypto` + `fetch`.
//
// SETUP:
//   1. Create a Google Cloud Service Account
//   2. Download the JSON key file
//   3. Base64-encode it: `base64 -i service-account.json`
//   4. Set GOOGLE_SERVICE_ACCOUNT_KEY=<base64-string>
//   5. Create a folder in Google Drive, share it with the service account email
//   6. Set GOOGLE_DRIVE_FOLDER_ID=<folder-id-from-url>

import crypto from "crypto";

export const USE_DRIVE =
  !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  !!process.env.GOOGLE_DRIVE_FOLDER_ID;

export const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";

// ─── JWT + Token ──────────────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let _cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null;

  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
    return _cachedToken.value;
  }

  let credentials: ServiceAccountKey;
  try {
    const raw = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      "base64"
    ).toString("utf-8");
    credentials = JSON.parse(raw);
  } catch {
    console.error("[Drive] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(credentials.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    console.error("[Drive] Token exchange failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return _cachedToken.value;
}

// ─── Generic Drive REST wrapper ───────────────────────────────────────────────

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

async function driveRequest<T>(
  path: string,
  options: RequestInit = {},
  uploadApi = false
): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const base = uploadApi ? UPLOAD_API : DRIVE_API;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    console.error(`[Drive] ${options.method ?? "GET"} ${path} →`, res.status, await res.text());
    return null;
  }

  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}

// ─── Folder helpers ───────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

export async function ensureFolder(
  parentId: string,
  name: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  );
  const list = await driveRequest<{ files: DriveFile[] }>(
    `/files?q=${q}&fields=files(id,name)`
  );

  if (list?.files?.length) return list.files[0].id;

  const created = await driveRequest<DriveFile>("/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  return created?.id ?? null;
}

// ─── File upload ──────────────────────────────────────────────────────────────

export async function uploadFile(
  folderId: string,
  fileName: string,
  content: string,
  mimeType: "application/json" | "text/csv" | "text/plain"
): Promise<DriveFile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const existing = await findFile(folderId, fileName);

  const metadata = JSON.stringify(
    existing
      ? { name: fileName }
      : { name: fileName, parents: [folderId] }
  );

  const body = new FormData();
  body.append(
    "metadata",
    new Blob([metadata], { type: "application/json" })
  );
  body.append("file", new Blob([content], { type: mimeType }));

  const url = existing
    ? `${UPLOAD_API}/files/${existing.id}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime,size`
    : `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime,size`;

  const res = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    console.error("[Drive] Upload failed:", await res.text());
    return null;
  }
  return res.json();
}

export async function findFile(
  folderId: string,
  name: string
): Promise<DriveFile | null> {
  const q = encodeURIComponent(
    `name='${name}' and '${folderId}' in parents and trashed=false`
  );
  const list = await driveRequest<{ files: DriveFile[] }>(
    `/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime,size)`
  );
  return list?.files?.[0] ?? null;
}

export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed=false`
  );
  const list = await driveRequest<{ files: DriveFile[] }>(
    `/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&pageSize=50`
  );
  return list?.files ?? [];
}

// ─── CSV helper ───────────────────────────────────────────────────────────────

export function toCsv(records: Record<string, unknown>[]): string {
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = records.map((r) => headers.map((h) => escape(r[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}
