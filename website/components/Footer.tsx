export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-awq-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-white/60 font-medium text-sm">AWQ Group</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-white/25">
            <a href="#portfolio" className="hover:text-white/50 transition-colors">Empresas</a>
            <a href="#sobre" className="hover:text-white/50 transition-colors">Sobre</a>
            <a href="#contato" className="hover:text-white/50 transition-colors">Contato</a>
            <a href="mailto:contato@awq.com.br" className="hover:text-white/50 transition-colors">
              contato@awq.com.br
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/15">
            © {year} AWQ Group. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
