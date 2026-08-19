# TimorgianaRide 🚗🏍️

App de _ride-hailing_ simples para **Díli, Timor-Leste**. Liga passageiros e
motoristas, com **pagamento em dinheiro** e **sem comissões** (fase de teste).

- **Línguas:** Português e Tetum
- **Moeda de referência:** USD
- **Veículos:** carro e **motorizada** (mota-táxi)
- **Pagamento:** dinheiro físico, combinado entre passageiro e motorista

## Estrutura

```
TimorgianaRide/
├── backend/    API Node.js + Express + Socket.io + SQLite
└── mobile/     App React Native (Expo SDK 54) — Android e iOS
```

## Stack e decisões

| Camada | Tecnologia | Porquê |
|---|---|---|
| App | React Native via **Expo SDK 54** | Testar no telemóvel com o Expo Go, sem build nativo. **Não usar o SDK mais recente** — o Expo Go instalado costuma andar atrás e rejeita projetos demasiado novos |
| Navegação | React Navigation 7 | Padrão da comunidade |
| Estado/sessão | Context API + AsyncStorage | Simples, sem dependências pesadas |
| Backend | Express + Socket.io | REST para os dados, tempo real para pedidos e chat |
| Base de dados | **SQLite** via `node:sqlite` | Built-in no Node 22.5+; sem compilação nem dependências nativas |
| Auth | JWT + bcrypt | Login por **telemóvel** (mais adequado a TL), email opcional |
| Mapa | **Leaflet + WebView** (OpenStreetMap) | Funciona no Expo Go; o `react-native-maps` exigiria build nativo |

> A camada de base de dados está isolada em `backend/src/db.js` e nos módulos
> `users.js` / `rides.js` / `messages.js` / `ratings.js`. Para migrar para
> PostgreSQL basta reescrever esses ficheiros, sem tocar nas rotas.

## Como correr

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # ajustar JWT_SECRET
npm run dev               # http://localhost:4000
```

Testar: `curl http://localhost:4000/api/health`

### 2. App mobile

```bash
cd mobile
npm install
npx expo start            # ler o QR code com o Expo Go (Android/iOS)
```

Backend e telemóvel têm de estar **na mesma rede Wi-Fi**.

> ℹ️ **O IP do computador muda.** A app descobre-o sozinha (ver
> `mobile/src/config.js`, que lê o `hostUri` do Expo), mas um **QR code antigo
> deixa de funcionar** — gera sempre um novo com `npx expo start`.

## Funcionalidades

✅ Registo e login (passageiro e motorista)
✅ Tipo de veículo: **carro ou motorizada**
✅ Pedido de viagem **em tempo real** (Socket.io)
✅ Filtro por tipo de veículo (só motoristas do tipo pedido veem o pedido)
✅ **Mapa OpenStreetMap** — escolher destino a tocar + GPS para a origem
✅ **Chat** em tempo real entre passageiro e motorista
✅ **Tarifa combinada** — passageiro sugere, motorista ajusta
✅ Estados: pedido → aceite → a caminho → concluído (+ cancelar)
✅ **Avaliação por estrelas** (recalcula a média do avaliado)
✅ Contacto telefónico direto

### Ideias para o futuro

- [ ] Histórico de viagens
- [ ] Notificações push (app fechada)
- [ ] Rota desenhada no mapa
- [ ] Painel de administração

## API

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Verificação de saúde |
| `POST` | `/api/auth/register` | Criar conta (`role`: `passenger`\|`driver`) |
| `POST` | `/api/auth/login` | Iniciar sessão (telemóvel + palavra-passe) |
| `GET` | `/api/auth/me` | Utilizador atual (requer `Authorization: Bearer <token>`) |

### Viagens (requer token)

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| `POST` | `/api/rides` | passageiro | Pedir viagem (`destLabel`, coords, `vehicleType?`, `fareUsd?`) |
| `GET` | `/api/rides/active` | ambos | Viagem ativa (restaurar estado ao abrir a app) |
| `GET` | `/api/rides/available` | motorista | Pedidos por aceitar (filtrados pelo seu veículo) |
| `POST` | `/api/rides/:id/accept` | motorista | Aceitar (mantém a tarifa sugerida se não indicar outra) |
| `POST` | `/api/rides/:id/status` | motorista | Avançar estado (`arriving`, `completed`) |
| `POST` | `/api/rides/:id/fare` | motorista | Atualizar a tarifa combinada |
| `POST` | `/api/rides/:id/cancel` | ambos | Cancelar |
| `GET` | `/api/rides/:id/messages` | ambos | Histórico do chat |
| `POST` | `/api/rides/:id/messages` | ambos | Enviar mensagem |
| `POST` | `/api/rides/:id/rate` | ambos | Avaliar (1–5 estrelas, após concluída) |

**Eventos Socket.io:** `ride:new` (novo pedido para motoristas elegíveis),
`ride:taken` (pedido já atribuído), `ride:update` (atualização para os
participantes), `message:new` (nova mensagem de chat).

## Contas de teste

| Tipo | Telemóvel | Palavra-passe |
|---|---|---|
| Passageiro (Ana Soares) | `+670 7712 3456` | `segredo123` |
| Motorista carro (Joao Mota) | `77998877` | `conduz123` |
| Motorista motorizada (Ze Mota) | `78111222` | `mota123` |

> Apagar `backend/data/` para reiniciar a base de dados do zero.

## Notas

- As traduções em **Tetum** (`mobile/src/i18n/tet.js`) são uma primeira versão
  e devem ser revistas por um falante nativo.
- O mapa só renderiza no telemóvel (o WebView não existe na versão web).
- `node:sqlite` é uma API relativamente recente do Node — estável para o MVP.
