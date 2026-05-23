const links = {
  "Empresas": [
    { label: "JACQES", href: "#empresas" },
    { label: "Caza Vision", href: "#empresas" },
    { label: "AWQ Advisor", href: "#empresas" },
    { label: "AWQ Venture", href: "#empresas" },
    { label: "ENRD", href: "#empresas" },
  ],
  "Grupo": [
    { label: "Sobre o grupo",  href: "#sobre" },
    { label: "Nossa missão",   href: "#sobre" },
    { label: "Impacto & ESG",  href: "#impacto" },
    { label: "Carreiras",      href: "#carreiras" },
    { label: "Imprensa",       href: "mailto:imprensa@awq.com.br" },
  ],
  "Contato": [
    { label: "contato@awq.com.br",   href: "mailto:contato@awq.com.br" },
    { label: "carreiras@awq.com.br", href: "mailto:carreiras@awq.com.br" },
    { label: "LinkedIn",             href: "https://linkedin.com/company/awqgroup" },
    { label: "Instagram",            href: "https://instagram.com/awqgroup" },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 border-t border-white/[0.05]">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-16">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-gold-500 flex items-center justify-center">
                <span className="font-serif font-bold text-navy-950 text-base">A</span>
              </div>
              <div>
                <span className="block font-serif font-semibold text-white text-[15px] tracking-wide">AWQ</span>
                <span className="block text-[9px] tracking-[0.22em] text-gold-500 uppercase font-sans">Group</span>
              </div>
            </div>
            <p className="text-ink-300/35 font-sans text-sm leading-relaxed max-w-xs mb-8">
              Ecossistema de empresas focadas em crescimento, criatividade e impacto.
            </p>
            <span className="label text-[10px] text-ink-400/25">Brasil · Est. 2021</span>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([col, items]) => (
            <div key={col}>
              <h4 className="label text-[10px] text-ink-300/35 mb-5">{col}</h4>
              <ul className="flex flex-col gap-3">
                {items.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-ink-200/35 hover:text-white font-sans text-sm transition-colors duration-200"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-ink-400/25 font-sans text-xs">
            © {year} AWQ Group. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-ink-400/20 font-sans text-xs">
            <a href="#" className="hover:text-ink-300/40 transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-ink-300/40 transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
