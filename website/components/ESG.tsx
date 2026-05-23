const commitments = [
  {
    area: "Ambiental",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    items: [
      "Portfolio de energia solar (ENRD) reduz emissões de CO₂ de clientes",
      "Operações internas com foco em eficiência e redução de resíduos",
      "Metas de carbono neutro até 2030",
    ],
  },
  {
    area: "Social",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    items: [
      "Programa de mentorias para empreendedores de primeira geração",
      "Geração de emprego e renda em ecossistemas locais",
      "Incentivo à diversidade nos times e portfólio",
    ],
  },
  {
    area: "Governança",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    items: [
      "Demonstrações financeiras mensais auditadas internamente",
      "Tomada de decisão baseada em dados e transparência total",
      "Código de conduta e política de conflito de interesses",
    ],
  },
];

export default function ESG() {
  return (
    <section id="impacto" className="py-32 bg-navy-950 relative">
      {/* Gold top border */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-gold-500/40 via-gold-500/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-8">

        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="rule w-8" />
              <span className="label">Impacto & ESG</span>
            </div>
            <h2
              className="font-serif text-white leading-tight"
              style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
            >
              Crescer com<br />
              <em className="text-gold-400 not-italic">responsabilidade.</em>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="text-ink-200/45 font-sans text-base leading-relaxed max-w-lg">
              Acreditamos que crescimento econômico e impacto positivo não são
              opostos. Cada empresa do grupo carrega compromissos ambientais,
              sociais e de governança como parte do modelo de negócio.
            </p>
          </div>
        </div>

        {/* Commitments grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-white/[0.06]">
          {commitments.map((c, i) => (
            <div
              key={c.area}
              className={`p-10 ${i < 2 ? "lg:border-r border-white/[0.06]" : ""} ${i > 0 ? "border-t lg:border-t-0 border-white/[0.06]" : ""}`}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 border border-gold-500/30 flex items-center justify-center text-gold-500">
                  {c.icon}
                </div>
                <h3 className="font-serif text-white text-xl">{c.area}</h3>
              </div>
              <ul className="flex flex-col gap-4">
                {c.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-gold-500/60 mt-2 flex-shrink-0" />
                    <span className="text-ink-200/40 font-sans text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
