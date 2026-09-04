# Documentos jurídicos da TimorgianaRide

Sete documentos em Word, gerados por programa a partir das regras que a
aplicação **realmente** aplica. Não são um texto genérico adaptado: os prazos,
os documentos exigidos, os motivos de substituição, os preços e as taxas de
entrada foram lidos do código antes de serem escritos.

| # | Documento | Para quem |
|---|---|---|
| 1 | Regulamento de Admissão de Motoristas | interno e candidatos |
| 2 | Regulamento de Registo e Inspeção de Veículos | interno e candidatos |
| 3 | Contrato de Utilização da Plataforma | assinado com cada motorista |
| 4 | Declaração de Cedência de Veículo | proprietário + condutor |
| 5 | Política de Segurança dos Passageiros | público |
| 6 | Tabela de Infrações e Sanções | interno e motoristas |
| 7 | Checklist Documental para Aprovação | instrumento de trabalho |

## Regenerar

A data de versão está num sítio só, em `comum.js` (`VERSAO`). Muda-se aí e
regenera-se tudo:

```bash
cd juridico && npm install docx && node gerar.js
```

## O que NÃO está aqui

**Citações legais que eu não pudesse verificar.** O único diploma citado é o
Decreto-Lei n.º 6/2003, artigo 110.º, porque consta do próprio Kartaun
Inspesaun fotografado. Tudo o resto remete genericamente para "a legislação
aplicável" e para o Código da Estrada.

Inventar números de artigo num documento assinado por advogado seria o pior
serviço possível. A verificação e a citação exacta dos diplomas de
Timor-Leste ficam para quem tem acesso ao Jornal da República.

**As três decisões, tomadas em 03/09/2026:**

1. **Aprovação automática: NÃO.** A decisão de admitir um motorista é sempre
   humana. O motivo ficou escrito no documento 7, n.º 5.

2. **Seguro: existe obrigação legal.** O Simão indicou que em Timor-Leste não
   havia seguradora nem contrato de seguro. Fui verificar antes de apagar as
   cláusulas e encontrei o contrário: a **Instrução Pública n.º 07/2010**,
   aprovada pela Resolução do Conselho n.º 12/2010, de 17 de Dezembro
   (Jornal da República, `mj.gov.tl/jornal/?q=node/2209`), torna o seguro de
   responsabilidade civil **obrigatório para todos os veículos motorizados**
   (art. 3.º, n.º 1), com tectos de **USD 20.000** para transporte de
   passageiros e de carga e USD 6.000 para os restantes (art. 7.º, n.º 3).
   Assenta no Decreto-Lei n.º 6/2003 — o mesmo Código da Estrada que está
   impresso no Kartaun Inspesaun — e na Lei n.º 6/2005, art. 3.º.

   O Banco Central licencia a Sinarmas Insurance, S.A. e a Federal Insurance
   Timor, S.A.; a National Insurance Timor-Leste foi liquidada em 2018.

   Os cinco documentos que falam de seguro passam a citar a obrigação e a
   dizer, com todas as letras, que **quem circula sem apólice responde com o
   seu próprio património e sem limite**. Não confirmei que a Instrução se
   mantém em vigor — procurei revogação e não encontrei, o que não é o mesmo.

3. **Escala de suspensão: 3 / 7 / 15 dias.** Os trinta dias foram eliminados.
   Uma suspensão de um mês é uma desativação disfarçada — o motorista arranja
   outro trabalho e não volta —, e um degrau que parece intermédio e funciona
   como um fim engana os dois lados. Para os casos muito graves há suspensão
   preventiva sem prazo, que dura o que a análise durar, e desativação.

   Ficou escrito no documento 6 que **a suspensão não consome dias pagos**,
   porque um dia só é descontado quando há viagem concluída.

**Efeito na aplicação:** os termos do motorista dentro da app foram alterados
na mesma data e passaram à versão `2026-09-03`. Como mudou o sentido da
obrigação de seguro, os motoristas voltam a ter de os aceitar.
