# Porque é que o `prettier --check` corre primeiro

Em 02/09/2026 parti o JSX do `DriverPendingScreen.js` — deixei um `) : null}`
órfão ao remover a condição que o abria — e **os cinco verificadores passaram
a verde**.

O `verificar-nomes.mjs` analisa cada ficheiro com o `@babel/core` e só o
*plugin* de sintaxe JSX. Com essa configuração o babel aceitou o ficheiro
partido sem se queixar. Quem se queixou foi o `prettier`, que corri por hábito
e não por regra.

Ou seja: o verde não queria dizer nada, e eu tinha exactamente o mesmo
problema que no servidor no mesmo dia — uma crase dentro de um *template
literal* que fez a construção do Render falhar em silêncio, com a versão
antiga a continuar a responder `"ok": true`.

**Uma verificação que às vezes não verifica é pior do que nenhuma**, porque
faz parar de olhar.

O `prettier --check` corre agora antes de tudo o resto. Analisa a sério, já é
dependência do projecto, e falha depressa. Se falhar por formatação e não por
sintaxe, resolve-se com:

```bash
npx prettier --write "src/**/*.js"
```

O servidor ganhou no mesmo dia o seu próprio `npm run verificar`, que faz
`node --check` a cada ficheiro e depois tenta importá-los. Antes disso, todo o
código do servidor ia para produção sem uma única confirmação de que sequer
analisava.
