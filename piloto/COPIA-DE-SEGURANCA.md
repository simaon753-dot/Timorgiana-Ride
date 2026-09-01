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
- Guarda-a onde guardas as coisas que não podes perder — não no computador
  onde está o projecto, porque se esse arder perdeste as duas coisas.

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

### Precisas do psql

Não vem com o macOS. A forma mais simples:

```bash
brew install libpq && brew link --force libpq
```

### Decifrar

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in timorgianaride-2026-09-01.sql.gz.enc | gunzip > copia.sql
```

Pede a senha. Se a senha estiver errada, dá erro — não produz lixo em
silêncio.

Confirma que ficou bom:

```bash
head -20 copia.sql
```

Deve começar com linhas de `CREATE TABLE` e afins.

### ⚠️ NÃO restaures por cima da base a funcionar

Restaurar apaga o que lá está. Se a cópia tiver um problema, ficas sem as
duas coisas.

**Faz assim:** no Neon, cria um *branch* novo (`Branches → Create branch`).
Um branch é uma cópia independente e não toca na de produção. Restauras para
lá, confirmas que está tudo, e só depois trocas.

```bash
psql "LIGAÇÃO_DO_BRANCH_NOVO" < copia.sql
```

### Confirmar antes de trocar

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM carregamentos;
SELECT SUM(dias_saldo) FROM users;
```

Os dias em saldo são o número que mais importa: é o que as pessoas pagaram
e ainda não usaram.

### Trocar

No Render, `Environment → DATABASE_URL`, mete a ligação do branch novo.
Guarda. Dois minutos e está.

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
