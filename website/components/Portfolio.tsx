const companies = [
  {
    index: "01",
    name: "JACQES",
    type: "Agência de Marketing",
    description:
      "Estratégia, branding e performance para marcas que querem crescer com consistência. Da identidade visual ao resultado mensurável.",
    services: ["Branding", "Performance", "Social Media", "Estratégia"],
    status: "Ativo",
    accent: "#3B6FE8",
  },
  {
    index: "02",
    name: "Caza Vision",
    type: "Produtora de Conteúdo",
    description:
      "Vídeos publicitários, filmes institucionais, cobertura de eventos e conteúdo digital. Narrativa visual que conecta e converte.",
    services: ["Vídeo Publicitário", "Eventos", "Conteúdo Digital", "Fotografia"],
    status: "Ativo",
    accent: "#2A9D6E",
  },
  {
    index: "03",
    name: "AWQ Advisor",
    type: "Consultoria Estratégica",
    description:
      "Diagnóstico, estruturação e aceleração de negócios. Estratégia, finanças e governança para empresas em crescimento acelerado.",
    services: ["Estratégia", "Finanças", "Governança", "Aceleração"],
    status: "Ativo",
    accent: "#8B5CF6",
  },
  {
    index: "04",
    name: "AWQ Venture",
    type: "Investimentos & Incubação",
    description:
      "Capital, mentoria e rede para founders early-stage. Investimos em startups onde tecnologia encontra propósito e escalabilidade.",
    services: ["Venture Capital", "Incubação", "Mentoria", "Deal Flow"],
    status: "Ativo",
    accent: "#C9A140",
  },
  {
    index: "05",
    name: "ENRD",
    type: "Energia Solar",
    description:
      "Agência especializada em energia solar fotovoltaica. Projetos, financiamento e instalação para residências e empresas.",
    services: ["Energia Solar", "Projetos FV", "Financiamento", "ESG"],
    status: "Ativo",
    accent: "#E8832A",
  },
];

export default function Portfolio() {
  return (
    <section id="empresas" className="py-32 bg-navy-950">
      <div className="max-w-7xl mx-auto px-8">

        {/* Section header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="rule w-8" />
              <span className="label">Portfólio</span>
            </div>
            <h2
              className="font-serif text-white leading-tight"
              style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}
            >
              Nossas empresas
            </h2>
          </div>
          <p className="max-w-sm text-ink-300/45 font-sans text-sm leading-relaxed lg:text-right">
            Cinco verticais complementares que formam um ecossistema integrado —
            cada empresa resolve um problema real.
          </p>
        </div>

        {/* Companies list */}
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {companies.map((c) => (
            <div
              key={c.index}
              className="group grid grid-cols-1 lg:grid-cols-[80px_1fr_1fr_200px] gap-6 lg:gap-10 py-10 hover:bg-navy-900/50 transition-colors duration-300 -mx-4 px-4"
            >
              {/* Index */}
              <div className="flex items-start pt-1">
                <span className="font-serif text-gold-500/30 text-2xl font-medium group-hover:text-gold-500/60 transition-colors">
                  {c.index}
                </span>
              </div>

              {/* Name + type */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.accent }}
                  />
                  <span className="text-[11px] font-sans font-medium tracking-widest uppercase"
                    style={{ color: c.accent }}>
                    {c.type}
                  </span>
                </div>
                <h3 className="font-serif text-white text-2xl lg:text-3xl font-medium leading-tight">
                  {c.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-ink-200/45 font-sans text-sm leading-relaxed self-center">
                {c.description}
              </p>

              {/* Services */}
              <div className="flex flex-wrap content-start gap-2">
                {c.services.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] font-sans tracking-wide text-ink-300/40 border border-white/[0.07] px-2.5 py-1 group-hover:border-white/[0.12] transition-colors"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom rule */}
        <div className="mt-0 h-px bg-gradient-to-r from-gold-500/30 via-transparent to-transparent" />
      </div>
    </section>
  );
}
