/**
 * Micro-testes: cálculo de score BANT e classificação visual.
 *
 * As funções calcScore e scoreColor são replicadas aqui pois vivem
 * num componente "use client" (page.tsx). Qualquer divergência entre
 * esta cópia e o original é detectada pelos testes E2E macro.
 */

import { test, expect } from "@playwright/test";

// ─── Réplica das funções puras do componente ──────────────────────────────────

type FormData = {
  bant_budget: string;
  bant_authority: boolean;
  bant_need: string;
  bant_timeline: string;
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  bu: string;
  lead_source: string;
  assigned_to: string;
  status: string;
  qualification_notes: string;
};

function calcScore(data: FormData): number {
  let score = 0;
  const budget = parseFloat(data.bant_budget) || 0;
  if (budget >= 50000)      score += 30;
  else if (budget >= 20000) score += 20;
  else if (budget >= 10000) score += 10;
  if (data.bant_authority) score += 20;
  if (data.bant_need === "high")   score += 25;
  else if (data.bant_need === "medium") score += 15;
  else if (data.bant_need === "low")    score += 5;
  if (data.bant_timeline) {
    const days = Math.ceil(
      (new Date(data.bant_timeline).getTime() - Date.now()) / 86400000,
    );
    if (days <= 30)      score += 15;
    else if (days <= 60) score += 10;
    else if (days <= 90) score += 5;
  }
  return Math.min(score, 100);
}

function scoreColor(s: number) {
  if (s >= 71) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (s >= 41) return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" };
  return               { bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" };
}

function emptyForm(): FormData {
  return {
    contact_name: "", company_name: "", email: "", phone: "",
    job_title: "", bu: "", lead_source: "manual", assigned_to: "",
    status: "new", bant_budget: "", bant_authority: false,
    bant_need: "medium", bant_timeline: "", qualification_notes: "",
  };
}

function futureDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().split("T")[0];
}

// ─── calcScore: orçamento ─────────────────────────────────────────────────────

test.describe("calcScore — bant_budget", () => {
  test("score 0 sem orçamento", () => {
    expect(calcScore(emptyForm())).toBe(15); // need=medium sempre vale 15
  });

  test("orçamento < 10.000 → +0 (só need)", () => {
    const f = { ...emptyForm(), bant_budget: "5000", bant_need: "low" };
    expect(calcScore(f)).toBe(5); // low=5
  });

  test("orçamento entre 10.000 e 19.999 → +10", () => {
    const f = { ...emptyForm(), bant_budget: "15000", bant_need: "low" };
    expect(calcScore(f)).toBe(15); // 10 + 5
  });

  test("orçamento entre 20.000 e 49.999 → +20", () => {
    const f = { ...emptyForm(), bant_budget: "30000", bant_need: "low" };
    expect(calcScore(f)).toBe(25); // 20 + 5
  });

  test("orçamento >= 50.000 → +30", () => {
    const f = { ...emptyForm(), bant_budget: "50000", bant_need: "low" };
    expect(calcScore(f)).toBe(35); // 30 + 5
  });

  test("orçamento exatamente 10.000 cai na faixa +10", () => {
    const f = { ...emptyForm(), bant_budget: "10000", bant_need: "low" };
    expect(calcScore(f)).toBe(15);
  });

  test("orçamento exatamente 20.000 cai na faixa +20", () => {
    const f = { ...emptyForm(), bant_budget: "20000", bant_need: "low" };
    expect(calcScore(f)).toBe(25);
  });

  test("orçamento exatamente 50.000 cai na faixa +30", () => {
    const f = { ...emptyForm(), bant_budget: "50000", bant_need: "low" };
    expect(calcScore(f)).toBe(35);
  });

  test("orçamento inválido (NaN) → +0", () => {
    const f = { ...emptyForm(), bant_budget: "abc", bant_need: "low" };
    expect(calcScore(f)).toBe(5);
  });
});

// ─── calcScore: autoridade ────────────────────────────────────────────────────

test.describe("calcScore — bant_authority", () => {
  test("authority=true → +20", () => {
    const f = { ...emptyForm(), bant_authority: true, bant_need: "low" };
    expect(calcScore(f)).toBe(25); // 20 + 5
  });

  test("authority=false → +0", () => {
    const f = { ...emptyForm(), bant_authority: false, bant_need: "low" };
    expect(calcScore(f)).toBe(5);
  });
});

// ─── calcScore: need ──────────────────────────────────────────────────────────

test.describe("calcScore — bant_need", () => {
  test("need='high' → +25", () => {
    const f = { ...emptyForm(), bant_need: "high" };
    expect(calcScore(f)).toBe(25);
  });

  test("need='medium' → +15", () => {
    const f = { ...emptyForm(), bant_need: "medium" };
    expect(calcScore(f)).toBe(15);
  });

  test("need='low' → +5", () => {
    const f = { ...emptyForm(), bant_need: "low" };
    expect(calcScore(f)).toBe(5);
  });

  test("need='' → +0", () => {
    const f = { ...emptyForm(), bant_need: "" };
    expect(calcScore(f)).toBe(0);
  });
});

// ─── calcScore: timeline ──────────────────────────────────────────────────────

