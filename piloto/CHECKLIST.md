# Piloto TimorgianaRide — Díli

Lista do que falta para pôr a app na rua. Divide-se em duas colunas porque
duas coisas diferentes estão a bloquear: uma resolve-se com código, a outra
não.

---

## Antes de falar com o primeiro motorista

### Legal — isto é teu, e é a sério

Estás a guardar cartas de condução, documentos de veículos e fotografias de
pessoas numa base de dados alojada em Singapura. Isso deixou de ser um
projecto pessoal no momento em que um motorista real enviar a primeira foto.

- [x] **Licenciamento de transporte** — RESOLVIDO (30-08-2026). O estatuto
      da Timorgiana, Lda registado no SERVE inclui no objecto social
      **"Outros transportes terrestres (transportes terrestres de
      passageiros)"**, e ainda "Consultoria e programação informática" e
      "Atividades de processamento de dados, domiciliação de informações e
      atividades relacionadas portais web" — ou seja, cobre os dois lados
      do negócio: a plataforma e o transporte.

      ⚠️ **MAS há uma tensão a resolver, e é do teu lado.** Os termos dizem
      que a TimorgianaRide "não é uma empresa de transportes nem presta
      serviços de condução". O estatuto diz que a sociedade tem por
      objecto o transporte terrestre de passageiros.

      Um objecto social largo é normal e não obriga a exercer tudo. Mas num
      litígio, quem estiver do outro lado vai apontar para o estatuto e
      dizer: "está registada como transportadora". A cláusula de exclusão
      de responsabilidade fica mais fraca do que parece no papel.

      Duas saídas, e a escolha é tua: ou o estatuto passa a distinguir a
      actividade de intermediação da de transporte, ou os termos deixam de
      negar de forma absoluta o que o estatuto afirma. Eu não sei qual é
      melhor em Timor-Leste — sabes tu.
- [x] **Estatuto dos motoristas** — ESCRITO na tua revisão dos termos:
      "prestador de serviços e profissional independente, sem qualquer
      relação de subordinação jurídica, vínculo laboral ou exclusividade".
      Está explícito e não subentendido, que era o que faltava.
- [x] **Termos de utilização**, PT + Tétum, dentro da app antes do registo
      — RASCUNHO FEITO, falta a tua revisão. Estão em
      `mobile/src/termos/`. Três secções marcadas com ⚖ dependem de
      direito timorense e são decisão tua, não minha:
      · Responsabilidade civil (passageiro e motorista)
      · Estatuto de trabalhador independente do motorista
      Nenhum motorista real deve aceitar isto antes de o teres lido.
      A versão está em `termos/versao.js` — muda-a se alterares o texto,
      senão quem aceitou o antigo fica marcado como tendo aceite o novo.
- [x] **Lista de veículos: MANTÉM-SE.** Decisão do Simão em 30/08/2026 —
      serve de sugestão ao motorista, não de cadastro oficial.
      (era:) **Corrigir a lista de veículos.** `mobile/src/dados/veiculos.js` tem
      29 motorizadas e 40 carros, montados a partir do mercado indonésio —
      **não é um registo oficial de Timor-Leste**. Vale a pena olhares para
      a rua e dizeres o que falta e o que lá está a mais. Os lugares de
      cada carro também são estimativa minha. Há sempre "Outro" com
      escrita livre, por isso ninguém fica bloqueado.
- [x] **Rever o inglês dos termos.** FEITO — traduzido do português (que
      prevalece) e ligado ao selector de idioma. A app passou a ter três línguas
      (2026-08-22) porque a comunidade internacional em Díli — ONU, ONG,
      embaixadas, visitantes — é um segmento de passageiros com poder de
      compra. Os termos em inglês são tradução minha do português e têm o
      mesmo estatuto: rascunho a rever.
- [x] **Revisão do tétum por falante nativo.** FEITA pelo Simão, e aplicada
      chave a chave a partir do documento. (era:) É mais urgente
      aqui do que no resto da app: uma palavra mal escolhida muda o que a
      pessoa julga estar a aceitar.
- [x] **Responsabilidade civil: DO MOTORISTA.** Decidido em 30/08/2026 e
      já escrito nos termos das três línguas.
      (era:) **Responsabilidade civil** — quem responde se houver um acidente
      durante uma viagem marcada pela app. Decide isto antes, não depois.
- [x] **Seguro: DO MOTORISTA.** Decidido em 30/08/2026. Passou a requisito
      expresso nos termos. FICA POR CONFIRMAR de facto se as apólices
      praticadas em Timor-Leste cobrem transporte a título oneroso — muitas
      excluem-no, e a cláusula não cria seguro nenhum.
      (era:) **Seguro** — o dos motoristas cobre transporte de passageiros a
      pagamento? Muitas apólices particulares não cobrem.

