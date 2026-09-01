# Cópia de segurança da base de dados

Uma cópia por dia, às 02:00 de Díli, guardada cifrada no GitHub durante 90
dias.

**Uma cópia que nunca foi restaurada não é uma cópia.** Faz o ensaio da
secção 3 uma vez, com calma, antes de precisares dele com pressa.

---

## 1. O que é preciso ter configurado

Dois segredos no GitHub, em
`Settings → Secrets and variables → Actions → New repository secret`:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | a ligação ao Neon, igual à do Render |
| `BACKUP_PASSPHRASE` | uma senha inventada por ti, só para isto |

Sobre a `BACKUP_PASSPHRASE`:

- **Não é a senha do Neon.** É uma senha nova, só para cifrar as cópias.
- **Perdê-la é perder as cópias todas.** Não há como recuperar.
- Vive em `~/Documents/senha-copias-timorgianaride.txt`, e **nunca se
  escreve à mão**. Copia-se de lá para o GitHub, e lê-se de lá ao decifrar.

  Isto não é comodidade. No primeiro ensaio, três tentativas de decifrar
  deram três resultados diferentes — porque a senha estava a ser escrita à
  mão e saía diferente de cada vez. Escrever uma senha aleatória é uma
  operação que falha.

- **Copia esse ficheiro para outro sítio.** Uma pen, outro computador. Se
  este Mac se perder, perdem-se as cópias com ele.

---

## 2. Descarregar uma cópia

1. No GitHub, separador **Actions**
2. Do lado esquerdo, **Cópia de segurança**
3. Escolhe a execução do dia que queres
4. Lá em baixo, em **Artifacts**, descarrega `copia-N`

Vem um `.zip`. Dentro está um ficheiro
`timorgianaride-AAAA-MM-DD.sql.gz.enc`.

Esse ficheiro sozinho **não serve para nada a quem o apanhe** — é um bloco
cifrado. Podes guardá-lo num disco externo sem preocupação.

---

## 3. Restaurar

Ensaiado a sério em 01/09/2026. O que está aqui foi todo executado, não é
teoria.

### Não precisas de instalar nada

Usa o `node` que já tens. O `psql` não é preciso — a cópia é feita com
`--inserts` exactamente para isso.

### Decifrar

```bash
cd ~/Downloads
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:~/Documents/senha-copias-timorgianaride.txt \
  -in timorgianaride-AAAA-MM-DD-execN.sql.gz.enc | gunzip > copia.sql
```

Não pede senha nenhuma — lê-a do ficheiro.

Confirma que ficou bom:

```bash
head -3 copia.sql
```

Deve dizer `-- PostgreSQL database dump`.

### ⚠️ Precisas de uma base VAZIA

Restaurar apaga o que lá está. E um *branch* do Neon **não serve**: nasce com
uma cópia dos dados do pai.

O que serve é uma **base de dados nova**, no mesmo projecto:
`Neon → Databases → New Database`.

Atenção a um pormenor que nos apanhou: o Neon cria em cada base um esquema
chamado `neon_auth`, e a cópia também o traz. Se a base de destino já o
tiver, o restauro falha a meio com *"schema neon_auth already exists"*. Para
a esvaziar por completo, corre contra ELA (nunca contra a que está a
funcionar):

```sql
DROP SCHEMA IF EXISTS neon_auth CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
```

### Restaurar

```bash
cd "/Users/gabinetejuridico/Documents/Claude Code/TimorgianaRide/backend"
node scripts/restaurar.mjs ~/Downloads/copia.sql "LIGACAO_DA_BASE_DE_ENSAIO"
```

A ligação é a do Neon com o nome da base trocado no fim — `/neondb?` passa a
`/nome_da_base_nova?`.

O script recusa-se a correr se a base de destino tiver tabelas. É a última
protecção contra restaurar por cima da base verdadeira.

No fim conta o que restaurou. **Compara com a base a funcionar** — se os
números baterem, a cópia presta.

### Depois do ensaio, limpa

O `copia.sql` são cinco megabytes de nomes, telemóveis e documentos de
identificação **sem cifra nenhuma**, na pasta das transferências.

```bash
rm -f ~/Downloads/copia.sql
```

E esvazia a base de ensaio, que ficou com uma cópia de tudo.

---

## 4. Correr uma cópia à mão

Antes de uma alteração grande, vale a pena ter uma cópia fresca:

GitHub → **Actions** → **Cópia de segurança** → **Run workflow**

---

## 5. O que a cópia contém

Tudo o que está na base, incluindo o que mais custa perder:

- **`carregamentos`** — quem pagou, quanto, por que via
- **`users.dias_saldo`** — dias comprados e ainda não usados
- **`dias_contados`** — os dias cobrados a cada motorista
- **`driver_documents`** — cartas de condução e fotografias, guardadas como
  bytes na própria base

Os documentos são a razão pela qual isto vai cifrado. É informação pessoal
de pessoas reais, e o repositório pode estar público.

---

## 6. O que fica de fora

- **Ficheiros do telemóvel** de cada utilizador (destinos guardados como
  Casa e Trabalho). Vivem só no aparelho e não passam pelo servidor — foi
  uma decisão deliberada.
- **Nada mais.** O resto do serviço é código, e o código está no Git.

---

## 7. Limites que convém conhecer

**Noventa dias.** É o máximo do plano gratuito do GitHub. Uma cópia de
Janeiro não existe em Maio. Se quiseres guardar marcos — o fim de um ano
fiscal, por exemplo — descarrega essa e guarda-a tu.

**Uma vez por dia.** Se a base se perder às 20:00, perde-se o trabalho desde
as 02:00. Para o movimento actual isso é aceitável; quando houver dezenas de
viagens por dia, vale a pena passar a duas vezes.

**A ligação ao Neon fica no GitHub.** É mais uma cópia de uma credencial,
noutro sítio. Se um dia trocares a senha do Neon, tens de a trocar em três
lados: no `.env` local, no Render, e neste segredo.
