const openings = [
  { role: "Gestor de Tráfego",    bu: "JACQES",      type: "CLT / PJ" },
  { role: "Diretor de Arte",      bu: "Caza Vision",  type: "PJ" },
  { role: "Analista Financeiro",  bu: "AWQ Group",    type: "CLT" },
  { role: "Técnico em Solar FV",  bu: "ENRD",         type: "CLT" },
];

export default function Careers() {
  return (
    <section id="carreiras" className="py-32 bg-navy-900 relative overflow-hidden">
      {/* Background number */}
      <div
        className="absolute -left-4 top-1/2 -translate-y-1/2 font-serif font-bold text-white/[0.02] select-none pointer-events-none leading-none"
        aria-hidden
        style={{ fontSize: "clamp(100px, 20vw, 280px)" }}
      >
        JOIN
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

          {/* Left — statement */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="rule w-8" />
              <span className="label">Carreiras</span>
            </div>
            <h2
              className="font-serif text-white leading-tight mb-8"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
            >
              Faça parte de<br />
              algo que está<br />
              <em className="text-gold-400 not-italic">sendo construído.</em>
            </h2>
            <p className="text-ink-200/45 font-sans text-base leading-relaxed mb-10 max-w-md">
              Buscamos pessoas que se importam com resultado, gostam de aprender
              rápido e não têm medo de trabalho duro. Se isso é você, queremos
              conversar.
            </p>
            <a
              href="mailto:carreiras@awq.com.br"
              className="group inline-flex items-center gap-3 text-gold-400 hover:text-gold-300 font-sans text-sm font-medium tracking-wide transition-colors"
            >
              <span>Enviar currículo</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Right — openings */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="label">Vagas abertas</span>
              <span className="font-serif text-gold-500/40 text-sm">{openings.length} posições</span>
            </div>

            <div className="flex flex-col divide-y divide-white/[0.05]">
              {openings.map((o) => (
                <a
                  key={o.role}
                  href="mailto:carreiras@awq.com.br"
                  className="group flex items-center justify-between py-5 hover:bg-navy-800/40 -mx-4 px-4 transition-colors duration-200"
                >
                  <div>
                    <div className="text-white font-sans font-medium text-sm mb-1 group-hover:text-gold-300 transition-colors">
                      {o.role}
                    </div>
                    <div className="text-ink-300/40 font-sans text-xs">{o.bu}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-sans tracking-widest text-ink-300/30 border border-white/[0.07] px-2.5 py-1">
                      {o.type}
                    </span>
                    <svg className="w-4 h-4 text-gold-500/30 group-hover:text-gold-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.05]">
              <p className="text-ink-300/30 font-sans text-xs leading-relaxed">
                Não encontrou sua vaga? Envie seu currículo para{" "}
                <a href="mailto:carreiras@awq.com.br" className="text-gold-500/60 hover:text-gold-400 transition-colors">
                  carreiras@awq.com.br
                </a>{" "}
                — mantemos banco de talentos ativo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
