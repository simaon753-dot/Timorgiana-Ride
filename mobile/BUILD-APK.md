# Como gerar o APK (app instalável)

Guia para transformar o TimorgianaRide numa app que se instala no telemóvel,
sem precisar do Expo Go.

## Antes de começar

O APK precisa de um **backend acessível pela internet**. Enquanto o servidor
só existir no Mac (`http://10.x.x.x:4000`), a app instalada noutro telemóvel
**não o consegue alcançar**.

Duas hipóteses:

| Opção | Custo | Notas |
|---|---|---|
| **Túnel** (Cloudflare Tunnel) | Grátis | Backend fica no Mac; o Mac tem de estar ligado. Bom para testes |
| **Alojar online** | ~5–7 USD/mês | Funciona sem o Mac. Os planos gratuitos adormecem (~50 s a acordar), o que estraga a experiência numa app de táxis |

## Passo 1 — Conta Expo (uma só vez)

1. Criar conta gratuita em <https://expo.dev/signup>
2. No terminal:

```bash
cd "Documents/Claude Code/TimorgianaRide/mobile" && npx eas-cli login
```

## Passo 2 — Ligar o projeto ao EAS (uma só vez)

```bash
cd "Documents/Claude Code/TimorgianaRide/mobile" && npx eas-cli init
```

Isto cria um `projectId` e acrescenta-o ao `app.json`.

## Passo 3 — Indicar o endereço do backend

Editar `eas.json` e substituir, no perfil `preview`:

```json
"EXPO_PUBLIC_API_URL": "https://SUBSTITUIR-PELO-ENDERECO-DO-BACKEND"
```

pelo endereço real (por exemplo, o URL do túnel).

> Sem este passo o APK compila na mesma, mas fica sem conseguir ligar-se ao
> servidor. Ver `src/config.js` para a ordem de prioridades.

## Passo 4 — Gerar o APK

```bash
cd "Documents/Claude Code/TimorgianaRide/mobile" && npx eas-cli build -p android --profile preview
```

A compilação corre nos servidores da Expo (~10–20 min). No fim recebes um
**link para descarregar o APK**.

## Passo 5 — Instalar no telemóvel

1. Abrir o link no telemóvel Android e descarregar o APK
2. Autorizar a instalação de "fontes desconhecidas" quando o Android pedir
3. Instalar e abrir

## iPhone

Para instalar num iPhone real é preciso uma conta de programador da Apple
(~99 USD/ano). Sem isso, só funciona no simulador ou via Expo Go.

## ⚠️ Armadilha: a cache do Metro

O `EXPO_PUBLIC_API_URL` é **embutido no código** durante a compilação. Mas o
Metro guarda em cache os módulos já transformados — se compilares uma vez sem
a variável (ou com o endereço antigo), a compilação seguinte pode **reutilizar
a versão em cache** e ficar com o endereço errado lá dentro.

O resultado é um APK que diz "sem ligação ao servidor" sem razão aparente,
porque o código está certo mas o *bundle* não.

Ao compilar localmente, usar sempre cache limpa:

```bash
npx expo export --platform android --clear
```

As builds no EAS correm sempre num ambiente novo, por isso não sofrem deste
problema. Verificado neste projeto: sem `--clear` o endereço não entrou no
bundle; com `--clear`, entrou.

## Verificar a que servidor a app se ligou

O `src/config.js` exporta `API_SOURCE`, que diz de onde veio o endereço
(variável de compilação, `app.json`, Expo Go, ou o fallback `localhost`).
Útil quando a app diz "sem ligação ao servidor" e não se percebe porquê.
