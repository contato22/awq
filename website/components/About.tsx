const values = [
  {
    title: "Resultado real",
    description: "Métricas que importam, não vaidade. Cada empresa do grupo é avaliada por crescimento sustentável e geração de caixa.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Ecossistema integrado",
    description: "As empresas do grupo se fortalecem mutuamente. Clientes, aprendizados e recursos fluem entre as verticais.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    title: "Transparência radical",
    description: "Dados, finanças e decisões abertas internamente. Governança sólida como base para crescimento duradouro.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: "Velocidade com qualidade",
    description: "Executamos rápido sem negligenciar o padrão. Iteração constante orientada por dados e feedback real do mercado.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const stats = [
  { value: "5", label: "Empresas ativas" },
  { value: "2021", label: "Fundado em" },
  { value: "BR", label: "Brasil" },
  { value: "∞", label: "Ambição" },
];

export default function About() {
  return (
    <section id="sobre" className="py-32 relative">
      {/* Divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left — text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 text-xs font-medium mb-6">
              Sobre o grupo
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
              Um grupo construído{" "}
              <span className="text-white/30">por empreendedores,</span>{" "}
              para empreendedores.
            </h2>
            <p className="text-white/40 text-base leading-relaxed mb-6">
              O AWQ Group nasceu da convicção de que empresas boas deveriam ter acesso às mesmas
              ferramentas, pessoas e capital que as grandes corporações. Somos um grupo de
              empreendedores que construímos negócios do zero e aprendemos na prática o que
              funciona.
            </p>
            <p className="text-white/40 text-base leading-relaxed mb-10">
              Cada empresa do portfólio resolve um problema real. Juntas, elas formam um
              ecossistema onde o crescimento de uma potencializa as demais. Esse é o modelo
              AWQ: complementaridade com propósito.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-xs text-white/30">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] p-5 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-awq-600/20 text-awq-400 flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{v.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