- [x] **Protecção de dados** — RESOLVIDO (30-08-2026) a partir do projecto
      de Lei da Proteção de Dados Pessoais. A lei ainda NÃO está em vigor
      (data de aprovação por preencher; entra em vigor 180 dias após
      publicação, artigo 51.º) e a ANPD só se considera criada nessa data,
      com membros eleitos até 120 dias depois (artigo 48.º). O aviso de
      privacidade na app já nomeia a ANPD como autoridade futura e diz
      para onde reclamar entretanto.

      O artigo 49.º dá margem: nos primeiros 18 meses a ANPD privilegia
      orientação, e as coimas por infracções leves por negligência só
      começam 18 meses após a entrada em vigor — excepto em dados
      sensíveis, violações graves de segurança ou recusa de cooperação.

> Não sou advogado em Timor-Leste e tu és. Deixo a lista; a análise é tua.

### Técnico — feito, falta confirmares

- [x] Enviar a Fase 4 (`git push`) — feito 21/08/2026, servidor confirmado no ar
- [x] **Ecrã de registo.** Estava partido desde a regeneração dos termos
      (campo `aceitarCurto` perdido). Arranjado e confirmado pelo Simão
      em 30/08/2026.
- [ ] Abrir o painel de administração na app e confirmar que os números batem
- [ ] Fazer um SOS de teste e confirmar que chega
- [x] Trocar a palavra-passe do Neon — FEITO 30/08/2026. Rodada no Neon,
      actualizada no Render e no .env local; confirmado que a antiga já é
      recusada. A nova também passou pela conversa (numa fotografia), por
      isso vale um último reset feito só pelo Simão quando quiser.
- [x] Rever o tétum com um falante nativo — FEITO

---

## Recrutar os motoristas

O objectivo é **5 a 10 motoristas**, não mais. Um piloto grande de mais
esconde os problemas em vez de os mostrar.

### Quem procurar

Motoristas que já fazem transporte em Díli e que já usam Grab ou Maxim.
Sabem o trabalho, sabem o que os incomoda na concorrência, e conseguem
comparar. Um motorista que nunca fez isto não te consegue dizer se a app
é boa.

### O que lhes dizes

O argumento é um só e é forte: **não há comissão**. Numa viagem de $3, a
Grab fica com cerca de 20%. Aqui ficam com $3.

Não prometas volume. Não tens passageiros ainda — sê honesto sobre isso.
O que estás a pedir é que testem, não que larguem o que têm.

### O que lhes dás

- O link do manual (Tétum + Português) — explica a instalação sozinho
- O teu número, para quando falhar

### O que tens de fazer no momento

Cada motorista que se regista fica **à espera de aprovação**. Tens de abrir
o painel na app e aprová-lo. Se demorares dois dias, ele desiste. Aprova no
mesmo dia.

---

## Durante o piloto

### O que medir

Não são as viagens. É isto:

| O quê | Porquê importa |
|---|---|
| Quantos instalaram vs. quantos ficaram online | Mede se a instalação é o obstáculo |
| Tempo entre pedido e aceitação | Se passa de 2–3 min, o passageiro desiste |
| Pedidos sem resposta | Motoristas a mais offline, ou poucos na zona |
| Cancelamentos depois de aceitar | Mede se o preço firme está a ser aceite |
| Onde é que a app os confundiu | O que arranjar a seguir |

### As perguntas que valem a pena fazer

Depois da primeira viagem real de cada motorista, uma chamada de 5 minutos:

1. Onde é que te enganaste a usar a app?
2. O preço que a app mostrou pareceu-te justo?
3. O passageiro percebeu quanto tinha de pagar?
4. Preferes isto ou a Grab? Porquê?

A pergunta 1 é a que dá mais resultado. Ninguém diz "a app é má" — dizem
"carreguei aqui e não percebi o que aconteceu".

---

## O que ainda não existe

Coisas reais que faltam e que o piloto vai expor. Não são falhas do
código — são decisões que ainda não tomaste:

- **Passageiros.** Tens motoristas mas não tens procura. Um motorista
  online sem pedidos desliga ao fim de duas horas e não volta.
- **Zona de arranque.** Cobrir Díli inteira com 5 motoristas dá tempos de
  espera longos. Escolher uma zona (Timor Plaza, Farol, Lecidere) e
  concentrar lá é melhor do que espalhar.
- **Suporte.** Quando um motorista ligar às 21h, quem atende?
- **Limite do Nominatim.** A pesquisa de sítios e o nome da rua em
  movimento usam o serviço gratuito do OpenStreetMap, que aceita cerca de
  1 pedido por segundo no total. Está limitado por distância (só pergunta
  a rua depois de 150 m percorridos), o que dá cerca de 1 pedido cada 28 s
  por viagem — folgado para 5 a 10 motoristas. **Acima de ~30 viagens em
  simultâneo isto deixa de servir** e passa a ser preciso alojar um
  Nominatim próprio ou pagar um serviço.
- **iPhone — decidido em 21/08/2026: fica de fora do piloto.** Distribuir
  a iPhones exige o Apple Developer Program (99 USD/ano) e não há
  alternativa: a Apple não permite instalação fora da App Store nem do
  TestFlight. Em Díli a esmagadora maioria dos motoristas usa Android, por
  isso o custo não se justifica antes de haver procura que o pague.
  O Simão testa no iPhone dele pelo **Expo Go** (grátis, porque a app é
  SDK 54 e é essa a versão que a App Store ainda serve).
  Rever esta decisão se aparecerem passageiros ou motoristas com iPhone.
