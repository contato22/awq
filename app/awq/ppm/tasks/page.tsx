"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo, useRef, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle, AlertTriangle,
  Calendar, Clock, Package, ClipboardList, ChevronRight, AlertCircle,
  Flag, Layers, Search, X, RefreshCw, Pencil, Save, Loader2, CheckCheck,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  status:    TaskStatus;
  label:     string;
  bg:        string;
  border:    string;
  headerBg:  string;
  icon:      ElementType;
  iconColor: string;
  countBg:   string;
}[] = [
  { status:"not_started", label:"A Fazer",      bg:"bg-gray-50",       border:"border-gray-200",   headerBg:"bg-white",      icon:Circle,       iconColor:"text-gray-400",   countBg:"bg-gray-100 text-gray-500"       },
  { status:"in_progress", label:"Em Andamento", bg:"bg-blue-50/60",    border:"border-blue-200",   headerBg:"bg-blue-50",    icon:PlayCircle,   iconColor:"text-blue-500",   countBg:"bg-blue-100 text-blue-700"       },
  { status:"blocked",     label:"Bloqueado",    bg:"bg-red-50/60",     border:"border-red-200",    headerBg:"bg-red-50",     icon:AlertTriangle,iconColor:"text-red-500",    countBg:"bg-red-100 text-red-700"         },
  { status:"completed",   label:"Concluído",    bg:"bg-emerald-50/60", border:"border-emerald-200",headerBg:"bg-emerald-50", icon:CheckCircle2, iconColor:"text-emerald-500",countBg:"bg-emerald-100 text-emerald-700"  },
];

// Static map — prevents Tailwind JIT from purging dynamic class strings
const STATUS_STYLE: Record<TaskStatus, { dot: string; border: string; ring: string; bg: string; text: string }> = {
  not_started: { dot:"bg-gray-400",    border:"border-gray-300",    ring:"ring-gray-300",    bg:"bg-gray-50",     text:"text-gray-700"    },
  in_progress:  { dot:"bg-blue-500",   border:"border-blue-300",    ring:"ring-blue-300",    bg:"bg-blue-50",     text:"text-blue-700"    },
  blocked:      { dot:"bg-red-500",    border:"border-red-300",     ring:"ring-red-300",     bg:"bg-red-50",      text:"text-red-700"     },
  completed:    { dot:"bg-emerald-500",border:"border-emerald-300", ring:"ring-emerald-300", bg:"bg-emerald-50",  text:"text-emerald-700" },
  cancelled:    { dot:"bg-gray-300",   border:"border-gray-200",    ring:"ring-gray-200",    bg:"bg-gray-50",     text:"text-gray-400"    },
};

// Natural flow — 2 targets per status, shown as move chips
const PRIMARY_MOVES: Record<TaskStatus, TaskStatus[]> = {
  not_started: ["in_progress", "blocked"],
  in_progress:  ["completed",   "blocked"],
  blocked:      ["in_progress", "not_started"],
  completed:    ["not_started", "in_progress"],
  cancelled:    [],
};

