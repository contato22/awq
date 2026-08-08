// Unidades de negócio — parcerias com outros advogados em segmentos
// diferentes do previdenciário/cível da Patrícia Canto (ex: trabalhista,
// tributário, empresarial). Cada lead/caso/lançamento/comunicação pode ser
// marcado com uma unidade (unidadeId); leads sem unidade (null) pertencem à
// prática principal da Patrícia Canto — sem migração de dado necessária.
export interface BusinessUnit {
  id: string;
  nome: string;
  advogadoResponsavel: string;
  segmento: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  dataCriacao: string;
}

export type NewBusinessUnitInput = Omit<BusinessUnit, "id" | "dataCriacao" | "ativo">;
