import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-inseguro-mudar',
  // Caminho absoluto do ficheiro SQLite
  dbFile: path.resolve(backendRoot, process.env.DB_FILE || './data/timorgianaride.db'),
  // Passageiros e motoristas mantêm sessão por 30 dias
  jwtExpiresIn: '30d',
};

if (config.jwtSecret === 'dev-secret-inseguro-mudar') {
  console.warn('[config] AVISO: JWT_SECRET não definido. A usar segredo de desenvolvimento.');
}
