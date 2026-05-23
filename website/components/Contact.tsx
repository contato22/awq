"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent";

const reasons = [
  "Trabalhar com o grupo",
  "Parceria comercial",
  "Investimento / M&A",
  "Imprensa",
  "Outro",
];

export default function Contact() {
  const [form, setForm]     = useState({ name: "", email: "", reason: reasons[0], message: "" });
  const [status, setStatus] = useState<Status>("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const subject = encodeURIComponent(`[${form.reason}] — ${form.name}`);
    const body    = encodeURIComponent(`Nome: ${form.name}\nEmail: ${form.email}\nMotivo: ${form.reason}\n\n${form.message}`);
    window.location.href = `mailto:contato@awq.com.br?subject=${subject}&body=${body}`;
    setTimeout(() => setStatus("sent"), 800);
  }

  return (
    <section id="contato" className="py-32 bg-navy-950 relative">
      {/* Top rule */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-gold-500/40 via-gold-500/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

          {/* Left */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="rule w-8" />
              <span className="label">Contato</span>
            </div>
            <h2
              className="font-serif text-white leading-tight mb-8"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
            >
              Vamos<br />
              <em className="text-gold-400 not-italic">conversar.</em>
            </h2>
            <p className="text-ink-200/45 font-sans text-base leading-relaxed mb-12 max-w-sm">
              Seja para uma parceria, proposta ou simplesmente para conhecer
              melhor o grupo — nossa caixa está aberta.
            </p>

            {/* Contact info */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-white/[0.08] flex items-center justify-center text-gold-500/60 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="label text-[10px] mb-0.5">E-mail</div>
                  <a href="mailto:contato@awq.com.br" className="text-ink-100/60 hover:text-white font-sans text-sm transition-colors">
                    contato@awq.com.br
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-white/[0.08] flex items-center justify-center text-gold-500/60 flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <div>
                  <div className="label text-[10px] mb-0.5">LinkedIn</div>
                  <a href="https://linkedin.com/company/awqgroup" target="_blank" rel="noopener noreferrer" className="text-ink-100/60 hover:text-white font-sans text-sm transition-colors">
                    AWQ Group
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label text-[10px] block mb-2">Nome</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="João Silva"
                  className="w-full bg-navy-800/60 border border-white/[0.08] focus:border-gold-500/50 px-4 py-3 text-sm font-sans text-white placeholder-ink-400/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="label text-[10px] block mb-2">E-mail</label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@empresa.com"
                  className="w-full bg-navy-800/60 border border-white/[0.08] focus:border-gold-500/50 px-4 py-3 text-sm font-sans text-white placeholder-ink-400/30 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="label text-[10px] block mb-2">Motivo do contato</label>
              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full bg-navy-800/60 border border-white/[0.08] focus:border-gold-500/50 px-4 py-3 text-sm font-sans text-ink-100/70 focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                {reasons.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="label text-[10px] block mb-2">Mensagem</label>
              <textarea
                required rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Conte o que tem em mente..."
                className="w-full bg-navy-800/60 border border-white/[0.08] focus:border-gold-500/50 px-4 py-3 text-sm font-sans text-white placeholder-ink-400/30 focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status !== "idle"}
              className="group flex items-center justify-center gap-3 w-full py-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-navy-950 font-sans font-semibold text-[13px] tracking-widest uppercase transition-all duration-200"
            >
              {status === "idle"    && <>Enviar mensagem <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></>}
              {status === "sending" && "Preparando..."}
              {status === "sent"    && "Mensagem pronta — verifique seu e-mail"}
            </button>

            <p className="text-center text-ink-400/30 font-sans text-xs">
              Respondemos em até 48 horas úteis.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
