# Processo DNTT — transporte por aplicação

Quatro documentos em Word para o processo junto da **Direção Nacional dos
Transportes Terrestres**, gerados por programa a partir do mesmo estilo dos
sete documentos jurídicos da plataforma (`../comum.js`).

| # | Documento | Para quem |
|---|---|---|
| 1 | Exposição ao DNTT | entregue com registo de entrada no DNTT |
| 2 | Parecer Jurídico — Enquadramento Legal | Anexo I da exposição |
| 3 | Anteprojeto de Diploma Ministerial | Anexo II — o texto que deixamos com eles |
| 4 | Dossier de Conformidade | Anexo III — o que a app já verifica e regista |

## Regenerar

A data está em `comum-dntt.js` (`VERSAO_DNTT`), separada da dos sete
documentos originais — nasceram em dias diferentes e não devem partilhar data.

```bash
cd juridico/dntt && node gerar-dntt.js
```

## Antes de entregar — decisões que são do Simão

1. **Confirmar os factos da Fase 1**: registo comercial e objeto social,
   licença do Comércio Doméstico, situação fiscal, seguro.
2. **A via do artigo 3.º do anteprojeto**: está escrito na via do *registo*
   da plataforma (a plataforma não é transportador). A alternativa é
   assumir-se como operador de transporte, com licença — muda o diploma todo.
3. **Os valores das taxas** (artigo 14.º) são indicativos e propostos por nós;
   quem os fixa é o Governo.
4. **O preço**: o parecer assume que a plataforma calcula a tarifa. Se se
   decidir passar a apenas sugerir um valor, há que rever o ponto III do
   parecer e o artigo 5.º do anteprojeto.

## Base legal citada (lida, não presumida)

- Decreto-Lei n.º 2/2003, de 10 de Março — Lei de Bases dos Transportes Rodoviários
- Decreto-Lei n.º 6/2003, de 3 de Abril — Código da Estrada
- Diploma Ministerial n.º 5/2010, de 5 de Maio — táxis
- Diplomas Ministeriais n.os 2 e 3/MTCOP/2003 — transporte coletivo

Comparado: Lei n.º 45/2018 (Portugal, TVDE); Permenhub n.º 12/2019 (Indonésia);
acórdãos do TJUE C-434/15 (Uber Spain), C-320/16 (Uber France) e C-390/18 (Airbnb).
