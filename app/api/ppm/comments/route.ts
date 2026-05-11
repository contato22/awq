import { NextRequest, NextResponse } from "next/server";
import { listComments, createComment, deleteComment } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const comments = await listComments(
      p.get("project_id") ?? undefined,
      p.get("task_id")    ?? undefined,
    );
    return ok(comments);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "delete") {
      if (!body.comment_id) return err("comment_id is required");
      const deleted = await deleteComment(body.comment_id);
      if (!deleted) return err("Comment not found", 404);
      return ok({ deleted: true });
    }

    if (!body.project_id)  return err("project_id is required");
    if (!body.author_name) return err("author_name is required");
    if (!body.body)        return err("body is required");

    const comment = await createComment({
      project_id:        body.project_id,
      task_id:           body.task_id,
      task_name:         body.task_name,
      project_name:      body.project_name,
      author_id:         body.author_id,
      author_name:       body.author_name,
      body:              body.body,
      mentions:          body.mentions ?? [],
      parent_comment_id: body.parent_comment_id,
    });
    return ok(comment);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
