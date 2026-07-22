"use client";

export default function StatTile({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "accent" | "warn";
}) {
  const styles =
    variant === "warn"
      ? { box: "border-amber-300 bg-amber-50", value: "text-amber-700" }
      : variant === "accent"
        ? { box: "border-canto-200 bg-canto-50", value: "text-canto-700" }
        : { box: "border-canto-200 bg-canto-50", value: "text-canto-900" };

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${styles.box}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${styles.value}`}>{value}</p>
    </div>
  );
}