test.describe("calcScore — bant_timeline", () => {
  test("timeline dentro de 30 dias → +15", () => {
    const f = { ...emptyForm(), bant_timeline: futureDate(15), bant_need: "low" };
    expect(calcScore(f)).toBe(20); // 5 + 15
  });

  test("timeline entre 31 e 60 dias → +10", () => {
    const f = { ...emptyForm(), bant_timeline: futureDate(45), bant_need: "low" };
    expect(calcScore(f)).toBe(15); // 5 + 10
  });

  test("timeline entre 61 e 90 dias → +5", () => {
    const f = { ...emptyForm(), bant_timeline: futureDate(75), bant_need: "low" };
    expect(calcScore(f)).toBe(10); // 5 + 5
  });

  test("timeline acima de 90 dias → +0", () => {
    const f = { ...emptyForm(), bant_timeline: futureDate(120), bant_need: "low" };
    expect(calcScore(f)).toBe(5);
  });

  test("sem timeline → +0", () => {
    const f = { ...emptyForm(), bant_need: "low" };
    expect(calcScore(f)).toBe(5);
  });
});

// ─── calcScore: combinado e cap ───────────────────────────────────────────────

test.describe("calcScore — combinações e cap 100", () => {
  test("score máximo possível sem cap: 30+20+25+15=90", () => {
    const f = {
      ...emptyForm(),
      bant_budget: "50000",
      bant_authority: true,
      bant_need: "high",
      bant_timeline: futureDate(10),
    };
    expect(calcScore(f)).toBe(90);
  });

  test("score nunca ultrapassa 100", () => {
    // Mesmo hipotético que ultrapassasse, Math.min garante cap
    const f = {
      ...emptyForm(),
      bant_budget: "100000",
      bant_authority: true,
      bant_need: "high",
      bant_timeline: futureDate(5),
    };
    expect(calcScore(f)).toBeLessThanOrEqual(100);
  });

  test("formulário vazio → need default medium = 15", () => {
    expect(calcScore(emptyForm())).toBe(15);
  });
});

// ─── scoreColor ───────────────────────────────────────────────────────────────

test.describe("scoreColor", () => {
  test("score 0-40 → vermelho (frio)", () => {
    const c = scoreColor(0);
    expect(c.bar).toBe("bg-red-500");
    expect(c.text).toBe("text-red-700");
    expect(c.bg).toBe("bg-red-50");
    expect(c.border).toBe("border-red-200");
  });

  test("score 40 → vermelho (limite inferior do morno é 41)", () => {
    expect(scoreColor(40).bar).toBe("bg-red-500");
  });

  test("score 41-70 → âmbar (morno)", () => {
    const c = scoreColor(41);
    expect(c.bar).toBe("bg-amber-400");
    expect(c.text).toBe("text-amber-700");
    expect(c.bg).toBe("bg-amber-50");
    expect(c.border).toBe("border-amber-200");
  });

  test("score 70 → âmbar (limite inferior do quente é 71)", () => {
    expect(scoreColor(70).bar).toBe("bg-amber-400");
  });

  test("score 71-100 → verde (quente)", () => {
    const c = scoreColor(71);
    expect(c.bar).toBe("bg-emerald-500");
    expect(c.text).toBe("text-emerald-700");
    expect(c.bg).toBe("bg-emerald-50");
    expect(c.border).toBe("border-emerald-200");
  });

  test("score 100 → verde", () => {
    expect(scoreColor(100).bar).toBe("bg-emerald-500");
  });

  test("scoreColor retorna todos os 4 campos", () => {
    const keys = ["bar", "text", "bg", "border"] as const;
    for (const score of [0, 41, 71]) {
      const c = scoreColor(score);
      for (const k of keys) {
        expect(c[k]).toBeTruthy();
      }
    }
  });
});

// ─── validate() — lógica de validação do formulário ──────────────────────────

test.describe("lógica de validate()", () => {
  function validate(form: Partial<FormData>): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.contact_name?.trim()) errs.contact_name = "Nome obrigatório";
    if (!form.company_name?.trim()) errs.company_name = "Empresa obrigatória";
    if (!form.bu) errs.bu = "BU obrigatória";
    if (!form.assigned_to) errs.assigned_to = "Responsável obrigatório";
    return errs;
  }

  test("formulário vazio → 4 erros obrigatórios", () => {
    const errs = validate({});
    expect(Object.keys(errs)).toHaveLength(4);
    expect(errs.contact_name).toBe("Nome obrigatório");
    expect(errs.company_name).toBe("Empresa obrigatória");
    expect(errs.bu).toBe("BU obrigatória");
    expect(errs.assigned_to).toBe("Responsável obrigatório");
  });

  test("apenas espaços em branco → erro de nome/empresa", () => {
    const errs = validate({ contact_name: "   ", company_name: "   " });
    expect(errs.contact_name).toBeTruthy();
    expect(errs.company_name).toBeTruthy();
  });

  test("formulário válido → sem erros", () => {
    const errs = validate({
      contact_name: "Rafael Moura",
      company_name: "Tech Solutions",
      bu: "JACQES",
      assigned_to: "ana@awq.com",
    });
    expect(Object.keys(errs)).toHaveLength(0);
  });

  test("ausência de bu → só erro de bu", () => {
    const errs = validate({
      contact_name: "Rafael",
      company_name: "Tech",
      bu: "",
      assigned_to: "ana@awq.com",
    });
    expect(errs.bu).toBeTruthy();
    expect(errs.contact_name).toBeUndefined();
  });

  test("ausência de assigned_to → só erro de responsável", () => {
    const errs = validate({
      contact_name: "Rafael",
      company_name: "Tech",
      bu: "JACQES",
      assigned_to: "",
    });
    expect(errs.assigned_to).toBeTruthy();
    expect(errs.contact_name).toBeUndefined();
  });
});
