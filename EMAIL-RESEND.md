# O email de confirmação — como ligar

O código já está escrito e adormecido. Faltam **duas variáveis no Render**, e
antes delas um domínio e uma conta. Meia hora, quase tudo à espera de DNS.

Domínio escolhido: **`timorgiana.com`** — serve a floricultura e a app, uma
verificação para as duas.

---

## 1 · O domínio — feito

`timorgiana.com`, comprado na **Domainesia** a 09/09/2026, em nome da sociedade.

> **Porque não foi o Cloudflare.** Era a recomendação — vende ao preço de custo
> e tem bom painel de DNS. Mas recusou o cartão Visa do Mandiri duas vezes, sem
> sequer chegar à confirmação por SMS: as transacções internacionais online de
> um cartão indonésio raramente passam num serviço americano.
>
> A Domainesia aceita transferência e conta virtual do Mandiri — paga-se de
> dentro do sistema onde o dinheiro já funciona. Custou o mesmo.
>
> **Não se perdeu nada.** O Cloudflare era conveniência, não requisito: os três
> registos abaixo são três linhas de texto que qualquer painel de DNS aceita.
>
> Fica a lição para as compras seguintes (Render, Expo, o que vier): **serviços
> americanos recusam este cartão.** Procurar sempre quem aceite transferência
> indonésia, ou ter outro meio de pagamento pronto.

## 2 · Conta no Resend

`resend.com` → criar conta. O plano gratuito dá **3 000 emails por mês, 100 por
dia e 3 domínios** — nós gastamos um email por registo.

## 3 · Verificar o domínio

No Resend: **Domains → Add Domain →** escrever `timorgiana.com`.

Ele mostra **três registos**. Copiar cada um para o painel de DNS da
**Domainesia** (área de cliente → Domínios → o domínio → gestão de DNS), com o
mesmo tipo, nome e valor:

| O que é | Para que serve |
|---|---|
| **SPF** (TXT) | Diz que o Resend pode enviar em nome do domínio |
| **DKIM** (TXT) | Assina cada mensagem, para se provar que não foi alterada |
| **DMARC** (TXT) | Diz ao mundo o que fazer com uma mensagem que falhe as duas |

Voltar ao Resend e carregar em **Verify**. Costuma levar minutos; pode levar uma
hora.

> **Isto não é burocracia.** É como o correio do mundo decide se uma mensagem
> que diz vir de si veio mesmo de si. Sem estes três registos o Gmail atira o
> código para o lixo — teria tudo configurado e ninguém receberia nada.

> ⚠️ **Se um dia puser email normal neste domínio** (Google Workspace, Zoho),
> atenção ao SPF: **só pode existir UM registo SPF**. Os dois têm de ser
> fundidos numa linha só, não acrescentados lado a lado. Dois registos SPF
> fazem falhar os dois.

## 4 · A chave

No Resend: **API Keys → Create API Key**, permissão *Sending access*.

**A chave aparece uma vez.** Copiar para o Render de imediato.

> Nunca a cole numa conversa comigo, nem numa fotografia do ecrã. Ela sozinha
> permite enviar correio em nome do domínio.

## 5 · No Render

**Environment → Add Environment Variable**, duas:

```
RESEND_API_KEY = re_...
EMAIL_DE       = TimorgianaRide <codigo@timorgiana.com>
```

O `codigo@` não precisa de existir como caixa de correio — é só o remetente.
Guardar; o Render reinicia sozinho.

## 6 · Confirmar

```bash
curl -s https://timorgiana-ride.onrender.com/api/health
```

No campo `email`:

- `"ligado": true` — as duas variáveis chegaram
- `"ultimoErro": null` — nada falhou ainda

Depois **registar uma conta nova na app com um email a sério**. Deve chegar um
código de seis dígitos.

Se não chegar, voltar ao `/api/health`: o `ultimoErro` diz o que o Resend
respondeu — quase sempre domínio por verificar ou remetente que não bate com o
domínio.

---

## O que acontece quando estiver ligado

Nada muda para quem já tem conta. Nos registos novos:

1. A conta é criada e a pessoa **entra logo** — o email parte sem ninguém
   esperar por ele. Um serviço de fora nunca fica no caminho de quem se
   inscreve.
2. Chega um código de **seis dígitos**, válido **60 minutos**, com **cinco
   tentativas**.
3. Se o endereço estiver mal escrito, o código não chega — e é isso que lhe
   diz que o escreveu mal. Pode corrigir o endereço no perfil e pedir outro.

O código serve para **recuperar a conta** no dia em que a senha se perder. Sem
ele, a única recuperação é telefonar-lhe a si.
