# Ligar a confirmação do telemóvel por SMS (Twilio Verify)

A app já tem tudo pronto. Fica **desligada** até estas chaves estarem no Render.
Com elas, passageiros e motoristas passam a confirmar o número com um código
de 6 algarismos antes de pedir viagem ou de ficar disponível.

## 1. Criar a conta (no Samsung)

1. Abrir **twilio.com** › *Sign up*. Registar com o email da Timorgiana.
2. Confirmar o email e o telemóvel que o Twilio pedir.
3. Nas perguntas iniciais, escolher: *Verify* · *SMS* · *With code*.
4. **Billing › Upgrade account**: pôr o cartão e carregar **US$20**. Sem isto a
   conta fica em «trial» e só manda SMS para números verificados à mão.
5. **Messaging › Settings › Geo permissions**: marcar **Timor-Leste**. Sem
   isto, nenhum SMS sai para +670.

## 2. Criar o serviço Verify

1. Menu **Verify › Services › Create new**.
2. Nome: `TimorgianaRide`. Canal: **SMS** ligado. Tamanho do código: **6**.
3. Guardar. Copiar o **Service SID** (começa por `VA…`).

## 3. Copiar as chaves da conta

No **Console** (página inicial do Twilio), em *Account Info*:
- **Account SID** (começa por `AC…`)
- **Auth Token** (carregar em *Show*)

## 4. Pôr as chaves no Render

Render › serviço **timorgiana-ride** › **Environment** › *Add environment variable*:

| Nome | Valor |
|---|---|
| `TWILIO_ACCOUNT_SID` | o `AC…` |
| `TWILIO_AUTH_TOKEN` | o Auth Token |
| `TWILIO_VERIFY_SID` | o `VA…` |
| `SMS_TECTO_DIARIO` | `150` (opcional: máximo de SMS por dia) |

Guardar. O Render reinicia sozinho.

## 5. Confirmar que está ligado

Abrir `https://timorgiana-ride.onrender.com/api/health` e procurar
`"sms":{"ligado":true,"ultimoErro":null}`.

Depois, na app: aparece a faixa **«Confirme o seu número»** no início.
Experimentar com o seu número primeiro.

## Custos e proteções

- Cerca de **US$0,11 por SMS** para Timor-Leste, mais a taxa do Verify por
  confirmação bem-sucedida.
- Tectos no servidor: **3 SMS por conta por hora, 6 por dia**, e o tecto diário
  para todos (`SMS_TECTO_DIARIO`). Protegem contra quem tente gastar SMS de
  propósito.
- No Twilio: **Verify › Fraud Guard** ligado (vem ligado por omissão).

## Se o SMS não chegar a alguém

No painel: **Contas › a pessoa › «Confirmar à mão»** (depois de ver o
telemóvel dela no escritório). Fica registado quem confirmou.

## Desligar

Apagar `TWILIO_VERIFY_SID` no Render. Ninguém fica bloqueado.
