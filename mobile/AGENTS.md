# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.


## Expo Go e actualizações pelo ar não cabem no mesmo `app.json`

O `runtimeVersion` é obrigatório para o APK receber actualizações pelo ar,
mas o Expo Go **recusa** qualquer projecto cujo runtime não seja
`exposdk:<versão>`. Escrever o campo no `app.json` ganha as actualizações e
perde o Expo Go — que é o único caminho gratuito para testar em iPhone.

Resolvido em `app.config.js`: o campo existe por omissão e é retirado
quando `EXPO_GO=1`. Usar sempre `npm run testar` (que já põe a variável)
para arrancar o servidor de desenvolvimento; `npx expo start` sozinho serve
o manifesto errado e o Expo Go não abre.

Para confirmar qual dos dois está activo:

    npx expo config --type public --json | grep runtimeVersion
    EXPO_GO=1 npx expo config --type public --json | grep runtimeVersion
