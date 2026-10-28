// Gera AUTH_USERS_JSON (usuários da Plataforma com hash bcrypt) sem senha em arquivo nem em log.
// Uso:  node scripts/gerar-auth-users.mjs usuarios.modelo.json saida.json
//   usuarios.modelo.json: [{ "id","name","email","role","homeRoute" }, ...]  (sem senha)
// Cada senha é pedida no terminal, oculta, e confirmada. Mínimo de 12 caracteres.
// A saída (0600) vai para a Vercel:  vercel env add AUTH_USERS_JSON production < saida.json
// Depois apague saida.json. Nunca commite esses arquivos.
import fs from "node:fs";
import readline from "node:readline";
import bcrypt from "bcryptjs";

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error("Uso: node scripts/gerar-auth-users.mjs usuarios.modelo.json saida.json");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
let mudo = false;
rl._writeToOutput = (t) => { if (!mudo) rl.output.write(t); };
const fila = [];
let resolver = null;
if (!process.stdin.isTTY) rl.on("line", (l) => (resolver ? resolver(l) : fila.push(l)));

function pergunta(texto) {
  process.stdout.write(texto);
  mudo = true;
  return new Promise((res) => {
    const fim = (v) => { mudo = false; process.stdout.write("\n"); res(v); };
    if (process.stdin.isTTY) rl.question("", fim);
    else if (fila.length) fim(fila.shift());
    else resolver = (v) => { resolver = null; fim(v); };
  });
}

const usuarios = JSON.parse(fs.readFileSync(entrada, "utf8"));
const out = [];
for (const u of usuarios) {
  let senha = "";
  for (;;) {
    senha = await pergunta(`Senha de ${u.name} <${u.email}> (mín. 12): `);
    const conf = await pergunta("Repita a senha: ");
    if (senha.length >= 12 && senha === conf) break;
    console.error("Senhas diferentes ou curtas demais; tente de novo.");
  }
  out.push({ id: u.id, name: u.name, email: u.email, passwordHash: await bcrypt.hash(senha, 12), role: u.role, homeRoute: u.homeRoute });
}
rl.close();
fs.writeFileSync(saida, JSON.stringify(out), { mode: 0o600 });
console.log(`OK: ${out.length} usuários gravados em ${saida} (0600). Envie à Vercel e apague o arquivo.`);
