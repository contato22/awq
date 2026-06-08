/**
 * Inventário inicial do Caza Vision — seed one-shot.
 * Fonte: planilha "INVENTÁRIO AWQ" do Google Sheets (gid=1174195480).
 * Reproduz exatamente as 51 linhas com SKUs CV-<CAT>-NNN gerados na mesma
 * ordem que o importador CSV produziria.
 */

export type SeedItem = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  sale_price: number | null;
  stock_qty: number;
  min_stock: number;
  description: string | null;
};

export const CAZA_VISION_SEED: SeedItem[] = [
  { sku: "CV-CAM-001",  name: "Camera Sony FX3", category: "CÂMERAS", unit: "un", unit_cost: 26872.41, sale_price: 22000, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-COMP-001", name: "Macbook Air M3", category: "COMPUTADORES", unit: "un", unit_cost: 5000, sale_price: 3250, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-LENS-001", name: "Tamron 35-150mm F/2-2.8 Di Iii Vxd Lens (sony E) Cor Preto Tipo De Montagem Sony", category: "LENTES", unit: "un", unit_cost: 9490.32, sale_price: 12000, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-LENS-002", name: "Lente Grande Angular Viltrox AF 16mm F1.8 FE Montagem E para Sony", category: "LENTES", unit: "un", unit_cost: 3890, sale_price: 2900, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CARD-001", name: "Cartão SD 64gb Sandisk", category: "CARTÕES", unit: "un", unit_cost: 220, sale_price: 190, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-CARD-002", name: "Cartão SD 64gb Sandisk", category: "CARTÕES", unit: "un", unit_cost: 220, sale_price: 190, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-CARD-003", name: "Cartão SD 128gb Sandisk", category: "CARTÕES", unit: "un", unit_cost: 180, sale_price: 130, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-CARD-004", name: "Cartão SD 128gb Sandisk", category: "CARTÕES", unit: "un", unit_cost: 180, sale_price: 130, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-LUZ-001",  name: "Tocha de Luz Aputure Amaran 200X", category: "LUZES", unit: "un", unit_cost: 2082.8, sale_price: 1980, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-LUZ-002",  name: "Refletor Led Nanlite Forza 60b Ii Bi-color 2700k-6500k", category: "LUZES", unit: "un", unit_cost: 2800, sale_price: 1000, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-LUZ-003",  name: "Yongnuo 360", category: "LUZES", unit: "un", unit_cost: 900, sale_price: 780, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-CAB-001",  name: "HUB USB C", category: "CABOS", unit: "un", unit_cost: 165, sale_price: 150, stock_qty: 1, min_stock: 0, description: "Mercado Livre" },
  { sku: "CV-CAB-002",  name: "2 Cabos Usb c", category: "CABOS", unit: "un", unit_cost: 60, sale_price: 40, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-ADP-001",  name: "Adaptador Apple Lightning - Cartao SD", category: "ADAPTADORES", unit: "un", unit_cost: 180, sale_price: 150, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-ADP-002",  name: "Anel Adaptador de Filtro K&F", category: "ADAPTADORES", unit: "un", unit_cost: 75, sale_price: 35, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-BAT-001",  name: "2x Baterias e 1x Lapela Sony", category: "BATERIAS", unit: "un", unit_cost: 1089, sale_price: 850, stock_qty: 1, min_stock: 0, description: "OLX" },
  { sku: "CV-GMB-001",  name: "GIMBAL SCORP-C", category: "GIMBALS", unit: "un", unit_cost: 892.15, sale_price: 700, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-001",  name: "Hollyland Lark 150", category: "ÁUDIO", unit: "un", unit_cost: 2040, sale_price: 1700, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-002",  name: "Hollyland Lark M2", category: "ÁUDIO", unit: "un", unit_cost: 1200, sale_price: 950, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-003",  name: "Gravador Zoom H1N", category: "ÁUDIO", unit: "un", unit_cost: 500, sale_price: 350, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-004",  name: "Fone Audio Technica M20X", category: "ÁUDIO", unit: "un", unit_cost: 407.57, sale_price: 380, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-005",  name: "Vara de Boom Jieyang JY500C", category: "ÁUDIO", unit: "un", unit_cost: 829.55, sale_price: 490, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-AUD-006",  name: "Adaptador Vara de Boom Tripe", category: "ÁUDIO", unit: "un", unit_cost: 123.79, sale_price: 40, stock_qty: 1, min_stock: 0, description: "Mercado livre" },
  { sku: "CV-CASE-001", name: "Case para Material Audio", category: "CASES", unit: "un", unit_cost: 87.71, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CASE-002", name: "Cabeça de Tripe Smallrig", category: "CASES", unit: "un", unit_cost: 478.97, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CASE-003", name: "Case Patola com Estojo", category: "CASES", unit: "un", unit_cost: 1200, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CASE-004", name: "Case Patola com Espuma", category: "CASES", unit: "un", unit_cost: 900, sale_price: null, stock_qty: 1, min_stock: 0, description: "Mercado livre" },
  { sku: "CV-CASE-005", name: "Smallrig Adaptador Tophandle", category: "CASES", unit: "un", unit_cost: 184.36, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CAB-003",  name: "Cabo USB-C Lightning DJI", category: "CABOS", unit: "un", unit_cost: 81.56, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-BAT-002",  name: "4 Baterias Protby NP-970", category: "BATERIAS", unit: "un", unit_cost: 453.49, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-001",  name: "Canivete Smallrig", category: "ACESSÓRIOS", unit: "un", unit_cost: 95.9, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-002",  name: "Baseplate Tilta FX3", category: "ACESSÓRIOS", unit: "un", unit_cost: 837.01, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-003",  name: "Longarina FX3", category: "ACESSÓRIOS", unit: "un", unit_cost: 128.35, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-TRI-001",  name: "Tripe de Luz K&F", category: "TRIPÉ", unit: "un", unit_cost: 292.88, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-004",  name: "Tomada Baseus USB C", category: "ACESSÓRIOS", unit: "un", unit_cost: 87.93, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-CHG-001",  name: "Carregador Bateria A7iii", category: "CARREGADOR", unit: "un", unit_cost: 174.63, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-005",  name: "Skin FX3", category: "ACESSÓRIOS", unit: "un", unit_cost: 176.23, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-ACC-006",  name: "Cabeça de Efeito", category: "ACESSÓRIOS", unit: "un", unit_cost: 253.01, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-MOD-001",  name: "Rebatedor", category: "MODIFICADOR DE LUZ", unit: "un", unit_cost: 209.99, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-STO-001",  name: "HD Externo 4TB Seagate", category: "ARMAZENAMENTO", unit: "un", unit_cost: 576, sale_price: 350, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-STO-002",  name: "HD Externo 4TB Seagate", category: "ARMAZENAMENTO", unit: "un", unit_cost: 576, sale_price: 350, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-CAM-002",  name: "HandyCam - Sony FullHd", category: "CÂMERAS", unit: "un", unit_cost: 350, sale_price: null, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-STO-003",  name: "HD Externo 4TB Seagate", category: "ARMAZENAMENTO", unit: "un", unit_cost: 0, sale_price: null, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-OFF-001",  name: "Cadeira de Escritório Ergonomica Presidente premium", category: "ESCRITÓRIO", unit: "un", unit_cost: 699, sale_price: null, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-OFF-002",  name: "Pé Base de Mesa industrial Tampo redondo quadrado até 180 X 90 cor preto", category: "ESCRITÓRIO", unit: "un", unit_cost: 288, sale_price: null, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-OFF-003",  name: "Persianas", category: "ESCRITÓRIO", unit: "un", unit_cost: 1000, sale_price: null, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-OFF-004",  name: "Trilhos de Iluminação", category: "ESCRITÓRIO", unit: "un", unit_cost: 400, sale_price: null, stock_qty: 1, min_stock: 0, description: "Marketplace" },
  { sku: "CV-OFF-005",  name: "Cadeira Herman Miller", category: "ESCRITÓRIO", unit: "un", unit_cost: 3000, sale_price: 2000, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-OFF-006",  name: "Apoio de Pés", category: "ESCRITÓRIO", unit: "un", unit_cost: 60, sale_price: 50, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-OFF-007",  name: "Monitor", category: "ESCRITÓRIO", unit: "un", unit_cost: 500, sale_price: 400, stock_qty: 1, min_stock: 0, description: null },
  { sku: "CV-OFF-008",  name: "Monitor FeelWorld", category: "ESCRITÓRIO", unit: "un", unit_cost: 1000, sale_price: 500, stock_qty: 1, min_stock: 0, description: null },
];
