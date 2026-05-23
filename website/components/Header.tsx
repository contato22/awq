"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Início", href: "#hero" },
  { label: "Empresas", href: "#portfolio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080810]/90 backdrop-blur-md border-b border-white/5 shadow-xl shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-awq-600 flex items-center justify-center shadow-lg shadow-awq-600/30">
            <span className="text-white font-bold text-sm tracking-tight">A</span>
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">AWQ</span>
          <span className="text-white/30 font-light text-sm hidden sm:block">Group</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="#contato"
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-awq-600 hover:bg-awq-500 text-white text-sm font-medium transition-colors duration-200 shadow-lg shadow-awq-600/20"
        >
          Fale conosco
        </a>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d1f] border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contato"
            onClick={() => setMenuOpen(false)}
            className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-awq-600 text-white text-sm font-medium"
          >
            Fale conosco
          </a>
        </div>
      )}
    </header>
  );
}
