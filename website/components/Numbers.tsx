const stats = [
  { value: "5",   label: "Empresas ativas",         detail: "em 3 setores distintos" },
  { value: "4+",  label: "Anos de operação",        detail: "fundado em 2021" },
  { value: "10+", label: "Clientes ativos",          detail: "portfolio consolidado" },
  { value: "1",   label: "Ecossistema integrado",   detail: "complementaridade por design" },
];

export default function Numbers() {
  return (
    <section className="relative bg-navy-900 border-y border-white/[0.05]">
      {/* Top gold line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.05]">
          {stats.map((s, i) => (
            <div key={i} className="py-12 px-8 group">
              <div
                className="font-serif font-bold text-gold-400 leading-none mb-3"
                style={{ fontSize: "clamp(40px, 4vw, 64px)" }}
              >
                {s.value}
              </div>
              <div className="text-white font-sans font-medium text-sm mb-1">{s.label}</div>
              <div className="text-ink-400/50 font-sans text-xs">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
