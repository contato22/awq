export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background mesh gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-awq-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-700/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-awq-950/40 rounded-full blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-awq-500/30 bg-awq-500/10 text-awq-400 text-xs font-medium mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-awq-400 animate-pulse" />
          Grupo AWQ · Brasil
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6 animate-fade-up">
          Construímos{" "}
          <span className="bg-gradient-to-r from-awq-400 to-violet-400 bg-clip-text text-transparent">
            empresas
          </span>
          <br />
          que geram impacto.
        </h1>

        {/* Subheading */}
        <p
          className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          O Grupo AWQ reúne empresas de agência, produção de conteúdo, consultoria,
          energia limpa e investimentos. Um ecossistema construído para crescer junto.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href="#portfolio"
            className="px-8 py-3.5 rounded-xl bg-awq-600 hover:bg-awq-500 text-white font-semibold text-sm transition-all duration-200 shadow-xl shadow-awq-600/30 hover:shadow-awq-500/40 hover:-translate-y-0.5"
          >
            Conheça nossas empresas
          </a>
          <a
            href="#sobre"
            className="px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 text-white/70 hover:text-white font-medium text-sm transition-all duration-200"
          >
            Sobre o grupo
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-fade-in" style={{ animationDelay: "1s" }}>
          <span className="text-xs tracking-widest uppercase">scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
