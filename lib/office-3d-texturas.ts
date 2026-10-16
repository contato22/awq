import * as THREE from "three";

/**
 * Texturas procedurais (geradas em `<canvas>`, sem nenhum arquivo externo) para o Modo 3D do
 * Office. Cada uma é criada uma única vez e cacheada no módulo — todas as salas e todos os
 * personagens reaproveitam a mesma textura (poucas texturas compartilhadas, não uma por
 * instância), o que mantém o custo de memória de vídeo baixo mesmo com várias salas visíveis
 * ao mesmo tempo na visão do andar.
 */

function criarCanvas(tam: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = tam;
  canvas.height = tam;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  return { canvas, ctx };
}

let _madeira: THREE.CanvasTexture | null = null;
/** Piso de madeira (tábuas corridas com veios e juntas), tom mel — mesmo espírito do piso 2D. */
export function texturaMadeira(): THREE.CanvasTexture {
  if (_madeira) return _madeira;
  const { canvas, ctx } = criarCanvas(256);
  ctx.fillStyle = "#c9a876";
  ctx.fillRect(0, 0, 256, 256);
  const tab = 32;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * (tab / 2);
    ctx.fillStyle = row % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)";
    ctx.fillRect(0, row * 32, 256, 32);
    for (let col = -1; col < 9; col++) {
      const x = col * tab + offset;
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(x, row * 32, 1.2, 32);
    }
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, row * 32, 256, 1);
  }
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, w = 6 + Math.random() * 20;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "60,38,18" : "255,230,180"},${(0.03 + Math.random() * 0.05).toFixed(3)})`;
    ctx.fillRect(x, y, w, 0.8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _madeira = tex;
  return tex;
}

let _tijolo: THREE.CanvasTexture | null = null;
/** Parede de tijolo aparente, pra wainscot/pilar — inspirada na referência de arquitetura. */
export function texturaTijolo(): THREE.CanvasTexture {
  if (_tijolo) return _tijolo;
  const { canvas, ctx } = criarCanvas(256);
  ctx.fillStyle = "#9a6a52";
  ctx.fillRect(0, 0, 256, 256);
  const bw = 34, bh = 15;
  for (let row = -1; row * bh < 256 + bh; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col * bw < 256 + bw; col++) {
      const x = col * bw + offset, y = row * bh;
      const tom = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = `rgba(${Math.round(154 * tom)},${Math.round(90 * tom)},${Math.round(68 * tom)},1)`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  ctx.strokeStyle = "rgba(230,220,205,0.55)";
  ctx.lineWidth = 2;
  for (let row = -1; row * bh < 256 + bh; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col * bw < 256 + bw; col++) {
      ctx.strokeRect(col * bw + offset, row * bh, bw, bh);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  _tijolo = tex;
  return tex;
}

let _tapete: THREE.CanvasTexture | null = null;
/** Tapete com borda e textura de trama — a cor final vem do `color` do material (tingimento
 * por tema), esta textura só dá a borda/ruído de tecido. */
export function texturaTapete(): THREE.CanvasTexture {
  if (_tapete) return _tapete;
  const { canvas, ctx } = criarCanvas(256);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 188, 188);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.05).toFixed(3)})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _tapete = tex;
  return tex;
}

let _sombra: THREE.CanvasTexture | null = null;
/** Mancha de sombra de contato (gradiente radial) — fake AO barato sob personagens/móveis. */
export function texturaSombraContato(): THREE.CanvasTexture {
  if (_sombra) return _sombra;
  const { canvas, ctx } = criarCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(0.65, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  _sombra = tex;
  return tex;
}

const _rotulos = new Map<string, THREE.CanvasTexture>();
/** Rótulo flutuante (texto num "chip" arredondado) pro personagem selecionado — cacheado por
 * texto+cor, já que só um ou dois existem na tela por vez. */
export function texturaRotulo(texto: string, corFundo: string): THREE.CanvasTexture {
  const chave = `${texto}|${corFundo}`;
  const existente = _rotulos.get(chave);
  if (existente) return existente;
  const { canvas, ctx } = criarCanvas(1);
  canvas.width = 256;
  canvas.height = 64;
  ctx.font = "bold 28px system-ui, sans-serif";
  const largura = Math.min(240, ctx.measureText(texto).width + 36);
  const x = (256 - largura) / 2;
  const raio = 18;
  ctx.beginPath();
  ctx.moveTo(x + raio, 12);
  ctx.arcTo(x + largura, 12, x + largura, 12 + raio, raio);
  ctx.arcTo(x + largura, 52, x + largura - raio, 52, raio);
  ctx.arcTo(x, 52, x, 52 - raio, raio);
  ctx.arcTo(x, 12, x + raio, 12, raio);
  ctx.closePath();
  ctx.fillStyle = corFundo;
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 128, 33);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (_rotulos.size > 12) { const k = _rotulos.keys().next().value; if (k) _rotulos.delete(k); }
  _rotulos.set(chave, tex);
  return tex;
}
