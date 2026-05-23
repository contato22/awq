const companies = [
  {
    id: "jacqes",
    name: "JACQES",
    tagline: "Agência de Marketing",
    description:
      "Estratégia, branding e performance para marcas que querem crescer com consistência. Da identidade ao resultado mensurável.",
    accent: "from-blue-500 to-awq-600",
    border: "border-awq-600/30",
    glow: "bg-awq-600/10",
    glowHover: "group-hover:bg-awq-600/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    tags: ["Branding", "Performance", "Social Media"],
    status: "Ativo",
  },
  {
    id: "caza",
    name: "Caza Vision",
    tagline: "Produtora de Conteúdo",
    description:
      "Vídeos publicitários, filmes institucionais, eventos ao vivo e conteúdo digital. Narrativa visual que converte.",
    accent: "from-emerald-500 to-teal-600",
    border: "border-emerald-600/30",
    glow: "bg-emerald-600/10",
    glowHover: "group-hover:bg-emerald-600/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    tags: ["Vídeo", "Live", "Conteúdo Digital"],
    status: "Ativo",
  },
  {
    id: "advisor",
    name: "AWQ Advisor",
    tagline: "Consultoria Estratégica",
    description:
      "Diagnóstico, estruturação e aceleração de negócios. Atuamos em estratégia, finanças e governança para empresas em crescimento.",
    accent: "from-violet-500 to-purple-600",
    border: "border-violet-600/30",
    glow: "bg-violet-600/10",
    glowHover: "group-hover:bg-violet-600/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    tags: ["Estratégia", "Finanças", "Governança"],
    status: "Ativo",
  },
  {
    id: "venture",
    name: "AWQ Venture",
    tagline: "Investimentos & Incubação",
    description:
      "Capital, mentoria e rede para founders early-stage. Investimos em startups onde tecnologia encontra propósito.",
    accent: "from-amber-500 to-orange-500",
    border: "border-amber-600/30",
    glow: "bg-amber-600/10",
    glowHover: "group-hover:bg-amber-600/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    tags: ["Venture Capital", "Incubação", "Mentoria"],
    status: "Ativo",
  },
  {
    id: "enrd",
    name: "ENRD",
    tagline: "Energia Solar",
    description:
      "Agência especializada em energia solar. Comercialização, projetos e financiamento para residências e empresas transitarem para energia limpa.",
    accent: "from-orange-500 to-yellow-500",
    border: "border-orange-600/30",
    glow: "bg-orange-600/10",
    glowHover: "group-hover:bg-orange-600/20",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    tags: ["Solar", "Energia Limpa", "ESG"],
    status: "Ativo",
  },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-32 relative">
      {/* Section glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 text-xs font-medium mb-6">
            Portfólio
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Nossas empresas
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Cinco verticais complementares que formam um ecossistema integrado de crescimento.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c, i) => (
            <div
              key={c.id}
              className={`group relative rounded-2xl border ${c.border} bg-white/[0.03] hover:bg-white/[0.06] p-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Card glow on hover */}
              <div
                className={`absolute inset-0 rounded-2xl ${c.glow} ${c.glowHover} transition-all duration-300 pointer-events-none`}
              />

              {/* Icon */}
              <div className={`relative inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${c.accent} text-white mb-5 shadow-lg`}>
                {c.icon}
              </div>

              {/* Name & tagline */}
              <div className="relative mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-lg">{c.name}</h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                    {c.status}
                  </span>
                </div>
                <p className={`text-sm font-medium bg-gradient-to-r ${c.accent} bg-clip-text text-transparent`}>
                  {c.tagline}
                </p>
              </div>

              {/* Description */}
              <p className="relative text-sm text-white/40 leading-relaxed mb-5">
                {c.description}
              </p>

              {/* Tags */}
              <div className="relative flex flex-wrap gap-2">
                {c.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-white/30 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Coming soon card */}
          <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col items-center justify-center text-center min-h-[240px]">
            <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm text-white/20 font-medium">Mais em breve</p>
            <p className="text-xs text-white/10 mt-1">O portfólio está crescendo.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
