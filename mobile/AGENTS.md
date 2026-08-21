# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.


## Expo Go e actualizações pelo ar não cabem no mesmo `app.json`

O `runtimeVersion` é obrigatório para o APK receber actualizações pelo ar,
mas o Expo Go **recusa** qualquer projecto cujo runtime não seja
`exposdk:<versão>`, e mostra apenas *"there was a problem running the
requested app"* — sem dizer porquê.

Resolvido em `app.config.js`, e com o cuidado de o modo seguro ser o
normal: em desenvolvimento o campo **nunca** existe, e só aparece quando
`EAS_BUILD=true` (o EAS põe sozinho) ou `EAS_UPDATE=1` (posto pelo
`npm run publicar`). Qualquer comando de arranque — `npx expo start`
incluído — serve o manifesto que o Expo Go aceita.

A primeira tentativa foi ao contrário: o campo existia por omissão e
tirava-se com uma variável. Quem escrevesse o comando normal apanhava o
manifesto errado. **Quando uma configuração tem um modo que parte as
coisas, esse modo não pode ser o que se obtém por omissão.**

Publicar actualizações é **sempre** `npm run publicar` — nunca `eas update`
à mão, senão o pacote sai sem `runtimeVersion` e não chega a telemóvel
nenhum. O `eas` não está instalado no sistema; os atalhos chamam-no por
`npx`.

Para confirmar o que cada caminho produz:

    npx expo config --type public --json | grep runtimeVersion   # ausente
    EAS_BUILD=true npx expo config --type public --json | grep runtimeVersion
