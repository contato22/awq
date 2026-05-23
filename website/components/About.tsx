const pillars = [
  {
    number: "01",
    title: "Resultado acima de tudo",
    body:  "Métricas que importam, não vaidade. Crescimento sustentável e geração de caixa real como norte de cada decisão.",
  },
  {
    number: "02",
    title: "Ecossistema integrado",
    body:  "Clientes, aprendizados e recursos fluem entre as verticais. O crescimento de uma empresa potencializa as demais.",
  },
  {
    number: "03",
    title: "Transparência radical",
    body:  "Dados, finanças e decisões abertas internamente. Governança sólida como fundação para crescimento duradouro.",
  },
  {
    number: "04",
    title: "Velocidade com qualidade",
    body:  "Executamos rápido sem negligenciar o padrão. Iteração orientada por dados e feedback real do mercado.",
  },
];

export default function About() {
  return (
    <section id="sobre" className="py-32 bg-navy-900 relative overflow-hidden">
      {/* Decorative large serif text */}
      <div
        className="absolute -right-8 top-1/2 -translate-y-1/2 font-serif font-bold text-white/[0.02] select-none pointer-events-none leading-none"
        aria-hidden
        style={{ fontSize: "clamp(80px, 14vw, 200px)" }}
      >
        GRUPO
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">

        {/* Header row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="rule w-8" />
              <span className="label">Sobre o grupo</span>
            </div>
            <h2
              className="font-serif text-white leading-tight"
              style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
            >
              Construído por<br />
              <em className="text-gold-400 not-italic">empreendedores,</em><br />
              para empreendedores.
            </h2>
          </div>

          <div className="flex flex-col justify-end gap-5">
            <p className="text-ink-200/45 font-sans text-base leading-relaxed">
              O AWQ Group nasceu da convicção de que boas empresas deveriam ter
              acesso às mesmas ferramentas, pessoas e capital que as grandes
              corporações. Somos empreendedores que construímos negócios do zero
              e aprendemos na prática o que funciona.
            </p>
            <p className="text-ink-200/45 font-sans text-base leading-relaxed">
              Cada empresa do portfólio resolve um problema real. Juntas, elas
              formam um ecossistema onde o crescimento de uma amplifica as
              demais. Esse é o modelo AWQ: complementaridade com propósito.
            </p>
          </div>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/[0.06]">
          {pillars.map((p, i) => (
            <div
              key={p.number}
              className={`p-8 group hover:bg-navy-800/60 transition-colors duration-300 ${
                i < 3 ? "border-r border-white/[0.06]" : ""
              }`}
            >
              <span className="font-serif text-gold-500/25 text-4xl font-medium block mb-6 group-hover:text-gold-500/50 transition-colors">
                {p.number}
              </span>
              <h3 className="text-white font-sans font-semibold text-sm mb-3 leading-snug">
                {p.title}
              </h3>
              <p className="text-ink-300/40 font-sans text-sm leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Mission statement */}
        <div className="mt-20 pt-16 border-t border-white/[0.05]">
          <div className="max-w-3xl">
            <span className="label block mb-6">Nossa missão</span>
            <blockquote
              className="font-serif text-white/70 italic leading-relaxed"
              style={{ fontSize: "clamp(20px, 2.5vw, 32px)" }}
            >
              "Construir um grupo de empresas que genuinamente melhora a vida
              de clientes, colaboradores e comunidades — com disciplina
              financeira, criatividade e propósito."
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
