"use client";

import { useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    // Mailto fallback — replace with real API endpoint when ready
    const mailtoLink = `mailto:contato@awq.com.br?subject=Contato via awq.com.br — ${encodeURIComponent(form.name)}&body=${encodeURIComponent(`Nome: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailtoLink;
    setStatus("sent");
  }

  return (
    <section id="contato" className="py-32 relative">
      {/* Divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-awq-700/10 blur-[80px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 text-xs font-medium mb-6">
              Contato
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
              Vamos conversar?
            </h2>
            <p className="text-white/40 text-base leading-relaxed mb-10">
              Se você quer trabalhar com uma das nossas empresas, investir junto, ou
              simplesmente trocar uma ideia — a nossa caixa de entrada está aberta.
            </p>

            {/* Contact links */}
            <div className="flex flex-col gap-4">
              <a
                href="mailto:contato@awq.com.br"
                className="flex items-center gap-3 text-white/50 hover:text-white transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 group-hover:border-awq-600/40 group-hover:bg-awq-600/10 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm">contato@awq.com.br</span>
              </a>
              <a
                href="https://linkedin.com/company/awqgroup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/50 hover:text-white transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 group-hover:border-awq-600/40 group-hover:bg-awq-600/10 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <span className="text-sm">LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Right — Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/30 font-medium mb-2">Seu nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="João Silva"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-awq-600/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/30 font-medium mb-2">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@empresa.com.br"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-awq-600/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/30 font-medium mb-2">Mensagem</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Conte um pouco sobre o que você tem em mente..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-awq-600/50 focus:bg-white/[0.06] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              className="w-full py-3.5 rounded-xl bg-awq-600 hover:bg-awq-500 disabled:opacity-50 text-white font-semibold text-sm transition-all duration-200 shadow-xl shadow-awq-600/20 hover:-translate-y-0.5"
            >
              {status === "idle" && "Enviar mensagem"}
              {status === "sending" && "Abrindo e-mail..."}
              {status === "sent" && "Mensagem preparada!"}
            </button>

            <p className="text-center text-xs text-white/20">
              Respondemos em até 48 horas úteis.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
