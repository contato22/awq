/**
 * Micro-testes: validação e formatação de documentos brasileiros (CNPJ / CPF).
 *
 * Cobre: validateCNPJ, validateCPF, validateDoc,
 *        formatCNPJ, formatCPF, formatDoc, docPlaceholder.
 *
 * Não requer browser nem servidor — roda com PLAYWRIGHT_PROJECT=unit.
 */

import { test, expect } from "@playwright/test";
import {
  validateCNPJ,
  validateCPF,
  validateDoc,
  formatCNPJ,
  formatCPF,
  formatDoc,
  docPlaceholder,
} from "../../lib/cnpj-cpf";

// ─── validateCNPJ ─────────────────────────────────────────────────────────────

test.describe("validateCNPJ", () => {
  test("aceita CNPJ válido sem formatação", () => {
    expect(validateCNPJ("11444777000161")).toBe(true);
  });

  test("aceita CNPJ válido formatado", () => {
    expect(validateCNPJ("11.444.777/0001-61")).toBe(true);
  });

  test("aceita segundo dígito verificador correto", () => {
    expect(validateCNPJ("60.701.190/0001-04")).toBe(true);
  });

  test("rejeita CNPJ com todos os dígitos iguais", () => {
    expect(validateCNPJ("11.111.111/1111-11")).toBe(false);
    expect(validateCNPJ("00000000000000")).toBe(false);
    expect(validateCNPJ("99999999999999")).toBe(false);
  });

  test("rejeita CNPJ com comprimento errado", () => {
    expect(validateCNPJ("1144477700016")).toBe(false);   // 13 dígitos
    expect(validateCNPJ("114447770001610")).toBe(false); // 15 dígitos
    expect(validateCNPJ("")).toBe(false);
  });

  test("rejeita dígito verificador incorreto", () => {
    expect(validateCNPJ("11444777000162")).toBe(false);
    expect(validateCNPJ("11444777000160")).toBe(false);
  });

  test("ignora caracteres não numéricos na validação", () => {
    expect(validateCNPJ("11.444.777/0001-61")).toBe(true);
    expect(validateCNPJ("11 444 777 0001 61")).toBe(true);
  });
});

// ─── validateCPF ─────────────────────────────────────────────────────────────

test.describe("validateCPF", () => {
  test("aceita CPF válido sem formatação", () => {
    expect(validateCPF("52998224725")).toBe(true);
  });

  test("aceita CPF válido formatado", () => {
    expect(validateCPF("529.982.247-25")).toBe(true);
  });

  test("aceita segundo CPF de referência", () => {
    expect(validateCPF("111.444.777-35")).toBe(true);
  });

  test("rejeita CPF com todos os dígitos iguais", () => {
    expect(validateCPF("111.111.111-11")).toBe(false);
    expect(validateCPF("00000000000")).toBe(false);
    expect(validateCPF("99999999999")).toBe(false);
  });

  test("rejeita CPF com comprimento errado", () => {
    expect(validateCPF("5299822472")).toBe(false);   // 10 dígitos
    expect(validateCPF("529982247250")).toBe(false); // 12 dígitos
    expect(validateCPF("")).toBe(false);
  });

  test("rejeita primeiro dígito verificador incorreto", () => {
    expect(validateCPF("52998224735")).toBe(false);
  });

  test("rejeita segundo dígito verificador incorreto", () => {
    expect(validateCPF("52998224724")).toBe(false);
  });

  test("ignora caracteres não numéricos na validação", () => {
    expect(validateCPF("529.982.247-25")).toBe(true);
    expect(validateCPF("529 982 247 25")).toBe(true);
  });
});

// ─── validateDoc ──────────────────────────────────────────────────────────────

test.describe("validateDoc", () => {
  test("tipo 'pj' valida como CNPJ", () => {
    expect(validateDoc("11.444.777/0001-61", "pj")).toBe(true);
    expect(validateDoc("52998224725", "pj")).toBe(false); // CPF inválido como CNPJ
  });

  test("tipo 'pf' aceita CPF válido", () => {
    expect(validateDoc("529.982.247-25", "pf")).toBe(true);
  });

  test("tipo 'pf' aceita CNPJ válido (MEI registrado como pf)", () => {
    expect(validateDoc("11.444.777/0001-61", "pf")).toBe(true);
  });

  test("tipo 'mei' aceita CPF ou CNPJ válido", () => {
    expect(validateDoc("529.982.247-25", "mei")).toBe(true);
    expect(validateDoc("11.444.777/0001-61", "mei")).toBe(true);
  });

  test("tipo 'estrangeiro' aceita qualquer string não vazia", () => {
    expect(validateDoc("PASSPORT-123", "estrangeiro")).toBe(true);
    expect(validateDoc("A1B2C3", "estrangeiro")).toBe(true);
    expect(validateDoc("  ", "estrangeiro")).toBe(false);
    expect(validateDoc("", "estrangeiro")).toBe(false);
  });

  test("rejeita documentos inválidos para tipo pj", () => {
    expect(validateDoc("00.000.000/0000-00", "pj")).toBe(false);
    expect(validateDoc("11.111.111/1111-11", "pj")).toBe(false);
  });
});

