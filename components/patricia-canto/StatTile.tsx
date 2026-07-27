"use client";

export default function StatTile({
  label,
  value,
  variant = "default",
  icon,
}: {
  label: string;
  value: string;
  variant?: "default" | "accent" | "warn";
  icon?: React.ReactNode;
}) {
  const styles =
    variant === "warn"
      ? { box: "border-amber-200 bg-amber-50", chip: "bg-amber-100 text-amber-700", value: "text-amber-700" }
      : variant === "accent"
        ? { box: "border-canto-200 bg-canto-50", chip: "bg-canto-tan/40 text-canto-800", value: "text-canto-700" }
        : { box: "border-canto-200 bg-canto-50", chip: "bg-canto-100 text-canto-600", value: "text-canto-900" };

  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${styles.box}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.chip}`}>{icon}</span>
        )}
        <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
      </div>
      <p className={`mt-1.5 text-lg font-bold ${styles.value}`}>{value}</p>
    </div>
  );
}
