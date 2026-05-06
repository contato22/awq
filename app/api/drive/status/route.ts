import { NextResponse } from "next/server";
import { USE_DRIVE, DRIVE_ROOT_FOLDER_ID, getAccessToken, ensureFolder, listFiles } from "@/lib/drive-client";

export async function GET() {
  if (!USE_DRIVE) {
    return NextResponse.json({
      configured: false,
      message: "GOOGLE_SERVICE_ACCOUNT_KEY e GOOGLE_DRIVE_FOLDER_ID não configurados",
    });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ configured: true, connected: false, error: "Falha na autenticação com Google" }, { status: 503 });
  }

  const rootFolder = await ensureFolder(DRIVE_ROOT_FOLDER_ID, "AWQ Platform");
  if (!rootFolder) {
    return NextResponse.json({ configured: true, connected: false, error: "Pasta raiz não encontrada" }, { status: 503 });
  }

  const recentFiles: { folder: string; files: { name: string; modifiedTime?: string; size?: string; webViewLink?: string }[] }[] = [];

  for (const period of ["Diário", "Semanal", "Mensal", "Anual"] as const) {
    const periodFolder = await ensureFolder(rootFolder, period);
    if (!periodFolder) continue;

    const subFolders = await listFiles(periodFolder);
    if (!subFolders.length) continue;

    const latest = subFolders[0];
    if (latest.mimeType !== "application/vnd.google-apps.folder") continue;

    const files = await listFiles(latest.id);
    recentFiles.push({
      folder: `${period}/${latest.name}`,
      files: files.map((f) => ({
        name: f.name,
        modifiedTime: f.modifiedTime,
        size: f.size,
        webViewLink: f.webViewLink,
      })),
    });
  }

  return NextResponse.json({
    configured: true,
    connected: true,
    rootFolderId: DRIVE_ROOT_FOLDER_ID,
    recentFiles,
    checkedAt: new Date().toISOString(),
  });
}
