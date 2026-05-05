"use client";

// ─── /awq/ppm/collaboration — Team Collaboration Hub ─────────────────────────
// Activity feed · Team discussions (comments) · Document library

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, MessageSquare, FileText, Activity,
  Plus, X, Send, Upload, ExternalLink, Trash2,
  Clock, User, Briefcase, File, FileImage, FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmProject, PpmComment, PpmDocument, PpmActivity } from "@/lib/ppm-types";

type Tab = "activity" | "comments" | "documents";
type DocType = "spec" | "contract" | "report" | "presentation" | "other";

const DOC_TYPE_LABEL: Record<DocType, string> = {
  spec: "Especificação", contract: "Contrato", report: "Relatório",
  presentation: "Apresentação", other: "Outro",
};
const DOC_TYPE_COLOR: Record<DocType, string> = {
  spec: "bg-blue-100 text-blue-700", contract: "bg-emerald-100 text-emerald-700",
  report: "bg-violet-100 text-violet-700", presentation: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};
const DOC_ICON: Record<DocType, React.ElementType> = {
  spec: File, contract: FileText, report: FileSpreadsheet,
  presentation: FileImage, other: File,
};

const ACTION_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  project_created:    { icon: Briefcase,    color: "text-brand-600 bg-brand-50"    },
  project_updated:    { icon: Briefcase,    color: "text-gray-500  bg-gray-50"     },
  status_changed:     { icon: Activity,     color: "text-blue-600  bg-blue-50"     },
  health_changed:     { icon: Activity,     color: "text-amber-600 bg-amber-50"    },
  task_created:       { icon: Plus,         color: "text-gray-500  bg-gray-50"     },
  task_completed:     { icon: Activity,     color: "text-emerald-600 bg-emerald-50"},
  task_blocked:       { icon: Activity,     color: "text-red-600   bg-red-50"      },
  milestone_achieved: { icon: Activity,     color: "text-emerald-600 bg-emerald-50"},
  milestone_missed:   { icon: Activity,     color: "text-red-600   bg-red-50"      },
  risk_identified:    { icon: Activity,     color: "text-amber-600 bg-amber-50"    },
  risk_closed:        { icon: Activity,     color: "text-emerald-600 bg-emerald-50"},
  issue_opened:       { icon: Activity,     color: "text-red-600   bg-red-50"      },
  issue_resolved:     { icon: Activity,     color: "text-emerald-600 bg-emerald-50"},
  timesheet_approved: { icon: Clock,        color: "text-blue-600  bg-blue-50"     },
  comment_added:      { icon: MessageSquare,color: "text-brand-600 bg-brand-50"    },
  document_added:     { icon: FileText,     color: "text-violet-600 bg-violet-50"  },
};

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";
const SELECT = INPUT;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (mins  > 0) return `${mins}m atrás`;
  return "agora";
}

