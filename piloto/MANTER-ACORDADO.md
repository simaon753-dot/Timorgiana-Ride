# O servidor a adormecer, e o que fazer

## O problema

O plano gratuito do Render adormece o serviço ao fim de 15 minutos sem
pedidos. O primeiro pedido a seguir demora perto de um minuto, porque o
contentor tem de arrancar do zero.

Quem abre a aplicação de manhã em Díli apanha essa espera inteira — e
não tem como saber que o problema não é a internet dele.

Uma vez com motoristas ligados, o servidor fica acordado sozinho: a
ligação deles conta como actividade. **O arranque lento só apanha a
primeira pessoa do dia.** Continua a ser mau, mas é mais limitado do que
parece à primeira vista.

## A solução em uso

`.github/workflows/manter-acordado.yml` bate no `/api/health` de 10 em 10
minutos.

Não contorna o plano: o Render dá **750 horas de máquina por mês**, e um
mês inteiro ligado são **730**. Cabe dentro do que já está incluído.

### O custo depende de o repositório ser público ou privado

| | Minutos do GitHub Actions | Esta tarefa |
|---|---|---|
| **Público** | ilimitados e gratuitos | grátis |
| **Privado** | 2000/mês gratuitos | **cerca de 4300/mês** — não cabe |

O GitHub cobra no mínimo **1 minuto por execução**, mesmo que a tarefa
demore 3 segundos. São 144 execuções por dia.

**Se o repositório for privado**, apaga o ficheiro e usa um serviço
externo de monitorização. Qualquer um destes tem plano gratuito com
intervalo de 5 minutos, e a configuração é colar o endereço:

- UptimeRobot
- cron-job.org
- Better Stack

Todos exigem criar conta — é uma coisa que tens de fazer tu.

### Se a tarefa deixar de correr

O GitHub desactiva tarefas agendadas em repositórios **sem actividade há
60 dias**. Se pararem de correr, chega um commit qualquer para as
reactivar. O agendamento também é por ordem de disponibilidade e pode
atrasar-se — daí os 10 minutos em vez de 14, para haver margem.

## Se um dia mudares de plataforma

### A restrição que decide tudo

O servidor guarda as salas de socket **na memória do processo**:

```js
socket.join(`user:${user.id}`);
socket.join('admins');
io.to(`user:${ride.passenger_id}`).emit(...)
```

Não há adaptador Redis. Isso significa que a aplicação tem de correr em
**exactamente um processo**. Se duas cópias correrem ao mesmo tempo, um
passageiro ligado à cópia A nunca recebe um aviso emitido pela cópia B —
e o sintoma é o pior possível: **funciona quase sempre**, e falha ao
acaso, sem erro nenhum nos registos.

Qualquer plataforma que escale automaticamente para mais do que uma
instância parte isto em silêncio. Antes de migrar, ou se fixa o número de
instâncias em 1, ou se acrescenta o adaptador de Postgres do Socket.IO —
a base de dados já lá está, não é preciso um Redis novo.

### Recomendação: Fly.io, região `sin` (Singapura)

Porquê:

- **Processos persistentes.** É o modelo que o Socket.IO precisa; não é
  uma plataforma sem servidor a fingir que aguenta ligações abertas.
- **Singapura**, a mesma região da base de dados Neon. Medi: a consulta
  à base de dados a partir do Render custa tempo nenhum, o que confirma
  que estão lado a lado. Mudar para uma região errada estragava isso.
- **Sempre ligado**, sem adormecer.
- **Uma máquina pequena custa menos do que o Render Starter.**
- A migração é um `Dockerfile` de dez linhas — a aplicação é Express
  simples, sem nada de especial.

### Porque não as outras

**Google Cloud Run** — arranca em 1 a 3 segundos em vez de um minuto, e o
plano gratuito provavelmente chegava. Mas escala para várias instâncias
por omissão, o que parte as salas de socket como está descrito acima. É
preciso fixar o máximo em 1, e nesse momento perde-se a razão de usar
Cloud Run.

**Oracle Cloud Always Free** — grátis para sempre e nunca adormece, com
Singapura disponível. Mas passas a gerir um Ubuntu: certificados, o
serviço a arrancar sozinho, actualizações de segurança, os deploys.
É um segundo trabalho. A capacidade das máquinas ARM também costuma
estar esgotada nas regiões procuradas.

**Railway** — equivalente ao Fly.io e igualmente válido. Escolhi o
Fly.io por ser mais barato numa máquina pequena, mas não é uma diferença
que mude a vida.

**Render Starter (~$7/mês)** — se aparecerem receitas, é a opção sem
trabalho nenhum: um botão no painel, e nada mais muda.

> Os planos e preços destas empresas mudam com frequência. Confirma antes
> de decidires — sobretudo o Fly.io e o Cloud Run, que já mudaram de
> modelo mais do que uma vez.
