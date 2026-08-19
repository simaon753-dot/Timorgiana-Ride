# Pôr o servidor online

Guia da Fase 1: o backend deixa de viver no Mac e passa a estar acessível
de qualquer ponto de Díli, com endereço fixo e ligação encriptada.

## O que vamos usar e quanto custa

| Peça | Serviço | Custo |
|---|---|---|
| Base de dados | **Neon** (PostgreSQL) | Grátis, permanente |
| Aplicação | **Render** ou equivalente | ~7 USD/mês |

> O plano gratuito do Render existe, mas **adormece ao fim de 15 minutos**
> sem tráfego e demora cerca de 50 segundos a acordar. Numa app de táxis
> isso é inaceitável: o passageiro conclui que está avariada.

## Passo 1 — Base de dados (grátis, sem cartão)

1. Criar conta em <https://neon.tech>
2. Criar um projeto — região mais próxima de Timor-Leste (Singapura)
3. Copiar a **connection string**, com o aspeto:
   `postgresql://utilizador:senha@ep-xxx.aws.neon.tech/neondb?sslmode=require`

Para testar localmente, colar em `backend/.env`:

```
DATABASE_URL=postgresql://...
JWT_SECRET=<gerar com: openssl rand -hex 32>
```

Depois `npm run dev` — o esquema é criado sozinho no arranque.

## Passo 2 — Aplicação

1. Criar conta em <https://render.com>
2. **New → Web Service**, ligando ao repositório (ou upload)
3. Configuração:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Starter (~7 USD/mês) — *não* o gratuito
4. Variáveis de ambiente:
   - `DATABASE_URL` — a do Neon
   - `JWT_SECRET` — o mesmo valor longo e aleatório

O Render fornece HTTPS automaticamente, com um endereço do tipo
`https://timorgianaride.onrender.com`.

## Passo 3 — Apontar a app para lá

Duas hipóteses:

- **Já feito:** abrir o ⚙️ na app e escrever o endereço — funciona no APK atual
- **Melhor:** gerar um APK novo com o endereço embutido, editando `eas.json`:
  `"EXPO_PUBLIC_API_URL": "https://timorgianaride.onrender.com"`

Com HTTPS, o remendo `usesCleartextTraffic` deixa de ser necessário e deve
voltar a `false` — os dados dos utilizadores passam a viajar encriptados.

## Verificar

```bash
curl https://SEU-ENDERECO/api/health
```

Deve responder `{"ok":true,"service":"TimorgianaRide",...}`.

## Notas

- O esquema é criado no arranque (`initSchema`) — não é preciso migrar à mão
- O Neon faz **cópias de segurança automáticas**; um disco simples não faria
- As contas de teste antigas ficaram no SQLite do Mac e **não** transitam:
  a base nova começa vazia. É o momento certo para isso, antes de haver
  utilizadores reais
