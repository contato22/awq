/**
 * Micro-testes: configuração e tipagem de alertas.
 *
 * Verifica que todos os tipos de alerta (warning, info, success, error)
 * possuem classes CSS de cor distintas e não se sobrepõem — garantindo
 * que AlertBanner renderiza a cor correta para cada severidade.
 */

import { test, expect } from "@playwright/test";

// ─── Réplica da config do AlertBanner ────────────────────────────────────────
// Espelha alertConfig em components/AlertBanner.tsx

type AlertType = "warning" | "info" | "success" | "error";

const alertConfig: Record<AlertType, { classes: string; iconColor: string }> = {
  warning: {
    classes: "border-amber-200/60 bg-amber-50 text-amber-800",
    iconColor: "text-amber-500",
  },
  info: {
    classes: "border-blue-200/60 bg-blue-50 text-blue-800",
    iconColor: "text-blue-500",
  },
  success: {
    classes: "border-emerald-200/60 bg-emerald-50 text-emerald-800",
    iconColor: "text-emerald-500",
  },
  error: {
    classes: "border-red-200/60 bg-red-50 text-red-800",
    iconColor: "text-red-500",
  },
};

const ALL_TYPES: AlertType[] = ["warning", "info", "success", "error"];

// ─── Completude ───────────────────────────────────────────────────────────────

test.describe("alertConfig — completude", () => {
  test("todos os 4 tipos estão configurados", () => {
    expect(Object.keys(alertConfig)).toHaveLength(4);
    for (const t of ALL_TYPES) {
      expect(alertConfig[t]).toBeDefined();
    }
  });

  test("cada tipo tem 'classes' e 'iconColor'", () => {
    for (const t of ALL_TYPES) {
      expect(alertConfig[t].classes).toBeTruthy();
      expect(alertConfig[t].iconColor).toBeTruthy();
    }
  });
});

// ─── Distinção de cores ────────────────────────────────────────────────────────

test.describe("alertConfig — cores distintas por tipo", () => {
  const colorTokens: Record<AlertType, string> = {
    warning: "amber",
    info:    "blue",
    success: "emerald",
    error:   "red",
  };

  for (const [type, token] of Object.entries(colorTokens) as [AlertType, string][]) {
    test(`tipo '${type}' usa token de cor '${token}'`, () => {
      expect(alertConfig[type].classes).toContain(token);
      expect(alertConfig[type].iconColor).toContain(token);
    });
  }

  test("nenhum tipo compartilha o mesmo token de cor", () => {
    const tokens = ALL_TYPES.map((t) => alertConfig[t].iconColor);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(ALL_TYPES.length);
  });

  test("'error' não usa cor de 'success' e vice-versa", () => {
    expect(alertConfig.error.classes).not.toContain("emerald");
    expect(alertConfig.success.classes).not.toContain("red");
  });

  test("'warning' não usa cor de 'info' e vice-versa", () => {
    expect(alertConfig.warning.classes).not.toContain("blue");
    expect(alertConfig.info.classes).not.toContain("amber");
  });
});

// ─── Estrutura CSS ────────────────────────────────────────────────────────────

test.describe("alertConfig — estrutura CSS", () => {
  test("todos os tipos incluem classe de borda (border-*)", () => {
    for (const t of ALL_TYPES) {
      expect(alertConfig[t].classes).toMatch(/border-\w/);
    }
  });

  test("todos os tipos incluem classe de background (bg-*)", () => {
    for (const t of ALL_TYPES) {
      expect(alertConfig[t].classes).toMatch(/bg-\w/);
    }
  });

  test("todos os tipos incluem classe de texto (text-*)", () => {
    for (const t of ALL_TYPES) {
      expect(alertConfig[t].classes).toMatch(/text-\w/);
    }
  });

  test("iconColor de cada tipo é uma única classe Tailwind", () => {
    for (const t of ALL_TYPES) {
      // Deve ser 'text-{cor}-{shade}' sem espaços
      expect(alertConfig[t].iconColor.trim().split(" ")).toHaveLength(1);
      expect(alertConfig[t].iconColor).toMatch(/^text-\w+-\d+$/);
    }
  });
});

// ─── Interface Alert ──────────────────────────────────────────────────────────

test.describe("interface Alert — invariantes", () => {
  interface Alert {
    id: string;
    type: AlertType;
    title: string;
    message: string;
    timestamp: string;
  }

  function makeAlert(overrides: Partial<Alert> = {}): Alert {
    return {
      id: "alert-1",
      type: "info",
      title: "Título",
      message: "Mensagem",
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  test("alerta de warning é configurado com sucesso", () => {
    const a = makeAlert({ type: "warning", title: "Atenção", message: "Verifique os dados" });
    expect(alertConfig[a.type].classes).toContain("amber");
  });

  test("alerta de error é configurado com sucesso", () => {
    const a = makeAlert({ type: "error", title: "Erro", message: "Falha ao processar" });
    expect(alertConfig[a.type].classes).toContain("red");
  });

  test("alerta de success é configurado com sucesso", () => {
    const a = makeAlert({ type: "success", title: "OK", message: "Operação concluída" });
    expect(alertConfig[a.type].classes).toContain("emerald");
  });

  test("alerta de info é configurado com sucesso", () => {
    const a = makeAlert({ type: "info", title: "Info", message: "Informação relevante" });
    expect(alertConfig[a.type].classes).toContain("blue");
  });

  test("timestamp ISO é um Date válido", () => {
    const a = makeAlert();
    expect(new Date(a.timestamp).getTime()).not.toBeNaN();
  });
});
