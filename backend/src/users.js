import bcrypt from 'bcryptjs';
import { dadosDeCarga } from './capacidade.js';
import { TIPOS_VEICULO } from './config.js';
import { query, one } from './db.js';

// Normaliza o número de telemóvel: remove espaços e símbolos comuns.
// Em Timor-Leste o indicativo é +670. Guardamos o que o utilizador
// escreve, mas de forma consistente para evitar duplicados.
// O +670 GUARDA-SE SEM INDICATIVO, e os outros com ele.
//
// Parece inconsistente e é deliberado. As contas que já existem estão
// guardadas como oito dígitos — é assim que toda a gente em Díli escreve o
// seu número, e é assim que o vai continuar a escrever. Passar tudo para o
// formato internacional obrigava a migrar as contas existentes e a ensinar
// toda a gente a escrever quatro dígitos que nunca escreveu.
//
// Um número estrangeiro leva o indicativo e nunca colide: `+61...` não se
// confunde com `7...`.
//
// E aceita-se `+670 74192857` na mesma, reduzindo-o à forma local. Quem
// escreva o número completo — porque o copiou de algum lado — encontra a
// sua conta.
export function normalizePhone(phone) {
  let p = String(phone || '')
    .replace(/[\s()\-.]/g, '')
    .trim();
  if (p.startsWith('+670')) p = p.slice(4);
  else if (p.startsWith('00670')) p = p.slice(5);
  else if (p.startsWith('00')) p = '+' + p.slice(2);
  return p;
}

// Converte uma linha da BD no formato público (sem o hash da palavra-passe)
// O NOME, LIMPO E MEDIDO — a mesma regra no registo e na correção
// (22/09/2026).
//
// PORQUE EXISTE. Até hoje o nome escrevia-se UMA vez, no registo, e ficava
// para sempre: não havia no servidor inteiro uma única instrução que o
// mudasse. Quem trocava uma letra ficava com ela à frente de todos os
// passageiros, e um motorista ficava com um nome que não bate certo com a
// carta de condução que a plataforma aprovou.
//
// O registo só verificava se estava vazio. Um nome de dez mil letras entrava
// tal e qual, e ia partir todos os ecrãs que o mostram. Agora a regra é uma
// só, usada nos dois sítios — porque duas regras para o mesmo campo divergem,
// e depois há nomes que o registo aceita e a correção recusa.
//
// Os espaços a mais colapsam antes de medir: "João   Silva" e "João Silva"
// são a mesma pessoa, e guardar o primeiro estraga a comparação e o desenho.
//
// Devolve `{ nome }` ou `{ error }`. O nome da propriedade é `error` de
// propósito: é assim que o verificador das mensagens encontra estas frases e
// obriga a traduzi-las para tétum e inglês.
export const MAX_NOME = 60;

export function limparNome(cru) {
  const nome = String(cru || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!nome) return { error: 'Nome é obrigatório.' };
  if (nome.length < 2) return { error: 'O nome é demasiado curto.' };
  if (nome.length > MAX_NOME) return { error: 'O nome é demasiado longo.' };
  return { nome };
}

export function toPublicUser(row) {
  if (!row) return null;
  const base = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    emailConfirmado: !!row.email_confirmado,
    role: row.role,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    createdAt: row.created_at,
  };
  // A capacidade de conduzir deixou de depender do papel escolhido no
  // registo. Três estados diferentes, e a diferença importa:
  //   null        — nunca pediu para conduzir (a maioria das pessoas)
  //   'pending'   — pediu e aguarda decisão
  //   'approved'  — pode conduzir
  // Tratar "nunca pediu" como "à espera" mandaria todos os passageiros
  // para o ecrã de análise de documentos.
  base.driverStatus = row.driver_status || null;
  base.podeConduzir = row.driver_status === 'approved';
  if (row.driver_status_motivo) base.driverStatusMotivo = row.driver_status_motivo;
  if (row.vehicle_plate) {
    base.vehicle = {
      type: row.vehicle_type || 'car',
      model: row.vehicle_model || null,
      plate: row.vehicle_plate || null,
      color: row.vehicle_color || null,
      seats: row.vehicle_seats ?? null,
      carroceria: row.vehicle_carroceria || null,
      capacidade: row.vehicle_capacidade || null,
      ano: row.vehicle_ano ?? null,
    };
  }
  if (row.is_admin) base.isAdmin = true;
  base.termsVersion = row.terms_version || null;
  base.driverTermsVersion = row.driver_terms_version || null;
  base.privacyVersion = row.privacy_version || null;
  return base;
}

export function findUserById(id) {
  return one('SELECT * FROM users WHERE id = $1', [id]);
}

export function findUserByPhone(phone) {
  return one('SELECT * FROM users WHERE phone = $1', [normalizePhone(phone)]);
}

// Cria um utilizador. A restrição UNIQUE do telemóvel protege contra
// dois registos simultâneos com o mesmo número.
export async function createUser({
  name,
  phone,
  email,
  password,
  role,
  vehicle,
  termsVersion,
  privacyVersion,
  cidadaoTL = false,
}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const vehicleType =
    role === 'driver' ? (TIPOS_VEICULO.includes(vehicle?.type) ? vehicle.type : 'car') : null;

  const carga = dadosDeCarga(vehicle, role === 'driver' && vehicleType === 'carry');

  // Motoristas novos ficam à espera de aprovação; passageiros entram logo
  return one(
    `INSERT INTO users
       (name, phone, email, password_hash, role, vehicle_type, vehicle_model, vehicle_plate,
        vehicle_color, vehicle_seats, driver_status, terms_version, terms_accepted_at,
        privacy_version, privacy_accepted_at, cidadao_tl, cidadao_tl_em,
        vehicle_carroceria, vehicle_capacidade, vehicle_ano)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13,
             CASE WHEN $13::text IS NULL THEN NULL ELSE NOW() END,
             $14,
             -- A hora só existe se a declaração existir. Guardar uma data ao
             -- lado de um "não declarou" seria datar uma coisa que ninguém
             -- disse — o mesmo princípio do consentimento dos menores.
             CASE WHEN $14::boolean IS TRUE THEN NOW() ELSE NULL END,
             $15, $16, $17)
     RETURNING *`,
    [
      name.trim(),
      normalizePhone(phone),
      email ? email.trim() : null,
      passwordHash,
      role,
      vehicleType,
      vehicle?.model?.trim() || null,
      vehicle?.plate?.trim() || null,
      // Um código da lista, ou texto livre dos registos antigos: 30 caracteres chegam.
      String(vehicle?.color || '')
        .trim()
        .slice(0, 30) || null,
      role === 'driver' && vehicleType === 'car' && vehicle?.seats
        ? Math.max(1, Math.min(12, Number(vehicle.seats)))
        : null,
      role === 'driver' ? 'pending' : null,
      termsVersion || null,
      privacyVersion || null,
      // Só faz sentido em motoristas. Num passageiro fica a NULL, que se lê
      // como "não foi perguntado" — diferente de FALSE, que seria "disse que
      // não é". A app nem lhe faz a pergunta.
      role === 'driver' ? !!cidadaoTL : null,
      carga.carroceria,
      carga.capacidade,
      carga.ano,
    ]
  );
}

export function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}
