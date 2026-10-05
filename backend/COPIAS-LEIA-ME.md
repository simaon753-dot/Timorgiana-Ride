# Cópias de segurança da base de dados

Há **duas** cópias, em dois sítios, ambas cifradas com a **mesma senha**.

| Onde | Quando | Quanto tempo fica |
|---|---|---|
| GitHub (Actions › «Cópia de segurança») | todos os dias, 02:00 de Díli | 90 dias |
| Este Mac, `~/Documents/TimorgianaRide-copias/` | domingos, 10:00 | as últimas 12 (3 meses) |

As duas são verificadas no momento: cada cópia é decifrada logo a seguir a
ser feita, e se não abrir não é guardada.

**Perder a senha é perder as cópias todas.** Escreva-a em papel e guarde-a
com os documentos da empresa.

## Ligar a cópia no Mac (uma vez)

1. Pôr a senha no Porta-chaves do macOS. No Terminal:

   ```
   security add-generic-password -a copias -s timorgianaride-copias -T /usr/bin/security -w
   ```

   Pede a senha duas vezes (não aparece enquanto escreve). Use a **mesma**
   do segredo `BACKUP_PASSPHRASE` do GitHub, para ter uma senha só.

2. Ligar o agendamento e fazer já a primeira cópia:

   ```
   bash backend/scripts/instalar-copia-semanal.sh
   ```

   Deve terminar com `✓ …/timorgianaride-mac-AAAA-MM-DD.sql.gz.enc`.
   Se o macOS perguntar se o `bash` pode aceder à pasta Documentos, aceitar.

O registo de cada execução fica em `~/Library/Logs/timorgianaride-copia.log`.
O Mac tem de estar ligado ao domingo (se estiver a dormir, corre quando
acordar).

Desligar: `bash backend/scripts/instalar-copia-semanal.sh desligar`

## De vez em quando

- **Copiar a pasta `TimorgianaRide-copias` para um disco externo** (uma vez
  por mês). Se o Mac for roubado ou avariar, é essa cópia que sobra.
- **Testar um restauro uma vez por trimestre** (passos abaixo). Uma cópia que
  nunca foi restaurada é uma esperança, não uma garantia.

## Restaurar

Nunca por cima da base que está a funcionar: sempre para um **branch novo**
da Neon (Neon › o projecto › Branches › Create branch, vazio).

Cópia do Mac (só dados; as tabelas são criadas pelo servidor):

```
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in timorgianaride-mac-AAAA-MM-DD.sql.gz.enc | gunzip > copia.sql
```

1. Arrancar o servidor uma vez contra o branch novo (`DATABASE_URL` do
   branch), para criar as tabelas, e pará-lo.
2. `node scripts/restaurar.mjs copia.sql "LIGAÇÃO_DO_BRANCH_NOVO"`

Cópia do GitHub (completa, com as tabelas): ver o início de
`scripts/restaurar.mjs`.
