#!/usr/bin/env node
// O CATÁLOGO DE CATEGORIAS DO GIARA, COPIADO PARA AQUI (07/10/2026).
//
// O painel deixa escolher a categoria exata de um lugar (Casa → Apartamento,
// Igreja → Capela…) e o envio para o Giara leva esse código tal e qual. Para
// os dois mapas falarem a mesma língua, a lista vem da migração do Giara que
// a criou — a fonte é lá, aqui é uma cópia.
//
// Escreve DOIS ficheiros iguais, porque o painel e o servidor compilam em
// separado: backend/src/categoriasGiara.json (para validar o que chega) e
// painel/src/lib/categoriasGiara.json (para desenhar a escolha).
//
// Correr de novo sempre que o catálogo do Giara mudar:
//   node scripts/gerar-categorias-giara.mjs [caminho/da/migração.sql]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..');
const origem =
  process.argv[2] ?? resolve(raiz, '..', 'GIARA_MAPS', 'database', 'migrations', '012_full_catalogue.sql');

const sql = readFileSync(origem, 'utf8');
// Cada linha do catálogo: ('codigo','Nome','12. Grupo',1234)
const linha = /\('([^']+)','((?:[^']|'')+)','((?:[^']|'')+)',(\d+)\)/g;
// O que a rota de integração do Giara aceita. Dois códigos do catálogo não
// passam (taxi_2 e um de 44 letras); mandá-los fazia recusar o lote inteiro.
const ACEITE_PELO_GIARA = /^[a-z_]{1,40}$/;

const grupos = new Map();
const fora = [];
for (const [, codigo, nome, grupo, ordem] of sql.matchAll(linha)) {
  if (!ACEITE_PELO_GIARA.test(codigo)) {
    fora.push(codigo);
    continue;
  }
  const g = grupo.replace(/''/g, "'");
  if (!grupos.has(g)) grupos.set(g, []);
  grupos.get(g).push({ codigo, nome: nome.replace(/''/g, "'"), ordem: Number(ordem) });
}
if (grupos.size < 30) throw new Error(`Só ${grupos.size} grupos em ${origem}: não parece o catálogo.`);

const catalogo = [...grupos].map(([nome, categorias]) => ({
  // «12. Religião» → numero 12, nome «Religião».
  numero: Number(nome.split('.')[0]),
  nome: nome.replace(/^\d+\.\s*/, ''),
  categorias: categorias.sort((a, b) => a.ordem - b.ordem).map(({ codigo, nome }) => [codigo, nome]),
}));
const texto = JSON.stringify(catalogo) + '\n';
for (const destino of ['backend/src/categoriasGiara.json', 'painel/src/lib/categoriasGiara.json']) {
  writeFileSync(join(raiz, destino), texto);
}
const total = catalogo.reduce((n, g) => n + g.categorias.length, 0);
console.log(`✓ ${total} categorias em ${catalogo.length} grupos${fora.length ? ` (fora: ${fora.join(', ')})` : ''}`);