const MOVE_LABEL: Record<TaskStatus, string> = {
  not_started: "A Fazer",
  in_progress:  "Em Andamento",
  blocked:      "Bloqueado",
  completed:    "Concluído",
  cancelled:    "Cancelado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-lime-100 text-lime-700",
  "bg-sky-100 text-sky-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function sortByUrgency(ts: PpmTask[]): PpmTask[] {
  return [...ts].sort((a, b) => {
    const aLate = a.due_date && a.due_date < TODAY ? 0 : 1;
    const bLate = b.due_date && b.due_date < TODAY ? 0 : 1;
    if (aLate !== bLate) return aLate - bLate;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return  1;
    return a.task_name.localeCompare(b.task_name, "pt");
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-3/4" />
      <div className="h-2 bg-gray-100 rounded-full w-1/2" />
      <div className="flex items-center gap-2">
        <div className="h-[18px] w-[18px] bg-gray-100 rounded-full shrink-0" />
        <div className="h-2 bg-gray-100 rounded-full w-1/3" />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full" />
    </div>
  );
}

function SkeletonColumn({ col, count }: { col: typeof COLUMNS[number]; count: number }) {
  const Icon = col.icon;
  return (
    <div className={`min-w-[280px] w-[80vw] snap-start shrink-0 sm:w-[45vw] lg:min-w-0 lg:w-auto rounded-xl border ${col.border} flex flex-col overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${col.headerBg} border-b ${col.border} shrink-0`}>
        <Icon size={14} className={`${col.iconColor} opacity-40`} />
        <span className="text-sm font-semibold text-gray-400">{col.label}</span>
        <div className="ml-auto h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ─── Fetch error ──────────────────────────────────────────────────────────────

function FetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">Erro ao carregar tarefas</p>
        <p className="text-xs text-gray-400 mt-1">Verifique sua conexão e tente novamente.</p>
      </div>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  );
}

// ─── Task Drawer ──────────────────────────────────────────────────────────────

type DrawerForm = {
  task_name:      string;
  status:         TaskStatus;
  due_date:       string;
  start_date:     string;
  completion_pct: number;
  estimated_hours:string;
  actual_hours:   string;
  blocked_reason: string;
  notes:          string;
  is_deliverable: boolean;
};

function formFromTask(t: PpmTask): DrawerForm {
  return {
    task_name:       t.task_name,
    status:          t.status as TaskStatus,
    due_date:        t.due_date        ?? "",
    start_date:      t.start_date      ?? "",
    completion_pct:  t.completion_pct  ?? 0,
    estimated_hours: t.estimated_hours != null ? String(t.estimated_hours) : "",
    actual_hours:    t.actual_hours    != null ? String(t.actual_hours)    : "",
    blocked_reason:  t.blocked_reason  ?? "",
    notes:           t.notes           ?? "",
    is_deliverable:  t.is_deliverable  ?? false,
  };
}

function isDirtyForm(form: DrawerForm, task: PpmTask): boolean {
  const orig = formFromTask(task);
  return (Object.keys(orig) as (keyof DrawerForm)[]).some(k => form[k] !== orig[k]);
}

function TaskDrawer({
  task,
  onClose,
  onSave,
}: {
  task:    PpmTask;
  onClose: () => void;
  onSave:  (patch: Partial<PpmTask>) => Promise<void>;
}) {
  const [visible,         setVisible]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveErr,         setSaveErr]         = useState<string | null>(null);
  const [confirmDiscard,  setConfirmDiscard]  = useState(false);
  const [form,            setForm]            = useState<DrawerForm>(() => formFromTask(task));
  const nameRef  = useRef<HTMLTextAreaElement>(null);
  const isDirty  = useMemo(() => isDirtyForm(form, task), [form, task]);

  // Slide in
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Focus name on open
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Keyboard: Escape → close (with dirty guard), Cmd+Enter → save
  // Use refs so the effect runs only once but always sees fresh handlers
  const handleCloseRef = useRef<() => void>(() => {});
  const handleSaveRef  = useRef<() => Promise<void>>(async () => {});

  function closeWithAnimation() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleClose() {
    if (isDirty && !confirmDiscard) { setConfirmDiscard(true); return; }
    setConfirmDiscard(false);
    closeWithAnimation();
  }

  async function handleSave() {
    if (!form.task_name.trim()) { setSaveErr("O nome da tarefa é obrigatório."); return; }
    setSaving(true);
    setSaveErr(null);
    try {
      await onSave({
        task_name:       form.task_name.trim(),
        status:          form.status,
        due_date:        form.due_date        || undefined,
        start_date:      form.start_date      || undefined,
        completion_pct:  form.completion_pct,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
        actual_hours:    form.actual_hours    ? Number(form.actual_hours)    : 0,
        blocked_reason:  form.blocked_reason  || undefined,
        notes:           form.notes           || undefined,
        is_deliverable:  form.is_deliverable,
      });
      closeWithAnimation();
    } catch {
      setSaveErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // Keep refs fresh on every render
  handleCloseRef.current = handleClose;
  handleSaveRef.current  = handleSave;

  // Register keyboard listeners once — refs give access to latest handlers
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { handleCloseRef.current(); return; }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { void handleSaveRef.current(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // runs once — no memory leak

  function setField<K extends keyof DrawerForm>(key: K, val: DrawerForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setSaveErr(null);
    setConfirmDiscard(false);
  }

  const statusCol = COLUMNS.find(c => c.status === form.status);
  const style     = STATUS_STYLE[form.status as TaskStatus];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Panel — h-screen with dvh override via style */}
      <div
        style={{ height: "100dvh" }}
        className={`fixed right-0 top-0 h-screen w-full max-w-[440px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header — shows task name as primary label */}
        <div className={`px-5 pt-4 pb-3 border-b border-gray-100 shrink-0 ${statusCol?.headerBg ?? "bg-white"}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {task.project_name && (
                <p className="text-[10px] text-brand-500 font-medium mb-0.5 truncate uppercase tracking-wide">{task.project_name}</p>
              )}
              <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{task.task_name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {task.task_type === "milestone" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"><Flag size={8} />Marco</span>
                )}
                {task.task_type === "phase" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold"><Layers size={8} />Fase</span>
                )}
                {task.wbs_code && (
                  <span className="text-[10px] font-mono text-gray-400">{task.wbs_code}</span>
                )}
                {isDirty && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">editado</span>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Fechar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-[10px] text-gray-400 mt-2">
            <kbd className="font-mono bg-gray-100 px-1 rounded text-[9px]">Esc</kbd> fechar ·{" "}
            <kbd className="font-mono bg-gray-100 px-1 rounded text-[9px]">⌘ Enter</kbd> salvar
          </p>
        </div>

        {/* Discard confirmation strip */}
        {confirmDiscard && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 shrink-0">
            <p className="text-xs font-semibold text-amber-800 mb-2">Descartar alterações não salvas?</p>
            <div className="flex gap-2">
              <button
                onClick={closeWithAnimation}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={() => setConfirmDiscard(false)}
                className="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors"
              >
                Continuar editando
              </button>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Task name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome da Tarefa <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={nameRef}
              value={form.task_name}
              onChange={e => setField("task_name", e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full text-sm text-gray-900 font-medium border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 placeholder:text-gray-300"
              placeholder="Nome da tarefa…"
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{form.task_name.length}/300</p>
          </div>

          {/* Status picker — uses static STATUS_STYLE classes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["not_started","in_progress","blocked","completed"] as TaskStatus[]).map(s => {
                const st      = STATUS_STYLE[s];
                const label   = MOVE_LABEL[s];
                const active  = form.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField("status", s)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                      active
                        ? `${st.border} ${st.bg} ${st.text} shadow-sm ring-2 ring-offset-1 ${st.ring}`
                        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white",
                    ].join(" ")}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked reason */}
          {form.status === "blocked" && (
            <div>
              <label className="block text-xs font-semibold text-red-500 mb-1.5">Motivo do Bloqueio</label>
              <textarea
                value={form.blocked_reason}
                onChange={e => setField("blocked_reason", e.target.value)}
                rows={2}
                placeholder="Descreva o motivo do bloqueio…"
                className="w-full text-sm border border-red-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 placeholder:text-gray-300 bg-red-50/40"
              />
            </div>
          )}

          {/* Progress — slider + number input for precision */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Progresso</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0} max={100} step={1}
                  value={form.completion_pct}
                  onChange={e => setField("completion_pct", Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-14 text-center text-sm font-bold text-brand-600 border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <span className="text-sm font-bold text-brand-600">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0} max={100} step={1}
              value={form.completion_pct}
              onChange={e => setField("completion_pct", Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1"><Calendar size={11} />Início</span>
              </label>
              <input type="date" value={form.start_date} onChange={e => setField("start_date", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1"><Calendar size={11} />Entrega</span>
              </label>
              <input type="date" value={form.due_date} onChange={e => setField("due_date", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11} />Horas Est.</span>
              </label>
              <input type="number" min={0} step={0.5} value={form.estimated_hours}
                onChange={e => setField("estimated_hours", e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1"><Clock size={11} />Horas Reais</span>
              </label>
              <input type="number" min={0} step={0.5} value={form.actual_hours}
                onChange={e => setField("actual_hours", e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
            <textarea value={form.notes} onChange={e => setField("notes", e.target.value)}
              rows={3} placeholder="Observações, contexto, links…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 placeholder:text-gray-300"
            />
          </div>

          {/* Deliverable toggle */}
          <label className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-violet-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Entregável</p>
                <p className="text-[11px] text-gray-400">Marcar como entrega para o cliente</p>
              </div>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${form.is_deliverable ? "bg-violet-500" : "bg-gray-200"}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.is_deliverable ? "translate-x-4" : "translate-x-0"}`} />
              <input type="checkbox" className="sr-only" checked={form.is_deliverable} onChange={e => setField("is_deliverable", e.target.checked)} />
            </div>
          </label>

        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50/80">
          {saveErr && (
            <p className="text-[11px] text-red-600 mb-3 flex items-center gap-1">
              <AlertCircle size={11} /> {saveErr}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isDirty ? "Cancelar" : "Fechar"}
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" />Salvando…</>
                : <><Save size={14} />Salvar</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, isMoving, onMove, onEdit,
}: {
  task:     PpmTask;
  isMoving: boolean;
  onMove:   (status: TaskStatus) => void;
  onEdit:   () => void;
}) {
  const overdue      = task.due_date && task.due_date < TODAY && task.status !== "completed";
  const done         = task.status === "completed";
  const pct          = task.completion_pct ?? 0;
  const moveTargets  = PRIMARY_MOVES[task.status as TaskStatus] ?? [];

  return (
    <div
      className={[
        "group bg-white border rounded-xl shadow-sm transition-all duration-150 cursor-pointer",
        isMoving ? "opacity-40 scale-95 pointer-events-none" : "hover:shadow-md hover:border-brand-200",
        overdue  ? "border-red-200" : "border-gray-200",
        done     ? "opacity-70"     : "",
      ].join(" ")}
      onClick={onEdit}
    >
      <div className="p-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-xs font-semibold leading-snug flex-1 ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
            {task.task_name}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {task.task_type === "milestone" && (
              <span title="Marco" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"><Flag size={8} />Marco</span>
            )}
            {task.task_type === "phase" && (
              <span title="Fase" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold"><Layers size={8} />Fase</span>
            )}
            {task.is_deliverable && (
              <span title="Entregável" className="inline-flex items-center justify-center w-4 h-4 rounded bg-violet-100"><Package size={9} className="text-violet-600" /></span>
            )}
            {task.wbs_code && (
              <span className="text-[10px] font-mono text-gray-400">{task.wbs_code}</span>
            )}
            <span className="opacity-0 group-hover:opacity-60 transition-opacity">
              <Pencil size={11} className="text-brand-400" />
            </span>
          </div>
        </div>

        {/* Project */}
        {task.project_name && (
          <p className="text-[11px] text-brand-600 font-medium mb-2 truncate">{task.project_name}</p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1 mb-2">
          {task.assigned_name && (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold shrink-0 ${avatarColor(task.assigned_name)}`}>
                {initials(task.assigned_name)}
              </span>
              <span className="text-[11px] text-gray-600 truncate">{task.assigned_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className={overdue ? "text-red-400" : "text-gray-300"} />
              {overdue ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600">
                  <AlertCircle size={10} />Atrasado · {formatDateBR(task.due_date)}
                </span>
              ) : (
                <span className="text-[11px] text-gray-500">{formatDateBR(task.due_date)}</span>
              )}
            </div>
          )}
          {task.estimated_hours && (
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-gray-300" />
              <span className="text-[11px] text-gray-500">
                {task.actual_hours}h<span className="text-gray-400"> / {task.estimated_hours}h est.</span>
              </span>
            </div>
          )}
        </div>

        {/* Blocked reason */}
        {task.status === "blocked" && task.blocked_reason && (
          <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2 leading-relaxed">
            {task.blocked_reason}
          </p>
        )}

        {/* Progress */}
        {pct > 0 && pct < 100 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Progresso</span>
              <span className="text-[10px] font-semibold text-brand-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Move chips (2 natural targets only) — stopPropagation keeps drawer closed */}
      <div
        className="border-t border-gray-100 px-3 py-2 flex gap-1 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100"
        onClick={e => e.stopPropagation()}
      >
        {moveTargets.map(target => {
          const st = STATUS_STYLE[target];
          return (
            <button
              key={target}
              onClick={() => onMove(target)}
              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${st.border} ${st.text} hover:${st.bg}`}
            >
              <ChevronRight size={10} />
              {MOVE_LABEL[target]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,         setTasks]         = useState<PpmTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);
  const [moveError,     setMoveError]     = useState<string | null>(null);
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null);
  const [movingTaskId,  setMovingTaskId]  = useState<string | null>(null);
  const [editingTask,   setEditingTask]   = useState<PpmTask | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const [search,        setSearch]        = useState("");

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const res  = await fetch(`/api/ppm/tasks?${params}`);
      if (!res.ok) { setFetchError(true); return; }
      const json = await res.json();
      if (json.success) setTasks(json.data);
      else setFetchError(true);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  // ── Optimistic move ─────────────────────────────────────────────────────────

  const moveTask = useCallback(async (taskId: string, toStatus: TaskStatus) => {
    if (movingTaskId) return;
    // Snapshot via functional update — avoids stale closure
    let snapshot: PpmTask[] = [];
    setTasks(prev => { snapshot = prev; return prev.map(t => t.task_id === taskId ? { ...t, status: toStatus } : t); });
    setMovingTaskId(taskId);
    try {
      const res = await fetch("/api/ppm/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: toStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(snapshot);
      setMoveError("Não foi possível mover a tarefa. Tente novamente.");
    } finally {
      setMovingTaskId(null);
    }
  }, [movingTaskId]);

  // ── Save task (from drawer) — optimistic + success toast ───────────────────

  const saveTask = useCallback(async (taskId: string, patch: Partial<PpmTask>) => {
    let snapshot: PpmTask[] = [];
    setTasks(prev => { snapshot = prev; return prev.map(t => t.task_id === taskId ? { ...t, ...patch } : t); });
    try {
      const res = await fetch("/api/ppm/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, ...patch }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success && json.data) {
        setTasks(prev => prev.map(t => t.task_id === taskId ? json.data as PpmTask : t));
      }
      setSuccessMsg("Tarefa salva.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setTasks(snapshot);
      throw new Error("save_failed");
    }
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t =>
      t.task_name.toLowerCase().includes(q) ||
      t.assigned_name?.toLowerCase().includes(q) ||
      t.project_name?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const byStatus = useCallback(
    (status: TaskStatus) => sortByUrgency(filtered.filter(t => t.status === status)),
    [filtered],
  );

  const overdueCount = useMemo(
    () => tasks.filter(t => t.due_date && t.due_date < TODAY && t.status !== "completed").length,
    [tasks],
  );

  const projects = useMemo(
    () => [...new Map(tasks.map(t => [t.project_id, t.project_name])).entries()],
    [tasks],
  );

  const hasSearch = search.trim().length > 0;
  const noResults = hasSearch && filtered.length === 0;

  return (
    <div className="bg-gray-50 min-h-screen lg:h-screen lg:flex lg:flex-col">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Voltar">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Tarefas</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{tasks.length} tarefas</span>
                {!loading && overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    <AlertCircle size={10} />{overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 hidden sm:block">
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tarefas…" aria-label="Buscar tarefas"
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 placeholder:text-gray-400"
              />
              {hasSearch && (
                <button onClick={() => setSearch("")} aria-label="Limpar busca" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Todos os Projetos</option>
              {projects.map(([id, name]: [string, string | undefined]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <button disabled title="Em breve"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg opacity-40 cursor-not-allowed select-none"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="max-w-screen-2xl mx-auto mt-3 sm:hidden">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarefas…"
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 placeholder:text-gray-400"
            />
            {hasSearch && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>
            )}
          </div>
        </div>
      </header>

      {/* ── Toasts ────────────────────────────────────────────────────────────── */}
      {moveError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl animate-fade-in">
          <AlertCircle size={15} />{moveError}
          <button onClick={() => setMoveError(null)} aria-label="Fechar" className="ml-1 opacity-75 hover:opacity-100 transition-opacity"><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl animate-fade-in pointer-events-none">
          <CheckCheck size={15} />{successMsg}
        </div>
      )}

      {/* ── Edit drawer ───────────────────────────────────────────────────────── */}
      {editingTask && (
        <TaskDrawer
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={patch => saveTask(editingTask.task_id, patch)}
        />
      )}

      {/* ── Board ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full px-6 py-6 flex flex-col">
        {loading ? (
          <div className="-mx-6 px-6 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:h-full lg:mx-0 lg:px-0 lg:pb-0">
            {COLUMNS.map((col, i) => <SkeletonColumn key={col.status} col={col} count={[3,2,1,4][i]} />)}
          </div>
        ) : fetchError ? (
          <FetchError onRetry={() => void load()} />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><Search size={20} className="text-gray-400" /></div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-gray-400 mt-1">Sem resultados para <span className="font-medium text-gray-600">"{search}"</span></p>
            </div>
            <button onClick={() => setSearch("")} className="text-sm text-brand-600 hover:underline">Limpar busca</button>
          </div>
        ) : (
          <div className="-mx-6 px-6 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:h-full lg:mx-0 lg:px-0 lg:pb-0">
            {COLUMNS.map(col => {
              const colTasks   = byStatus(col.status);
              const colOverdue = col.status !== "completed"
                ? colTasks.filter(t => t.due_date && t.due_date < TODAY).length : 0;
              const Icon = col.icon;

              return (
                <div key={col.status} className={`min-w-[280px] w-[80vw] snap-start shrink-0 sm:min-w-[320px] sm:w-[45vw] lg:min-w-0 lg:w-auto flex flex-col lg:overflow-hidden rounded-xl border ${col.border} ${col.bg}`}>
                  <div className={`flex items-center gap-2 px-4 py-3 ${col.headerBg} border-b ${col.border} rounded-t-xl shrink-0`}>
                    <Icon size={14} className={col.iconColor} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {colOverdue > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-1.5 py-0.5 leading-none">
                          <AlertTriangle size={9} className="shrink-0" />{colOverdue}
                        </span>
                      )}
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 leading-none ${col.countBg}`}>{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 flex-1 lg:overflow-y-auto lg:overscroll-contain">
                    {colTasks.map(t => (
                      <TaskCard
                        key={t.task_id}
                        task={t}
                        isMoving={movingTaskId === t.task_id}
                        onMove={status => void moveTask(t.task_id, status)}
                        onEdit={() => setEditingTask(t)}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-gray-200 rounded-xl">
                        <ClipboardList size={20} className="text-gray-300" />
                        <p className="text-xs text-gray-400">Nenhuma tarefa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