export default function CollaborationPage() {
  const [tab,        setTab]       = useState<Tab>("activity");
  const [projects,   setProjects]  = useState<PpmProject[]>([]);
  const [activities, setActivities]= useState<PpmActivity[]>([]);
  const [comments,   setComments]  = useState<PpmComment[]>([]);
  const [documents,  setDocuments] = useState<PpmDocument[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [filterProject, setFilterProject] = useState("");

  // Comment form
  const [newComment,  setNewComment]  = useState("");
  const [postingCmt,  setPostingCmt]  = useState(false);
  const [commentProj, setCommentProj] = useState("");

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({
    project_id: "", title: "", url: "", doc_type: "other" as DocType, description: "", version: "",
  });
  const [postingDoc, setPostingDoc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      const [activitiesJson, commentsJson, documentsJson, projectsJson] = await Promise.all([
        ppmFetch(`/api/ppm/activities?${params}&limit=100`),
        ppmFetch(`/api/ppm/comments?${params}`),
        ppmFetch(`/api/ppm/documents?${params}`),
        ppmFetch("/api/ppm/projects"),
      ]) as [
        { success: boolean; data: PpmActivity[] },
        { success: boolean; data: PpmComment[] },
        { success: boolean; data: PpmDocument[] },
        { success: boolean; data: { projects: PpmProject[] } },
      ];
      if (activitiesJson.success) setActivities(activitiesJson.data ?? []);
      if (commentsJson.success)   setComments(commentsJson.data ?? []);
      if (documentsJson.success)  setDocuments(documentsJson.data ?? []);
      if (projectsJson.success) {
        const projs = projectsJson.data.projects ?? [];
        setProjects(projs);
        if (!commentProj && projs.length > 0) setCommentProj(projs[0].project_id);
        if (!docForm.project_id && projs.length > 0) setDocForm(f => ({ ...f, project_id: projs[0].project_id }));
      }
    } catch { /* keep existing */ } finally {
      setLoading(false);
    }
  }, [filterProject]);

  useEffect(() => { void load(); }, [load]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !commentProj) return;
    setPostingCmt(true);
    try {
      await ppmFetch("/api/ppm/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:  commentProj,
          entity_type: "project",
          user_id:     "miguel",
          user_name:   "Miguel",
          content:     newComment.trim(),
        }),
      });
      setNewComment("");
      void load();
    } finally {
      setPostingCmt(false);
    }
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docForm.project_id || !docForm.title || !docForm.url) return;
    setPostingDoc(true);
    try {
      await ppmFetch("/api/ppm/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...docForm, uploaded_by: "miguel", uploader_name: "Miguel" }),
      });
      setShowDocForm(false);
      setDocForm(f => ({ ...f, title: "", url: "", description: "", version: "" }));
      void load();
    } finally {
      setPostingDoc(false);
    }
  }

  const totalActivity = activities.length;
  const totalComments = comments.length;
  const totalDocs     = documents.length;

  const filteredActivities = filterProject ? activities.filter(a => a.project_id === filterProject) : activities;
  const filteredComments   = filterProject ? comments.filter(c => c.project_id === filterProject) : comments;
  const filteredDocuments  = filterProject ? documents.filter(d => d.project_id === filterProject) : documents;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Colaboração</h1>
              <p className="text-xs text-gray-500">
                {totalActivity} eventos · {totalComments} comentários · {totalDocs} documentos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
              <option value="">Todos Projetos</option>
              {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Eventos",      value: totalActivity, icon: Activity,      color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Comentários",  value: totalComments, icon: MessageSquare, color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Documentos",   value: totalDocs,     icon: FileText,      color: "text-violet-600",  bg: "bg-violet-50"  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { id: "activity" as Tab,  label: "Feed de Atividades", icon: Activity      },
            { id: "comments" as Tab,  label: "Discussões",         icon: MessageSquare },
            { id: "documents" as Tab, label: "Documentos",         icon: FileText      },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── Activity Feed ── */}
        {tab === "activity" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Últimos {filteredActivities.length} eventos
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Carregando…</div>
              ) : filteredActivities.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum evento registrado.</div>
              ) : filteredActivities.map(a => {
                const cfg  = ACTION_ICON[a.action] ?? { icon: Activity, color: "text-gray-500 bg-gray-50" };
                const Icon = cfg.icon;
                const [iconColor, iconBg] = cfg.color.split(" ");
                return (
                  <div key={a.activity_id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={12} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800">{a.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.project_name && (
                          <Link href={`/awq/ppm/${a.project_id}`} className="text-[10px] text-brand-600 hover:underline truncate max-w-32">
                            {a.project_name}
                          </Link>
                        )}
                        {a.user_name && <span className="text-[10px] text-gray-400">· {a.user_name}</span>}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Comments / Discussions ── */}
        {tab === "comments" && (
          <div className="space-y-4">
            {/* Post comment */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare size={12} className="text-brand-600" /> Nova Mensagem
              </div>
              <form onSubmit={e => void postComment(e)} className="space-y-3">
                <div className="flex gap-3">
                  <select value={commentProj} onChange={e => setCommentProj(e.target.value)} className={SELECT + " w-64"}>
                    <option value="">Selecionar projeto…</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Escreva uma mensagem para o time…"
                    className={INPUT + " flex-1 resize-none"}
                    onKeyDown={e => { if (e.key === "Enter" && e.metaKey) void postComment(e as unknown as React.FormEvent); }}
                  />
                  <button type="submit" disabled={postingCmt || !newComment.trim() || !commentProj}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 self-end text-sm font-semibold">
                    <Send size={13} /> {postingCmt ? "…" : "Enviar"}
                  </button>
                </div>
              </form>
            </div>

            {/* Comment thread */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Carregando…</div>
                ) : filteredComments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma mensagem ainda.</div>
                ) : filteredComments.map(c => (
                  <div key={c.comment_id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-xs font-bold text-brand-700">
                      {c.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{c.user_name}</span>
                        {c.project_name && (
                          <>
                            <span className="text-gray-300">·</span>
                            <Link href={`/awq/ppm/${c.project_id}`} className="text-xs text-brand-600 hover:underline">
                              {c.project_name}
                            </Link>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Documents ── */}
        {tab === "documents" && (
          <div className="space-y-4">
            {/* Add document */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">{filteredDocuments.length} documento(s)</div>
              <button onClick={() => setShowDocForm(s => !s)}
                className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
                <Plus size={13} /> Adicionar Documento
              </button>
            </div>

            {showDocForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Upload size={13} className="text-brand-600" /> Novo Documento / Link
                  </h3>
                  <button onClick={() => setShowDocForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <X size={13} />
                  </button>
                </div>
                <form onSubmit={e => void addDocument(e)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto *</label>
                      <select value={docForm.project_id} onChange={e => setDocForm(f => ({ ...f, project_id: e.target.value }))} className={SELECT}>
                        <option value="">Selecionar…</option>
                        {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo</label>
                      <select value={docForm.doc_type} onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value as DocType }))} className={SELECT}>
                        {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título *</label>
                      <input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Nome do documento" className={INPUT} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Versão</label>
                      <input value={docForm.version} onChange={e => setDocForm(f => ({ ...f, version: e.target.value }))}
                        placeholder="v1.0" className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">URL / Link *</label>
                    <input value={docForm.url} onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
                      placeholder="https://drive.google.com/..." className={INPUT} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                    <input value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição breve do documento" className={INPUT} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowDocForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={postingDoc} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                      <Upload size={13} /> {postingDoc ? "Salvando…" : "Adicionar"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Document grid */}
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">Carregando…</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
                <FileText size={24} className="text-gray-200 mx-auto mb-2" />
                <div className="text-sm text-gray-400">Nenhum documento ainda.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map(d => {
                  const dt    = d.doc_type as DocType;
                  const Icon  = DOC_ICON[dt] ?? File;
                  return (
                    <div key={d.doc_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon size={15} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{d.title}</div>
                          {d.version && <div className="text-[10px] text-gray-400">{d.version}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DOC_TYPE_COLOR[dt]}`}>
                          {DOC_TYPE_LABEL[dt]}
                        </span>
                        {d.project_name && (
                          <Link href={`/awq/ppm/${d.project_id}`} className="text-[10px] text-brand-600 hover:underline truncate">
                            {d.project_name}
                          </Link>
                        )}
                      </div>
                      {d.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{d.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-400">
                          {d.uploader_name ?? d.uploaded_by} · {formatDateBR(d.created_at.slice(0, 10))}
                        </div>
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold">
                          Abrir <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
