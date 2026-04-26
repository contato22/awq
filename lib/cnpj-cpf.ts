// ─── CNPJ / CPF — validação algorítmica e formatação ─────────────────────────

export function validateCNPJ(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const digit = (cnpj: string, n: number): number => {
    let sum = 0, pos = n - 7;
    for (let i = n; i >= 1; i--) {
      sum += parseInt(cnpj[n - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return digit(d, 12) === parseInt(d[12]) && digit(d, 13) === parseInt(d[13]);
}

export function validateCPF(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  if (rem !== parseInt(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  return rem === parseInt(d[10]);
}

export function validateDoc(raw: string, tipo: string): boolean {
  if (tipo === "estrangeiro") return raw.trim().length > 0;
  const d = raw.replace(/\D/g, "");
  if (tipo === "pj") return validateCNPJ(d);
  return validateCPF(d) || validateCNPJ(d); // pf / mei
}

export function formatCNPJ(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatDoc(raw: string, tipo: string): string {
  const d = raw.replace(/\D/g, "");
  if (tipo === "pj")          return formatCNPJ(d);
  if (tipo === "pf")          return formatCPF(d);
  if (tipo === "mei")         return d.length > 11 ? formatCNPJ(d) : formatCPF(d);
  return raw; // estrangeiro — sem máscara
}

export function docPlaceholder(tipo: string): string {
  if (tipo === "pj")  return "00.000.000/0001-00";
  if (tipo === "mei") return "000.000.000-00";
  if (tipo === "pf")  return "000.000.000-00";
  return "Nº de identificação";
}