// ─── formatCNPJ ──────────────────────────────────────────────────────────────

test.describe("formatCNPJ", () => {
  test("formata CNPJ de 14 dígitos corretamente", () => {
    expect(formatCNPJ("11444777000161")).toBe("11.444.777/0001-61");
  });

  test("formata CNPJ já formatado (idempotente)", () => {
    expect(formatCNPJ("11.444.777/0001-61")).toBe("11.444.777/0001-61");
  });

  test("formata parcialmente com menos de 14 dígitos", () => {
    expect(formatCNPJ("11")).toBe("11");
    expect(formatCNPJ("114")).toBe("11.4");
    expect(formatCNPJ("11444")).toBe("11.444");
    expect(formatCNPJ("114447")).toBe("11.444.7");
    expect(formatCNPJ("11444777")).toBe("11.444.777");
    expect(formatCNPJ("114447770001")).toBe("11.444.777/0001");
  });

  test("trunca dígitos excedentes além de 14", () => {
    expect(formatCNPJ("114447770001619999")).toBe("11.444.777/0001-61");
  });

  test("retorna string vazia para entrada vazia", () => {
    expect(formatCNPJ("")).toBe("");
  });
});

// ─── formatCPF ────────────────────────────────────────────────────────────────

test.describe("formatCPF", () => {
  test("formata CPF de 11 dígitos corretamente", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  test("formata CPF já formatado (idempotente)", () => {
    expect(formatCPF("529.982.247-25")).toBe("529.982.247-25");
  });

  test("formata parcialmente com menos de 11 dígitos", () => {
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("529982")).toBe("529.982");
    expect(formatCPF("5299822")).toBe("529.982.2");
    expect(formatCPF("52998224")).toBe("529.982.24");
    expect(formatCPF("5299822472")).toBe("529.982.247-2");
  });

  test("trunca dígitos excedentes além de 11", () => {
    expect(formatCPF("529982247259999")).toBe("529.982.247-25");
  });

  test("retorna string vazia para entrada vazia", () => {
    expect(formatCPF("")).toBe("");
  });
});

// ─── formatDoc ────────────────────────────────────────────────────────────────

test.describe("formatDoc", () => {
  test("tipo 'pj' usa formatação CNPJ", () => {
    expect(formatDoc("11444777000161", "pj")).toBe("11.444.777/0001-61");
  });

  test("tipo 'pf' usa formatação CPF", () => {
    expect(formatDoc("52998224725", "pf")).toBe("529.982.247-25");
  });

  test("tipo 'mei' usa CPF para até 11 dígitos", () => {
    expect(formatDoc("52998224725", "mei")).toBe("529.982.247-25");
  });

  test("tipo 'mei' usa CNPJ para mais de 11 dígitos", () => {
    expect(formatDoc("11444777000161", "mei")).toBe("11.444.777/0001-61");
  });

  test("tipo 'estrangeiro' retorna o valor bruto sem formatação", () => {
    expect(formatDoc("PASSAPORTE-XYZ", "estrangeiro")).toBe("PASSAPORTE-XYZ");
    expect(formatDoc("A1B2C3", "estrangeiro")).toBe("A1B2C3");
  });
});

// ─── docPlaceholder ───────────────────────────────────────────────────────────

test.describe("docPlaceholder", () => {
  test("retorna máscara CNPJ para 'pj'", () => {
    expect(docPlaceholder("pj")).toBe("00.000.000/0001-00");
  });

  test("retorna máscara CPF para 'mei'", () => {
    expect(docPlaceholder("mei")).toBe("000.000.000-00");
  });

  test("retorna máscara CPF para 'pf'", () => {
    expect(docPlaceholder("pf")).toBe("000.000.000-00");
  });

  test("retorna label genérico para 'estrangeiro'", () => {
    expect(docPlaceholder("estrangeiro")).toBe("Nº de identificação");
  });

  test("retorna label genérico para tipo desconhecido", () => {
    expect(docPlaceholder("outro")).toBe("Nº de identificação");
  });
});
