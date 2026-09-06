# Como gerar o APK (app instalável)

Guia para transformar o TimorgianaRide numa app que se instala no telemóvel,
sem precisar do Expo Go.

## O endereço do servidor é configurável na app

**Não é preciso decidir o backend antes de compilar.** A app tem um ecrã de
definições (roda dentada ⚙️ no ecrã de boas-vindas) onde se escreve o endereço
do servidor, que fica guardado no telemóvel.

Isto significa que:

- O APK pode ser gerado **agora**, sem servidor definido
- Se o endereço mudar (um túnel gratuito muda a cada reinício), basta
  actualizá-lo na app — **sem recompilar nem reinstalar**
- O mesmo APK serve para testes e para produção

O valor definido na compilação (`EXPO_PUBLIC_API_URL`) é apenas o **ponto de
partida**; o que o utilizador guardar tem prioridade.

## Onde pôr o backend

O APK precisa de um backend **acessível pela internet**. Enquanto o servidor só
existir no Mac (`http://10.x.x.x:4000`), só telemóveis na mesma Wi-Fi lá chegam.

| Opção | Custo | Notas |
|---|---|---|
| **Mesma Wi-Fi** | Grátis | Já funciona hoje. Chega para testes presenciais |
| **Túnel** (Cloudflare) | Grátis | Backend fica no Mac; o Mac tem de estar ligado. O endereço muda a cada reinício — mas isso deixou de ser problema, ver acima |
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

## Passo 3 — (Opcional) Endereço de partida

Se já souberes o endereço do backend, editar `eas.json` e substituir, no
perfil `preview`:

```json
"EXPO_PUBLIC_API_URL": "https://SUBSTITUIR-PELO-ENDERECO-DO-BACKEND"
```

**Podes saltar este passo.** Nesse caso, quem instalar o APK abre a roda
dentada ⚙️ no ecrã de boas-vindas e escreve lá o endereço — há um botão
"Testar ligação" que confirma se o servidor responde.

## Passo 3b — A chave do mapa (obrigatório desde a versão 1.2.0)

O mapa passou de OpenStreetMap para **Google Maps nativo**. A chave tem de
ir para dentro do APK — é assim que o mapa nativo funciona.

Como este repositório é **público**, a chave NÃO está no `app.json`. O
`app.config.js` lê-a do ambiente, e no EAS guarda-se como segredo:

```bash
npx eas-cli secret:create --scope project --name GOOGLE_MAPS_ANDROID_KEY --value COLAR-A-CHAVE
```

Uma só vez. A partir daí todas as compilações a recebem.

Para correr localmente com mapa:

```bash
GOOGLE_MAPS_ANDROID_KEY=... npx expo start --clear
```

Sem a chave, o `app.config.js` avisa em voz alta e o APK sai com o **mapa
cinzento** — funciona tudo o resto, mas o mapa não aparece.

### A chave na consola do Google

- **Projecto:** TimorgianaRide
- **API activada:** Maps SDK for Android (só essa)
- **Restrição de aplicação:** Apps Android
- **Pacote:** `tl.timorgiana.ride`
- **SHA-1:** o do certificado com que o EAS assina o APK

Para descobrir o SHA-1 sem instalar Java: está no [expo.dev](https://expo.dev),
em Credentials do projecto. (Também se tira do APK, mas o `keytool` deste Mac
está sem Java — a assinatura é v2 e vive no bloco de assinatura, não no
`META-INF`.)

O SHA-1 actual, do certificado em uso:

```
80:9A:F9:78:B2:72:3A:37:D7:20:28:1B:5B:69:CF:D6:94:67:75:4C
```

### ⚠️ Armadilha: a Google Play assina outra vez

Se um dia publicares na **Google Play**, a Google volta a assinar a app com
um certificado **dela**. O SHA-1 acima deixa de servir e o mapa fica cinzento
em todos os telemóveis que instalarem por lá — e vai parecer um erro do
código, porque o APK que compilaste à mão continua a funcionar.

A correcção é acrescentar o **segundo** SHA-1 (o que a Play Console mostra em
*App Integrity → App signing*) à mesma restrição, sem tirar o primeiro.

### Se o mapa aparecer cinzento

Por esta ordem:

1. Esperar **cinco minutos** — a consola avisa que as alterações demoram
2. Confirmar que o segredo existe: `npx eas-cli secret:list`
3. Confirmar o SHA-1 do APK que está mesmo instalado (pode não ser o do
   certificado actual, se foi compilado antes de uma mudança de credenciais)
4. Confirmar que a Maps SDK for Android está activada no projecto certo

A saída de emergência: trocar o import de `MapaGoogle.js` para `OSMMap.js`
em `RequestRideScreen.js` e `MapaExpandivel.js` e correr `npm run publicar`.
Volta ao OpenStreetMap em minutos, sem APK novo.

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

## ⚠️ Armadilha: o Android bloqueia HTTP simples

Desde o **Android 9**, uma app instalada recusa por omissão todo o tráfego
**HTTP não encriptado** (o Expo Go não sofre disto porque traz a permissão
activada). Sintoma: a app diz "não foi possível ligar" mesmo com o servidor
a responder normalmente no computador.

Resolvido neste projeto com o plugin `expo-build-properties` no `app.json`:

```json
"plugins": [
  ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
]
```

> 🔒 **Nota de segurança:** isto permite tráfego **não encriptado**. É
> aceitável para testes numa rede local, mas quando a app for usada a sério —
> com nomes, telemóveis e localizações de pessoas reais a passar na rede — o
> backend deve estar em **HTTPS**, e esta opção deve voltar a `false`.

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
