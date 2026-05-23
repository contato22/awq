"use client";

import { useState, useEffect } from "react";

const nav = [
  { label: "Empresas",        href: "#empresas" },
  { label: "Sobre",           href: "#sobre" },
  { label: "Impacto",         href: "#impacto" },
  { label: "Carreiras",       href: "#carreiras" },
  { label: "Contato",         href: "#contato" },
];

export default function Header() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-navy-950/95 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-[72px] flex items-center justify-between">

        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-9 h-9 rounded-sm bg-gold-500 flex items-center justify-center overflow-hidden">
            <span className="font-serif font-bold text-navy-950 text-base leading-none">A</span>
            <div className="absolute inset-0 bg-gold-300 opacity-0 group-hover:opacity-20 transition-opacity" />
          </div>
          <div className="leading-tight">
            <span className="block font-serif font-semibold text-white text-[15px] tracking-wide">AWQ</span>
            <span className="block text-[9px] tracking-[0.22em] text-gold-500 uppercase font-sans font-medium">Group</span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-sans text-ink-200/60 hover:text-white transition-colors duration-200 tracking-wide"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="#contato"
          className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 border border-gold-500/50 hover:border-gold-400 hover:bg-gold-500/10 text-gold-400 hover:text-gold-300 text-[12px] font-sans font-medium tracking-widest uppercase transition-all duration-200"
        >
          Fale conosco
        </a>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-ink-200/60 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-navy-900 border-t border-white/[0.06] px-8 py-8 flex flex-col gap-6">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-ink-200/60 hover:text-white text-sm font-sans tracking-wide transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contato"
            onClick={() => setMenuOpen(false)}
            className="inline-flex justify-center items-center px-5 py-3 border border-gold-500/50 text-gold-400 text-xs font-sans tracking-widest uppercase"
          >
            Fale conosco
          </a>
        </div>
      )}
    </header>
  );
}
