# Quem viaja sem ter conta — o que a aplicação faz com os dados dele

**Para quê este documento.** A funcionalidade "pedir para outra pessoa",
publicada a 6 de Setembro de 2026, criou na aplicação uma figura que os
termos e a política de privacidade não preveem. Estes falam de duas pessoas —
o passageiro e o motorista — e passou a haver uma terceira.

Isto **não é um texto jurídico** e não propõe cláusulas. É o levantamento
exacto do que o sistema faz, para servir de base ao texto que o Simão
escrever. Cada afirmação foi verificada no código e no esquema da base de
dados, não na minha memória deles.

---

## 1. Quem é esta pessoa

Chamo-lhe **o viajante**: quem entra no carro quando quem pediu a viagem fica
em terra.

O que a distingue das outras duas:

- **Não tem conta** na aplicação, e não precisa de ter.
- **Não instalou nada**, e pode nem saber que a aplicação existe.
- **Não leu nem aceitou** os termos ou a política de privacidade.
- **Não foi ela que forneceu os seus dados** — foi outra pessoa.

## 2. Que dados, exactamente

Guardados na linha da viagem, na tabela `rides`:

| Campo | O que é | Obrigatório |
|---|---|---|
| `viajante_nome` | o nome que quem pede escreveu, até 80 caracteres | sim, se a viagem for para outra pessoa |
| `viajante_telefone` | o número que quem pede escreveu, até 20 caracteres | sim |
| `viajante_menor` | verdadeiro se quem pede declarou que é menor de idade | não (falso por omissão) |
| `consentimento_em` | o **instante** em que quem pede declarou ter autorização | só existe se `viajante_menor` for verdadeiro |

Nada mais. Não se guarda morada, documento, data de nascimento, fotografia
nem qualquer identificador do viajante.

**O `consentimento_em` guarda a hora e não um "sim".** Um "sim" diz que
alguém concordou alguma vez; o instante diz que concordou **antes daquela
viagem**, que é o que se pergunta quando se pergunta.

## 3. Como são recolhidos

**Declarados por terceiro.** Quem pede a viagem escreve o nome e o número num
formulário. A aplicação não verifica nada:

- não confirma que o número existe nem que pertence àquela pessoa;
- não confirma o nome;
- **não confirma a idade**, nem que quem declara é de facto responsável pelo
  menor ou tem autorização de quem o é;
- não avisa o viajante de que os dados dele foram introduzidos.

A declaração de autorização dos pais é uma **caixa que quem pede marca**. Sem
ela a viagem não se cria — é condição de existir o pedido, não um aviso que
se possa fechar. Mas é uma afirmação, não uma prova.

## 4. Quem vê, e quando

O sistema revela por fases, e a fase importa juridicamente porque determina
a quantas pessoas cada dado chega.

**Antes de um motorista aceitar** — a lista de pedidos vai para **todos os
motoristas disponíveis do município**:

- que a viagem é para outra pessoa: **sim**
- que essa pessoa é menor: **sim**
- nome do viajante: **não**
- telefone do viajante: **não**

*Porquê assim:* o motorista precisa de saber que vai transportar um menor
para poder recusar — é isso que faz do consentimento dele um consentimento.
O nome e o número não são precisos para essa decisão, e a lista chega a
muitos motoristas que nunca aceitarão a viagem.

**Depois de aceitar** — só o motorista daquela viagem:

- nome e telefone do viajante: **sim**
- o motorista liga para o número do viajante, não para o de quem pediu

**Quem pediu** vê sempre tudo o que escreveu, e o código de recolha.

**O código de recolha nunca chega ao motorista**, nem antes nem depois.

## 5. Onde ficam guardados

Base de dados PostgreSQL alojada na **Neon**, na região
`ap-southeast-1` — **Singapura**.

Os dados do viajante **saem de Timor-Leste** no momento em que a viagem é
criada.

## 6. Por quanto tempo

**Indefinidamente.** Não existe no sistema qualquer rotina que apague viagens
antigas. Uma viagem de hoje, com o nome e o número de quem viajou, continuará
na base de dados daqui a anos, salvo apagamento manual.

A única limpeza automática que existe no sistema é de fotografias de turno
dos motoristas, e não toca nisto.

## 7. Quem pode aceder

- **A equipa de gestão**, através do painel web em `/painel`, com uma conta
  marcada como administradora. Essa marca põe-se **à mão na base de dados** —
  não há forma de alguém se tornar administrador pela aplicação.
- **A Neon**, como alojadora da base de dados.
- **O Render**, como alojador do servidor por onde os dados passam.

## 8. O que o sistema **não** faz

- Não cria conta para o viajante.
- Não lhe envia mensagem nenhuma — nem a dizer que uma viagem foi pedida em
  seu nome, nem o código de recolha.
- Não lhe dá o botão de emergência: esse fica no telemóvel de quem pediu.
- Não lhe dá acompanhamento da viagem.

O ecrã diz isto a quem pede, **antes** de a viagem ser pedida e não depois:
*"O código de recolha e o botão de emergência ficam consigo. Dê o código a
quem vai viajar antes de o motorista chegar."*

---

## 9. As lacunas — a parte que mais interessa a um jurista

Estas não são defeitos por corrigir. São consequências da forma como a
funcionalidade foi desenhada, e o Simão deve decidir se são aceitáveis, se
precisam de cláusula, ou se precisam de mudança no produto.

**a) O viajante não sabe que temos dados dele.** Nunca é contactado. Se nunca
falar com quem pediu a viagem sobre isto, não tem como saber.

**b) O viajante não consegue exercer direito nenhum.** Não tem conta, não tem
sessão, e o sistema não tem forma de o autenticar. Não pode pedir acesso,
correcção ou apagamento — nem sequer sabe a quem os pedir. Na prática, quem
manda nos dados dele é quem os escreveu.

**c) O consentimento parental não é verificado.** É uma declaração de quem
pede. O sistema guarda o instante em que foi feita e nada mais. Se essa
declaração for falsa, o sistema não o sabe nem o pode saber.

**d) Nada é apagado.** Ver o ponto 6.

**e) Os dados saem do país.** Ver o ponto 5.

**f) O número fica no telemóvel do motorista.** Quando o motorista toca em
"ligar", o número entra no registo de chamadas do telefone dele e sai do
nosso controlo para sempre. Isto vale igualmente para os passageiros com
conta, mas para o viajante é mais grave: ele nunca consentiu sequer o
primeiro passo.

**g) Um menor pode viajar sozinho com um adulto desconhecido.** A aplicação
permite-o, com a declaração de quem pede e o consentimento do motorista. Foi
uma decisão do Simão, tomada a 6 de Setembro de 2026, e é a que mais
provavelmente exige tratamento expresso nos termos — tanto pela protecção do
menor como pela do motorista.

---

*Levantado em 6 de Setembro de 2026, a partir de `backend/src/rides.js`,
`backend/src/db.js`, `backend/src/routes/rides.js`, `backend/src/routes/admin.js`
e `mobile/src/components/ParaOutraPessoa.js`.*
