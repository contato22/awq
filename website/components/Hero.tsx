export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-end pb-24 overflow-hidden bg-navy-950"
    >
      {/* Deep background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,#0E1E31_0%,#040C17_70%)]" />
      </div>

      {/* Vertical rule left */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent pointer-events-none hidden lg:block" />

      {/* Corner label — top right */}
      <div className="absolute top-8 right-8 hidden lg:flex flex-col items-end gap-1 pointer-events-none">
        <span className="label text-ink-300/30">Est. 2021</span>
        <span className="label text-ink-300/30">Brasil</span>
      </div>

      {/* Large background wordmark */}
      <div
        className="absolute bottom-0 right-0 select-none pointer-events-none overflow-hidden"
        aria-hidden
      >
        <span
          className="font-serif font-bold text-white/[0.025] leading-none block"
          style={{ fontSize: "clamp(120px, 22vw, 320px)" }}
        >
          AWQ
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">

        {/* Label */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in">
          <span className="rule w-10 animate-line-grow" />
          <span className="label">Grupo AWQ · Plataforma Central</span>
        </div>

        {/* Headline */}
        <h1
          className="font-serif text-white leading-[1.05] tracking-tight mb-8 animate-fade-up"
          style={{ fontSize: "clamp(44px, 7vw, 104px)", animationDelay: "0.1s" }}
        >
          Construímos<br />
          <em className="text-gold-400 not-italic">empresas que</em><br />
          geram impacto.
        </h1>

        {/* Divider */}
        <div className="w-24 h-px bg-gold-500/40 mb-8 animate-fade-in" style={{ animationDelay: "0.25s" }} />

        {/* Subheadline + CTAs row */}
        <div
          className="flex flex-col lg:flex-row lg:items-end gap-10 lg:gap-20 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="max-w-md text-ink-200/50 font-sans text-base lg:text-lg leading-relaxed">
            O Grupo AWQ reúne empresas complementares em agência, produção de
            conteúdo, consultoria, energia limpa e investimentos — um ecossistema
            construído para crescer junto.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <a
              href="#empresas"
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-sans font-semibold text-[13px] tracking-wider uppercase transition-all duration-200"
            >
              Nossas empresas
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="#sobre"
              className="inline-flex items-center gap-3 px-7 py-3.5 border border-white/10 hover:border-white/20 text-ink-100/60 hover:text-white font-sans font-medium text-[13px] tracking-wider uppercase transition-all duration-200"
            >
              Sobre o grupo
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="hidden lg:flex items-center gap-3 mt-20 animate-fade-in"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-gold-500/60 to-transparent" />
          <span className="label text-ink-300/25 text-[10px]">scroll</span>
        </div>
      </div>
    </section>
  );
}
