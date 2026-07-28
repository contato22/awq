"use client";

import type { TaskItem } from "@/lib/patricia-canto/my-tasks";

const SEVERITY_STYLE: Record<TaskItem["severity"], { dot: string; text: string; label: string }> = {
  overdue: { dot: "bg-rose-500", text: "text-rose-600", label: "Atrasado" },
  today: { dot: "bg-canto-600", text: "text-canto-700", label: "Hoje" },
  upcoming: { dot: "bg-canto-300", text: "text-canto-500", label: "Pendente" },
};

export default function MyTasksPanel({
  title,
  subtitle,
  tasks,
}: {
  title: string;
  subtitle: string;
  tasks: TaskItem[];
}) {
  return (
    <div className="rounded-xl border border-canto-line bg-white p-5">
      <h3 className="font-canto-serif text-lg text-canto-900">{title}</h3>
      <p className="mt-0.5 text-xs text-canto-500">{subtitle}</p>

      {tasks.length === 0 ? (
        <p className="mt-3 text-xs text-canto-500">Tudo em dia — nenhuma pendência no momento.</p>
      ) : (
        <ul className="mt-3 divide-y divide-canto-line">
          {tasks.map((task) => {
            const style = SEVERITY_STYLE[task.severity];
            return (
              <li key={task.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-canto-900">{task.label}</p>
                  <p className="truncate text-xs text-canto-500">{task.detail}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>
                  {style.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
