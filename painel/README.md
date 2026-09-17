# Painel de administração (React + TypeScript)

O painel web em `/painel`. Compila para `backend/publico/painel/`, que é o que
o Render serve — **o Render não compila nada**. Depois de mudar o painel, é
preciso compilar e pôr a pasta compilada no commit.

```
npm install          # uma vez
npm run demo         # servidor de demonstração, dados FICTÍCIOS, porta 4790
npm run dev          # painel com recarregamento, porta 5180 (usa a demonstração)
npm run verificar    # TypeScript
npm run compilar     # verificar + compilar para backend/publico/painel/
```

Qualquer telefone e palavra-passe entram na demonstração. Ela **não liga a
base de dados nenhuma**: nunca apontar o painel de desenvolvimento para a
produção.

## Onde está cada coisa

| Pasta | O quê |
|---|---|
| `src/components/ui/` | O design system: botão, cartão, tabela, janela, estados… |
| `src/layouts/` | Menu lateral, cabeçalho, pesquisa ⌘K, rodapé |
| `src/pages/` | Um módulo por pasta ou ficheiro |
| `src/services/` | O cliente HTTP e uma função por rota de `routes/admin.js` |
| `src/types/api.ts` | O que o servidor devolve |
| `src/i18n/pt/` | Todos os textos (tétum e inglês entram com as mesmas chaves) |
| `demo/servidor-demo.mjs` | A demonstração |

## Regras

- **Só números do servidor.** Sem o dado, o ecrã mostra "—" ou um estado vazio.
- **Receita é só a Taxa de Acesso.** O preço das viagens é do motorista.
- **A autorização é do servidor** (`is_admin`). Esconder um botão é cortesia.
- **Cores:** `src/index.css`. O coral não serve para texto (2,8:1); usar
  `coral-texto`.
- **O painel antigo** continua em `/painel-antigo` até ser retirado.
