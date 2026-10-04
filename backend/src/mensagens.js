// AS MENSAGENS DO SERVIDOR NAS TRÊS LÍNGUAS (15/09/26).
//
// Até aqui o servidor respondia sempre em português: "Os carregamentos abrem
// quando for anunciado…" chegava assim a um motorista com a app em tétum. A app
// passou a dizer em que língua está (cabeçalho X-Lingua) e a resposta vem
// nessa língua.
//
// O TEXTO PORTUGUÊS É A CHAVE. As rotas continuam a escrever a mensagem em
// português, como sempre; a tradução acontece à saída (server.js, em
// res.json). Nenhuma rota muda por isto, e uma mensagem nova sem tradução
// chega em português em vez de partir — o scripts/verificar-mensagens.mjs é
// que não a deixa publicar sem tétum e inglês.
//
// As partes variáveis escrevem-se {0}, {1}… pela ordem em que aparecem no
// texto português.
//
// O tétum é rascunho meu, para o Simão rever.

export const LINGUAS = ['pt', 'tet', 'en'];

// 'texto em português': ['tétum', 'inglês']
export const MENSAGENS = {
  // ── Assinatura e pagamentos
  'Número de dias inválido.': ['Númeru loron nian inválidu.', 'Invalid number of days.'],
  'Escreva as instruções (conta, titular ou morada) antes de ligar esta forma.': [
    'Hakerek instrusaun (konta, na’in ka enderesu) antes atu liga ba forma ida-ne’e.',
    'Write the instructions (account, holder or address) before switching this method on.',
  ],
  'Só uma conta de motorista pode carregar dias.': [
    'Konta motorista nian de’it mak bele halo karegamentu ba loron.',
    'Only a driver account can top up days.',
  ],
  'Os carregamentos abrem quando for anunciado o fim do período gratuito.': [
    'Karegamentu loke bainhira iha anúnsia ofisialmente kona-ba rohan husi períodu gratuitu nian.',
    'Top-ups open when the end of the free period is announced.',
  ],
  'A cobrança tem de ser anunciada com pelo menos 30 dias de antecedência.': [
    'Tenke anúnsia kobransa pelumenus loron 30 molok.',
    'Charging must be announced at least 30 days in advance.',
  ],
  'A cobrança já começou. Para a suspender, marque um novo dia de início.': [
    'Kobransa hahú ona. Atu suspende, marka inísiu husi loron foun ida.',
    'Charging has already started. To suspend it, set a new start date.',
  ],
  'Data inválida.': ['Data inválida.', 'Invalid date.'],
  'Pacote inválido.': ['Pakote inválidu.', 'Invalid package.'],
  'Forma de pagamento inválida.': ['Forma pagamentu inválida.', 'Invalid payment method.'],
  'Esta forma de pagamento não está disponível.': [
    'Forma husi pagamentu ida-ne’e seidauk disponível.',
    'This payment method is not available.',
  ],
  'Formato não aceite. Envie uma fotografia do comprovativo.': [
    'Formatu la aseita. Haruka fotografia komprovativu nian.',
    'Format not accepted. Send a photo of the proof of payment.',
  ],
  'Falta o comprovativo do pagamento.': [
    'Falta komprovativu pagamentu nian.',
    'The proof of payment is missing.',
  ],
  'Comprovativo demasiado grande (máximo 4 MB).': [
    'Komprovativu boot liu (másimu 4 MB).',
    'Proof of payment too large (maximum 4 MB).',
  ],
  'Já tem um pedido à espera de confirmação.': [
    'Ita iha ona pedidu ida ne’ebé hein hela konfirmasaun.',
    'You already have a request awaiting confirmation.',
  ],
  'Este pedido já não está à espera.': [
    'Pedidu ida-ne’e la hein tiha ona.',
    'This request is no longer pending.',
  ],
  'Pedido não encontrado.': ['Pedidu buka la hetan.', 'Request not found.'],
  'Este pedido já foi decidido.': [
    'Pedidu ida-ne’e desidi tiha ona.',
    'This request has already been decided.',
  ],
  'O teu registo não está recusado.': [
    'Ita-nia rejistu la rejeita.',
    'Your registration has not been rejected.',
  ],
  'Formato não aceite. Envie uma fotografia do veículo.': [
    'Formatu la aseita. Haruka fotografia veíkulu nian.',
    'Format not accepted. Send a photo of the vehicle.',
  ],
  'Corrige o teu documento ({0}): {1}': [
    'Hadi’a ita-nia dokumentu ({0}): {1}',
    'Correct your document ({0}): {1}',
  ],
  'Indique o motivo: o motorista precisa de saber o que corrigir.': [
    'Hakerek motivu: motorista presiza hatene saida mak atu hadi’a.',
    'Give the reason: the driver needs to know what to correct.',
  ],
  'Motivo de devolução inválido.': ['Motivu devolusaun inválidu.', 'Invalid refund reason.'],
  'Esta conta não tem dias por usar.': [
    'Konta ne’e la iha hela loron ruma ne’ebé mak seidauk uza.',
    'This account has no unused days.',
  ],
  'Carregue a imagem do QR antes de ligar esta forma.': [
    'Karega QR nia imajen uluk antes liga ba forma ida-ne’e.',
    'Upload the QR image before switching this method on.',
  ],
  'Desligue o pagamento por QR antes de retirar a imagem.': [
    'Dezliga uluk pagamentu ho QR antes hamoos imajen.',
    'Switch QR payment off before removing the image.',
  ],
  'Formato não aceite. Envie a imagem do QR (JPEG, PNG ou WebP).': [
    'Formatu la aseita. Haruka QR nia imajen (JPEG, PNG ka WebP).',
    'Format not accepted. Send the QR image (JPEG, PNG or WebP).',
  ],
  'Imagem demasiado grande (máximo 2 MB).': [
    'Imajen boot liu (másimu 2 MB).',
    'Image too large (maximum 2 MB).',
  ],
  'Falta a imagem.': ['Falta imajen.', 'The image is missing.'],
  'Ainda não há imagem do QR.': ['Seidauk iha QR nia imajen.', 'There is no QR image yet.'],

  // ── Sessão e permissões
  'Token em falta.': ['Falta token.', 'Missing token.'],
  'Token inválido ou expirado.': ['Token inválidu ka kaduka ona.', 'Invalid or expired token.'],
  'Utilizador não encontrado.': ['La hetan utilizadór ruma.', 'User not found.'],
  'O caminho mudou. Confirma o preço novo.': [
    'Dalan muda tiha ona. Konfirma presu foun.',
    'The route changed. Confirm the new price.',
  ],
  'A tua conta foi aberta noutro telemóvel. Entra de novo para continuares aqui.': [
    'Ita-nia konta loke ona iha telemóvel seluk. Tama fila-fali atu kontinua iha ne’e.',
    'Your account was opened on another phone. Sign in again to continue here.',
  ],
  'Serviço indisponível. Tenta de novo.': [
    'Servisu la disponível hela. Koko fila-fali.',
    'Service unavailable. Try again.',
  ],
  'Sem permissão para esta ação.': [
    'La iha permisaun ba asaun ida-ne’e.',
    'No permission for this action.',
  ],
  'A tua conta de motorista ainda não foi aprovada.': [
    'Ita-nia konta motorista seidauk hetan aprovasaun.',
    'Your driver account has not been approved yet.',
  ],
  'Sem permissão.': ['La iha permisaun.', 'No permission.'],
  'Não autenticado.': ['Seidauk autentika.', 'Not authenticated.'],
  'Falha na autenticação.': ['Falla iha autentikasaun.', 'Authentication failed.'],
  'Demasiadas tentativas. Espera {0} segundos.': [
    'Koko barak liu ona. Hein segundu {0}.',
    'Too many attempts. Wait {0} seconds.',
  ],
  'Demasiadas tentativas. Espera 1 minuto.': [
    'Koko barak liu ona. Hein minutu 1.',
    'Too many attempts. Wait 1 minute.',
  ],
  'Demasiadas tentativas. Espera {0} minutos.': [
    'Koko barak liu ona. Hein minutu {0}.',
    'Too many attempts. Wait {0} minutes.',
  ],
  'Demasiadas tentativas. Espera uns minutos e tenta outra vez.': [
    'Koko barak liu ona. Hein minutu balun no koko fila-fali.',
    'Too many attempts. Wait a few minutes and try again.',
  ],

  // ── Documentos e fotografias
  'Tipo de documento inválido.': ['Dokumentu nia tipu inválidu.', 'Invalid document type.'],
  'Formato não aceite. Usa JPEG, PNG ou PDF.': [
    'Formatu la aseita. Uza JPEG, PNG ka PDF.',
    'Format not accepted. Use JPEG, PNG or PDF.',
  ],
  'Ficheiro vazio.': ['Fixeiru mamuk.', 'Empty file.'],
  'Ficheiro demasiado grande (máximo 4 MB).': [
    'Fixeiru boot liu (másimu 4 MB).',
    'File too large (maximum 4 MB).',
  ],
  'Data inválida. Usa o formato AAAA-MM-DD.': [
    'Data la válidu. Uza formatu AAAA-MM-DD.',
    'Invalid date. Use the format YYYY-MM-DD.',
  ],
  'Formato não aceite. Usa uma fotografia.': [
    'Formatu la aseita. Uza fotografia ida.',
    'Format not accepted. Use a photo.',
  ],
  'Fotografia demasiado grande (máximo 3 MB).': [
    'Fotografia boot liu (másimu 3 MB).',
    'Photo too large (maximum 3 MB).',
  ],
  'Máximo de {0} fotografias.': ['Másimu fotografia {0}.', 'A maximum of {0} photos.'],
  'Esse documento não existe na tua conta.': [
    'Dokumentu ne’e la iha iha ita-nia konta.',
    'That document is not in your account.',
  ],
  'Fotografia em falta.': ['Falta fotografia.', 'Photo missing.'],
  'Sem fotografia.': ['La iha fotografia.', 'No photo.'],
  'Ficheiro em falta.': ['Falta fixeiru.', 'File missing.'],
  'Motivo desconhecido.': ['Motivu deskoñesidu.', 'Unknown reason.'],
  'O teu documento ({0}) caducou em {1}.': [
    'Ita-nia dokumentu ({0}) kaduka tiha ona iha {1}.',
    'Your document ({0}) expired on {1}.',
  ],
  'Falta a data de validade do teu documento ({0}).': [
    'Falta data validade ba ita-nia dokumentu ({0}).',
    'The expiry date of your document ({0}) is missing.',
  ],
  'Faltam documentos na tua conta.': [
    'Falta dokumentu sira husi ita-nia konta.',
    'Documents are missing from your account.',
  ],

  // ── Recuperar o acesso
  'Número ou código errado.': ['Númeru ka kódigu sala.', 'Wrong number or code.'],
  'A palavra-passe tem de ter pelo menos 6 caracteres.': [
    'Seña tenke iha pelumenus karákter 6.',
    'The password must have at least 6 characters.',
  ],
  'Demasiadas tentativas. Peça um código novo.': [
    'Koko barak liu ona. Husu fali kódigu foun.',
    'Too many attempts. Ask for a new code.',
  ],

  // ── Painel de administração
  'Documento não encontrado.': ['La hetan dokumentu ruma.', 'Document not found.'],
  'Decisão inválida.': ['Desizaun inválida.', 'Invalid decision.'],
  'Indica o motivo da decisão.': [
    'Hakerek motivu husi desizaun.',
    'Give the reason for the decision.',
  ],
  'Motorista não encontrado.': ['La hetan motorista ruma.', 'Driver not found.'],
  'Alerta não encontrado.': ['La hetan alerta ruma.', 'Alert not found.'],
  'Fotografia não encontrada.': ['La hetan fotografia ruma.', 'Photo not found.'],
  'Conta não encontrada.': ['La hetan konta ruma.', 'Account not found.'],
  'Viagem não encontrada.': ['La hetan viajen ruma.', 'Ride not found.'],
  // ── Tabela de destinos do Pickup (28/09/2026)
  'Lista de destinos inválida.': ['Lista destinu nian inválida.', 'Invalid destination list.'],
  'Demasiados destinos.': ['Destinu barak liu.', 'Too many destinations.'],
  'Cada destino precisa de um nome (2 a 40 letras).': [
    'Kada destinu presiza iha naran ida (letra 2 to’o 40).',
    'Each destination needs a name (2 to 40 letters).',
  ],
  'Há coordenadas fora de Timor-Leste.': [
    'Iha koordenada balun fora husi Timor-Leste.',
    'Some coordinates are outside Timor-Leste.',
  ],
  'O raio tem de ser de 0,5 a 30 km.': [
    'Raiu tenke husi 0,5 to’o 30 km.',
    'The radius must be 0.5 to 30 km.',
  ],
  'O preço tem de ser de $1 a $500.': [
    'Folin tenke hahu husi $1 to’o $500.',
    'The price must be $1 to $500.',
  ],
  // ── Entrada no painel com código (28/09/2026)
  'Esta conta não é de administrador.': [
    'Konta ida-ne’e la’ós administradór nian.',
    'This account is not an administrator account.',
  ],
  'Para entrar no painel, confirme primeiro o seu email na aplicação (Perfil). O código de entrada vai para esse email.':
    [
      'Atu tama painel, konfirma uluk ita-nia email iha aplikasaun (Perfil). Kódigu tama nian sei haruka ba email ida-ne’e.',
      'To sign in to the panel, first confirm your email in the app (Profile). The sign-in code is sent to that email.',
    ],
  'Pediu demasiados códigos. Espere alguns minutos e tente de novo.': [
    'Ita husu kódigu barak liu. Hein minutu balun no koko fali.',
    'You requested too many codes. Wait a few minutes and try again.',
  ],
  'Não foi possível enviar o código por email. Tente de novo dentro de um minuto.': [
    'La konsege haruka kódigu liuhusi email. Koko fila-fali iha minutu ida nia laran.',
    'The code could not be sent by email. Try again in a minute.',
  ],
  'Código errado ou expirado. Peça outro, entrando de novo.': [
    'Kódigu sala ka liu ona. Husu fali seluk, hodi tama fila-fali.',
    'Wrong or expired code. Request another by signing in again.',
  ],
  'A sessão do painel terminou por inactividade. Entre de novo.': [
    'Sesaun painel remata tanba la iha atividade ruma. Tama fila-fali.',
    'The panel session ended due to inactivity. Sign in again.',
  ],
  // ── Ocorrências (Reportar)
  'Esta viagem não pode ser reportada.': [
    'La bele relata viajen ida-ne’e.',
    'This trip cannot be reported.',
  ],
  'Já passou o prazo para reportar esta viagem.': [
    'Prazu atu relata viajen ida-ne’e liu tiha ona.',
    'The deadline to report this trip has passed.',
  ],
  'Escolha o tipo de problema.': ['Hili problema nia tipu.', 'Choose the type of problem.'],
  'Descreva o que aconteceu.': ['Deskreve saida mak akontese.', 'Describe what happened.'],
  'Já reportou esta viagem várias vezes. A equipa vai analisar.': [
    'Ita relata dala barak ona viajen ida-ne’e. Ekipa sei analiza ba ida-ne’e.',
    'You have already reported this trip several times. The team will review it.',
  ],
  'Ocorrência não encontrada.': ['La hetan okorrénsia ruma.', 'Incident not found.'],
  'Motorista inválido.': ['Motorista inválida.', 'Invalid driver.'],
  'Forma de pagamento desconhecida.': [
    'Forma husi pagamentu ne’e deskoñesidu.',
    'Unknown payment method.',
  ],
  'Sem comprovativo.': ['La iha komprovativu ruma.', 'No proof of payment.'],
  'Conta inválida.': ['Konta inválida.', 'Invalid account.'],
  'Documento inválido.': ['Dokumentu inválidu.', 'Invalid document.'],
  'Estado inválido.': ['Estadu inválidu.', 'Invalid status.'],
  'Indica a data no formato AAAA-MM-DD.': [
    'Hakerek data ho formatu AAAA-MM-DD.',
    'Give the date in the format YYYY-MM-DD.',
  ],
  'Não há viagens terminadas até essa data.': [
    'La iha viajen ne’ebé remata ona to’o data ida-ne’e.',
    'There are no finished rides up to that date.',
  ],
  'Confirmação em falta.': ['Falta hela konfirmasaun.', 'Confirmation missing.'],
  'Falta o nome.': ['Falta hela naran.', 'The name is missing.'],
  'Faltam coordenadas do sítio ou da paragem.': [
    'Falta hela koordenada fatin nian ka paragem nian.',
    'Coordinates of the place or stop are missing.',
  ],
  'Essas coordenadas não são de Timor-Leste.': [
    'Koordenada hirak-ne’e la’ós Timor-Leste nian.',
    'Those coordinates are not in Timor-Leste.',
  ],
  'Paragem não encontrada.': ['La hetan paragem ruma.', 'Stop not found.'],
  // 30/09/2026 — rascunho meu, depois da revisão dele.
  'Só se podem eliminar lugares recusados.': [
    'Bele hamoos de’it fatin sira ne’ebé rekuza tiha ona.',
    'Only rejected places can be deleted.',
  ],

  // ── Registo e entrada
  'Nome é obrigatório.': ['Naran obrigatóriu.', 'Name is required.'],
  'O nome é demasiado curto.': ['Naran badak liu.', 'That name is too short.'],
  'O nome é demasiado longo.': ['Naran naruk liu.', 'That name is too long.'],
  'Número de telemóvel inválido.': ['Númeru telemóvel inválidu.', 'Invalid mobile number.'],
  'A palavra-passe deve ter pelo menos 6 caracteres.': [
    'Seña tenke iha pelumenus karákter 6.',
    'The password must be at least 6 characters.',
  ],
  'Escreve um email válido — serve para recuperares a conta.': [
    'Hakerek email ida ne’ebé válidu — ne’e atu rekupera fila-fali ita-nia konta.',
    'Enter a valid email — it is how you recover your account.',
  ],
  'Tipo de conta inválido.': ['Tipu husi konta ne’e inválidu.', 'Invalid account type.'],
  'Motoristas têm de indicar a matrícula do veículo.': [
    'Motorista tenke hakerek veíkulu nia matríkula.',
    'Drivers must give the vehicle’s plate.',
  ],
  'Conduzir na TimorgianaRide está reservado a cidadãos de Timor-Leste.': [
    'Konduz iha TimorgianaRide rezerva de’it ba sidadaun Timor-Leste.',
    'Driving with TimorgianaRide is reserved for citizens of Timor-Leste.',
  ],
  'Para conduzir é preciso um número de telemóvel de Timor-Leste.': [
    'Atu konduz, presiza númeru telemóvel Timor-Leste nian.',
    'To drive you need a Timor-Leste mobile number.',
  ],
  'É preciso aceitar os termos de utilização.': [
    'Tenke aseita termu utilizasaun nian.',
    'You must accept the terms of use.',
  ],
  'Indica a carroçaria e a capacidade do Pickup.': [
    'Hakerek Pickup nia karosaria no kapasidade.',
    'Give the Pickup’s body type and capacity.',
  ],
  'Já existe uma conta com este número de telemóvel.': [
    'Iha ona konta ida ho númeru telemóvel ida-ne’e.',
    'An account with this mobile number already exists.',
  ],
  'Erro ao criar a conta.': ['Erru bainhira kria konta.', 'Error creating the account.'],
  'Telemóvel e palavra-passe são obrigatórios.': [
    'Telemóvel no seña obrigatóriu.',
    'Mobile number and password are required.',
  ],
  'Telemóvel ou palavra-passe incorretos.': [
    'Telemóvel ka seña la loos.',
    'Incorrect mobile number or password.',
  ],
  'Erro ao iniciar sessão.': ['Erru bainhira tama.', 'Error signing in.'],
  'Erro ao guardar.': ['Erru bainhira rai.', 'Error saving.'],
  'Nada para aceitar.': ['La iha buat ida atu aseita.', 'Nothing to accept.'],
  'Não foi possível guardar.': ['La konsege rai.', 'Could not save.'],
  'Código inválido ou expirado. Peça outro.': [
    'Kódigu inválidu ka kaduka ona. Husu fali seluk.',
    'Invalid or expired code. Ask for another.',
  ],
  'Não foi possível confirmar.': ['La konsege konfirma.', 'Could not confirm.'],
  'Não foi possível enviar.': ['La konsege haruka.', 'Could not send.'],
  'Escreve um email válido.': ['Hakerek email ida ne’ebé válidu.', 'Enter a valid email.'],

  // ── Motorista
  'Valor inválido.': ['Valor inválidu.', 'Invalid value.'],
  'A tua conta ainda não foi aprovada.': [
    'Ita-nia konta seidauk hetan aprovasaun.',
    'Your account has not been approved yet.',
  ],
  'Os termos para motoristas mudaram. Lê-os e aceita-os para ficares disponível.': [
    'Termu ba motorista muda ona. Lee no aseita atu ita bele disponível.',
    'The driver terms have changed. Read and accept them to go available.',
  ],
  'Tira uma fotografia para começar o dia.': [
    'Hasai fotografia ida atu hahú loron ohin nian.',
    'Take a photo to start the day.',
  ],
  'A tua assinatura acabou. Carrega dias para voltar a receber viagens.': [
    'Ita-nia asinatura remata ona. Karega loron atu simu fila-fali viajen.',
    'Your subscription has run out. Top up days to receive rides again.',
  ],
  'Indica a matrícula do veículo.': ['Hakerek veíkulu nia matríkula.', 'Give the vehicle’s plate.'],
  'Indica quantos passageiros o carro leva.': [
    'Hakerek kareta bele lori pasajeiru na’in hira.',
    'Say how many passengers the car carries.',
  ],
  'Só para veículos Pickup.': ['Ba de’it veíkulu Pickup.', 'Only for Pickup vehicles.'],
  'Versão dos termos em falta.': ['Falta versaun termu nian.', 'Terms version missing.'],

  // ── Lugares e cotação
  'Tipo desconhecido.': ['Tipu deskoñesidu.', 'Unknown type.'],
  'Nome inválido.': ['Naran inválidu.', 'Invalid name.'],
  'Faltam as coordenadas.': ['Falta koordenada.', 'Coordinates missing.'],
  // Baptizar um sítio no painel (30/09/2026). Tétum revisto pelo Simão no mesmo dia.
  'O nome tem de ter entre 2 e 120 letras.': [
    'Naran tenke iha letra 2 to’o 120.',
    'The name must be 2 to 120 characters long.',
  ],
  'Lugar inválido.': ['Fatin inválidu.', 'Invalid place.'],
  'Lugar não encontrado.': ['La hetan fatin ruma.', 'Place not found.'],
  'Faltam as coordenadas de origem ou destino.': [
    'Falta koordenada rekolla nian ka destinu nian.',
    'Pick-up or destination coordinates missing.',
  ],
  'Faltam coordenadas.': ['Falta koordenada.', 'Coordinates missing.'],

  // ── Viagens
  'Indica o destino.': ['Hakerek destinu.', 'Give the destination.'],
  'O Pickup está temporariamente indisponível.': [
    'Pickup la disponível hela ba tempu badak ida ne’e.',
    'The Pickup is temporarily unavailable.',
  ],
  // Para os serviços que não têm frase própria (20/09/2026).
  // As portas da encomenda (jastip.js, 21/09/2026). Estavam em português para
  // toda a gente: saíam de uma função que devolvia a frase, e o verificador
  // não vê frases que não estejam dentro de `erro(...)` ou de um `error:`.
  'Escreve o que queres que o motorista compre.': [
    "Hakerek buat ne'ebé ita hakarak atu motorista bele sosa.",
    'Write what you want the driver to buy.',
  ],
  'Uma encomenda leva até {0} artigos.': [
    "Enkomenda ida bele iha sasán to'o {0}.",
    'An order takes up to {0} items.',
  ],
  'Há um artigo sem nome na lista.': [
    'Iha sasán ida ne’ebé nia naran iha lista laiha.',
    'There is an item with no name on the list.',
  ],
  'O nome de um artigo é demasiado longo.': [
    'Sasán ida nia naran naruk liu.',
    'An item name is too long.',
  ],
  'A quantidade de cada artigo vai de 1 a 99.': [
    "Sasán ida-idak nia kuantidade husi 1 to'o 99.",
    'Each item quantity goes from 1 to 99.',
  ],
  'Escreve em que loja se compra.': [
    "Hakerek loja ne'ebé atu ba sosa.",
    'Write which shop to buy from.',
  ],
  'O nome da loja é demasiado longo.': ['Loja nia naran naruk liu.', 'The shop name is too long.'],
  'Confirma o teu email no perfil antes de encomendar.': [
    'Konfirma ita-nia email iha perfil molok halo enkomenda.',
    'Confirm your email in your profile before ordering.',
  ],
  'Indica até quanto se pode gastar.': [
    "Hatete to'o osan hira mak bele gasta.",
    'Say how much can be spent.',
  ],
  'O máximo que se pode adiantar é {0}.': [
    "Osan máximu ne'ebé bele avansa mak {0}.",
    'The most that can be advanced is {0}.',
  ],
  'Esta encomenda pede {0} viagens concluídas na tua conta. Já tens {1}.': [
    "Enkomenda ne'e presiza viajen {0} remata ona iha ita-nia konta. Ita iha ona {1}.",
    'This order needs {0} completed trips on your account. You have {1}.',
  ],
  'Encomenda não encontrada.': ['Enkomenda ne’e laiha.', 'Order not found.'],
  'Já tens uma encomenda a decorrer.': [
    "Ita iha ona enkomenda ida ne’ebé daudaun ne’e la'o hela.",
    'You already have an order in progress.',
  ],
  'Este serviço está temporariamente indisponível.': [
    "Servisu ne'e la disponível hela ba tempu badak ida ne’e.",
    'This service is temporarily unavailable.',
  ],
  'Serviço desconhecido.': ['Servisu ne’e deskoñese.', 'Unknown service.'],
  'Este serviço ainda está em construção.': [
    "Servisu ne'e sei iha hela konstrusaun.",
    'This service is still being built.',
  ],
  'Indica o que vais transportar.': [
    'Hakerek saida mak ita atu tula.',
    'Say what you are going to carry.',
  ],
  'Confirma que os bens são legais, seguros e cabem no veículo.': [
    'Konfirma katak sasán sira ne’e legál, seguru no tama iha veíkulu.',
    'Confirm that the goods are lawful, safe and fit in the vehicle.',
  ],
  'Indica o telemóvel de quem vai viajar — o motorista precisa de lhe ligar.': [
    'Hakerek ema ne’ebé sei halo viajen ne’e nia telemóvel — motorista presiza telefone ba nia.',
    'Give the traveller’s mobile number — the driver needs to call them.',
  ],
  'Para uma pessoa menor de idade, é preciso declarar a autorização dos pais.': [
    'Ba ema minoridade, tenke deklara inan-aman nia autorizasaun.',
    'For a minor, you must declare the parents’ authorisation.',
  ],
  'Indica o nome de quem vai viajar.': [
    'Hakerek ema ne’ebé sei halo viajen ne’e nia naran.',
    'Give the name of the person travelling.',
  ],
  'Não há serviço nesse sítio.': [
    'La iha servisu iha fatin ida-ne’e.',
    'There is no service at that place.',
  ],
  'Já tens uma viagem a decorrer.': [
    'Ita iha ona viajen ida ne’ebé daudaun la’o hela.',
    'You already have a ride in progress.',
  ],
  'Faltam o tipo de veículo ou a recolha.': [
    'Falta tipu veíkulu ka fatin rekolla.',
    'Vehicle type or pick-up missing.',
  ],
  'Etapa desconhecida.': ['Etapa deskoñesidu.', 'Unknown stage.'],
  'Esta etapa não se pode marcar agora.': [
    'Etapa ida-ne’e labele marka agora.',
    'This stage cannot be marked now.',
  ],
  'Tarifa inválida.': ['Tarifa la válidu.', 'Invalid fare.'],
  'Estás indisponível. Liga-te para aceitar pedidos.': [
    'Ita la disponível hela. Liga atu aseita pedidu.',
    'You are unavailable. Go available to accept requests.',
  ],
  'Esta viagem é para {0} pessoas e o teu carro leva {1}.': [
    'Viajen ida-ne’e ba ema na’in {0} no ita-nia kareta tula ema na’in {1}.',
    'This ride is for {0} people and your car carries {1}.',
  ],
  'Esta carga é maior do que a capacidade do teu veículo.': [
    'Karga ida-ne’e boot liu ita-nia veíkulu nia kapasidade.',
    'This load is larger than your vehicle’s capacity.',
  ],
  'Já tens uma viagem a decorrer. Termina-a antes de aceitar outra.': [
    'Ita iha ona viajen ida ne’ebé daudaun ne’e la’o hela. Termina tiha lai antes aseita fali seluk.',
    'You already have a ride in progress. Finish it before accepting another.',
  ],
  'Esta viagem já não está disponível.': [
    'Viajen ida-ne’e la disponível tiha ona.',
    'This ride is no longer available.',
  ],
  'Não é possível mudar o estado desta viagem.': [
    'La possível ona atu muda viajen ida-ne’e nia estadu.',
    'The status of this ride cannot be changed.',
  ],
  'O código tem quatro algarismos.': ['Kódigu iha númeru haat.', 'The code has four digits.'],
  'Esta viagem já começou ou terminou.': [
    'Viajen ida-ne’e hahú tiha ona ka remata tiha ona.',
    'This ride has already started or ended.',
  ],
  'Código errado. Pergunta outra vez ao passageiro.': [
    'Kódigu sala. Husu fila-fali ba pasajeiru.',
    'Wrong code. Ask the passenger again.',
  ],
  'O preço desta viagem foi calculado pela distância e não se altera.': [
    'Viajen ida-ne’e nia presu kalkula tuir distánsia no labele muda.',
    'The price of this ride was calculated from the distance and does not change.',
  ],
  'Mensagem vazia.': ['Mensajen mamuk hela.', 'Empty message.'],
  'A viagem ainda não foi aceite.': [
    'Viajen seidauk hetan aseitasaun.',
    'The ride has not been accepted yet.',
  ],
  'Avaliação inválida.': ['Avaliasaun inválida.', 'Invalid rating.'],
  'Só podes avaliar uma viagem concluída.': [
    'Ita bele avalia de’it viajen ne’ebé remata tiha ona.',
    'You can only rate a completed ride.',
  ],
  'Já avaliaste esta viagem.': [
    'Ita avalia tiha ona viajen ida-ne’e.',
    'You have already rated this ride.',
  ],
  'Esta viagem já terminou.': ['Viajen ida-ne’e remata tiha ona.', 'This ride has already ended.'],
  'Sem motorista.': ['La iha motorista ruma.', 'No driver.'],
  'A viagem já terminou.': ['Viajen remata tiha ona.', 'The ride has already ended.'],

  // ── Servidor
  'Rota não encontrada.': ['La hetan rota ruma.', 'Route not found.'],
  'Erro no servidor. Tenta de novo.': [
    'Erru iha servidór. Koko fila-fali.',
    'Server error. Try again.',
  ],
};

// AS NOTIFICAÇÕES, que saem sem pedido nenhum à frente: vão na língua que a
// pessoa usou da última vez (users.lingua, guardada em requireAuth).
export const NOTIFICACOES = {
  pedidoNovoTitulo: {
    pt: 'Novo pedido de viagem',
    tet: 'Pedidu ba viajen foun',
    en: 'New ride request',
  },
  compradoTitulo: { pt: 'Compra feita', tet: 'Sosa tiha ona', en: 'Purchase made' },
  compradoTexto: {
    pt: 'O motorista gastou {valor} e vai a caminho. Paga em mão a viagem e as compras.',
    tet: 'Motorista gasta {valor} no iha dalan. Selu ho liman ba viajen ho sasán kompras sira.',
    en: 'The driver spent {valor} and is on the way. Pay the trip and the shopping in cash.',
  },
  etapaCarregadaTitulo: { pt: 'Carga carregada', tet: 'Karga tula tiha ona', en: 'Load on board' },
  etapaCarregadaTexto: {
    pt: 'O motorista já carregou e vai a caminho do destino.',
    tet: 'Motorista tula tiha ona no iha hela dalan ba destinu.',
    en: 'The driver has loaded up and is on the way to the destination.',
  },
  etapaDestinoTitulo: {
    pt: 'Chegou ao destino',
    tet: 'To’o ona destinu',
    en: 'Arrived at the destination',
  },
  etapaDestinoTexto: {
    pt: 'O motorista chegou ao destino da entrega.',
    tet: 'Motorista to’o tiha ona ba destinu atu entrega karga.',
    en: 'The driver has reached the delivery destination.',
  },
  etapaDescarregadaTitulo: { pt: 'Descarga feita', tet: 'Karga hatun tiha ona', en: 'Unloaded' },
  etapaDescarregadaTexto: {
    pt: 'A carga foi descarregada. Falta concluir a entrega.',
    tet: 'Karga hatun tiha ona. Falta hela atu entrega.',
    en: 'The load has been unloaded. The delivery still needs to be completed.',
  },
  // O PEDIDO CADUCOU (22/09/2026).
  //
  // Até hoje o fim de um pedido só chegava pelo socket, e o socket só existe
  // enquanto a app está aberta. Quem pedia e guardava o telemóvel no bolso
  // ficava a achar que ainda estava à procura — e voltava ao ecrã cinco,
  // dez, vinte minutos depois para descobrir que ninguém tinha vindo.
  //
  // O texto diz o que fazer a seguir, e não só o que aconteceu: "ninguém
  // aceitou" deixa a pessoa parada, "tente outra vez" põe-na a andar.
  pedidoCaducouTitulo: {
    pt: 'Ninguém aceitou o seu pedido',
    tet: 'La iha ema ruma mak simu ita-nia pedidu',
    en: 'No driver took your request',
  },
  pedidoCaducouTexto: {
    pt: 'Passaram {minutos} minutos sem motorista. Pode pedir outra vez.',
    tet: 'Liu minutu {minutos} la iha motorista. Bele husu fila-fali.',
    en: 'After {minutos} minutes there was no driver. You can request again.',
  },
  motoristaDisponivelTitulo: {
    pt: 'Há um motorista disponível',
    tet: 'Iha motorista ida ne’ebé disponível',
    en: 'A driver is available',
  },
  motoristaDisponivelTexto: {
    pt: 'Já há {veiculo} perto de si. Abra a app para pedir.',
    tet: 'Iha ona {veiculo} besik ita. Loke app atu husu.',
    en: 'There is {veiculo} near you. Open the app to request.',
  },
  veiculoMotorbike: { pt: 'Motorizada', tet: 'Motorizada', en: 'a motorbike' },
  veiculoCar: { pt: 'Carro', tet: 'Kareta', en: 'a car' },
  veiculoCarry: { pt: 'Carro Pickup', tet: 'Kareta Pickup', en: 'a pickup' },
  veiculoQualquer: { pt: 'um motorista', tet: 'motorista ida', en: 'a driver' },
  aceiteTitulo: { pt: 'Motorista a caminho', tet: 'Motorista iha dalan', en: 'Driver on the way' },
  aceiteTexto: {
    pt: '{nome} vai buscar-te{preco}',
    tet: '{nome} mai foti ita{preco}',
    en: '{nome} is coming to pick you up{preco}',
  },
  sosTitulo: { pt: '🚨 PEDIDO DE AJUDA', tet: '🚨 PEDIDU ATU HUSU AJUDA', en: '🚨 CALL FOR HELP' },
  sosTexto: {
    pt: '{nome} carregou no SOS · {onde}',
    tet: '{nome} uza SOS · {onde}',
    en: '{nome} pressed SOS · {onde}',
  },
  sosAlguem: { pt: 'Alguém', tet: 'Ema ida', en: 'Someone' },
  ocorrenciaTitulo: {
    pt: 'Ocorrência grave reportada',
    tet: 'Okorrénsia grave ida relata tiha ona',
    en: 'Serious incident reported',
  },
  ocorrenciaTexto: {
    pt: 'Viagem #{viagem} · {tipo}',
    tet: 'Viajen #{viagem} · {tipo}',
    en: 'Trip #{viagem} · {tipo}',
  },
  ocor_conducaoPerigosa: {
    pt: 'condução perigosa',
    tet: 'kondusaun perigoza',
    en: 'dangerous driving',
  },
  ocor_assedio: { pt: 'assédio', tet: 'asédiu', en: 'harassment' },
  ocor_ameaca: { pt: 'ameaça', tet: 'ameasa', en: 'threat' },
  sosSemPosicao: { pt: 'sem posição', tet: 'la iha pozisaun', en: 'no position' },
  prontoTitulo: {
    pt: 'Motorista à espera de aprovação',
    tet: 'Motorista hein hela aprovasaun',
    en: 'Driver awaiting approval',
  },
  prontoTexto: {
    pt: '{nome} enviou os documentos{telefone}',
    tet: '{nome} haruka ona dokumentu sira{telefone}',
    en: '{nome} has sent the documents{telefone}',
  },
  umMotorista: { pt: 'Um motorista', tet: 'Motorista ida', en: 'A driver' },
  pagamentoTitulo: {
    pt: 'Pagamento por confirmar',
    tet: 'Pagamentu hein hela konfirmasaun',
    en: 'Payment to confirm',
  },
  pagamentoTexto: {
    pt: '{nome} · {dias} dias · ${valor} · {referencia}',
    tet: '{nome} · loron {dias} · ${valor} · {referencia}',
    en: '{nome} · {dias} days · ${valor} · {referencia}',
  },
  pagamentoConfirmadoTitulo: {
    pt: 'Dias carregados',
    tet: 'Loron karega ona',
    en: 'Days topped up',
  },
  pagamentoConfirmadoTexto: {
    pt: '{dias} dias entraram na sua conta.',
    tet: 'Loron {dias} tama ona iha ita-nia konta.',
    en: '{dias} days have been added to your account.',
  },
  pagamentoRecusadoTitulo: {
    pt: 'Pagamento não confirmado',
    tet: 'Pagamentu la hetan konfirmasaun',
    en: 'Payment not confirmed',
  },
  pagamentoRecusadoTexto: {
    pt: 'Motivo: {motivo}',
    tet: 'Motivu: {motivo}',
    en: 'Reason: {motivo}',
  },

  // ── O REGISTO DO MOTORISTA, passo a passo (04/10/2026) ──────────────
  // Cada decisão chega ao motorista por notificação e, se o email estiver
  // confirmado, por email (ver avisosRegisto.js). O texto diz o que fazer a
  // seguir, não só o que aconteceu.
  registoRecebidoTitulo: {
    pt: 'Registo recebido',
    tet: 'Ami simu ona ita-nia rejistu',
    en: 'Registration received',
  },
  registoRecebidoTexto: {
    pt: 'Recebemos os seus documentos. Vamos verificá-los e avisamos quando houver decisão.',
    tet: 'Ami simu ona ita-nia dokumentu sira. Ami sei verifika no fó hatene bainhira iha desizaun.',
    en: 'We have received your documents. We will check them and let you know when there is a decision.',
  },
  registoAprovadoTitulo: {
    pt: 'Conta de motorista aprovada',
    tet: 'Konta motorista aprova ona',
    en: 'Driver account approved',
  },
  registoAprovadoTexto: {
    pt: 'Já pode ficar disponível e receber viagens.',
    tet: 'Ita bele ona sai disponível no simu viajen.',
    en: 'You can now go online and receive trips.',
  },
  registoReativadoTitulo: {
    pt: 'Conta reativada',
    tet: 'Konta ativa fali ona',
    en: 'Account reactivated',
  },
  registoReativadoTexto: {
    pt: 'A sua conta de motorista voltou a estar ativa.',
    tet: 'Ita-nia konta motorista ativa fali ona.',
    en: 'Your driver account is active again.',
  },
  registoRecusadoTitulo: {
    pt: 'Registo não aprovado',
    tet: 'Rejistu la aprova',
    en: 'Registration not approved',
  },
  registoRecusadoTexto: {
    pt: 'Motivo: {motivo}. Pode corrigir os documentos na app e voltar a enviar.',
    tet: 'Motivu: {motivo}. Ita bele hadi’a dokumentu sira iha app no haruka fali.',
    en: 'Reason: {motivo}. You can fix the documents in the app and send them again.',
  },
  registoSuspensoTitulo: { pt: 'Conta suspensa', tet: 'Konta suspende', en: 'Account suspended' },
  registoSuspensoTexto: {
    pt: 'Motivo: {motivo}',
    tet: 'Motivu: {motivo}',
    en: 'Reason: {motivo}',
  },
  correcaoTitulo: {
    pt: 'Corrija um documento',
    tet: 'Hadi’a dokumentu ida',
    en: 'Correct a document',
  },
  correcaoTexto: {
    pt: '{documento}: {motivo}. Envie-o outra vez na app.',
    tet: '{documento}: {motivo}. Haruka fali iha app.',
    en: '{documento}: {motivo}. Send it again in the app.',
  },
  validadeTitulo: {
    pt: 'Documento a caducar',
    tet: 'Dokumentu besik remata',
    en: 'Document expiring',
  },
  validadeFaltamTexto: {
    pt: '{documento}: caduca a {data} — faltam {dias} dias. Envie o renovado na app para não parar.',
    tet: '{documento}: remata iha {data} — falta loron {dias}. Haruka ida foun iha app atu la para.',
    en: '{documento}: expires on {data} — {dias} days left. Send the renewed one in the app so you don’t have to stop.',
  },
  validadeAmanhaTexto: {
    pt: '{documento}: caduca amanhã ({data}). Envie o renovado na app.',
    tet: '{documento}: remata aban ({data}). Haruka ida foun iha app.',
    en: '{documento}: expires tomorrow ({data}). Send the renewed one in the app.',
  },
  validadeHojeTexto: {
    pt: '{documento}: caduca hoje ({data}). Amanhã já não pode ficar disponível sem o renovado.',
    tet: '{documento}: remata ohin ({data}). Aban ita la bele ona sai disponível se la iha ida foun.',
    en: '{documento}: expires today ({data}). From tomorrow you cannot go online without the renewed one.',
  },
  validadeCaducouTitulo: {
    pt: 'Documento caducado',
    tet: 'Dokumentu remata ona',
    en: 'Document expired',
  },
  validadeCaducouTexto: {
    pt: '{documento}: caducou a {data}. Não pode ficar disponível até enviar o renovado.',
    tet: '{documento}: remata ona iha {data}. Ita la bele sai disponível to’o haruka ida foun.',
    en: '{documento}: expired on {data}. You cannot go online until you send the renewed one.',
  },
  doc_photo: { pt: 'Fotografia sua', tet: 'Ita-nia fotografia', en: 'Photo of you' },
  doc_identity: {
    pt: 'Documento de identificação',
    tet: 'Dokumentu identifikasaun',
    en: 'Identity document',
  },
  doc_licence: {
    pt: 'Carta de condução (frente)',
    tet: 'Karta kondusaun (oin)',
    en: 'Driving licence (front)',
  },
  doc_cartaverso: {
    pt: 'Carta de condução (verso)',
    tet: 'Karta kondusaun (kotuk)',
    en: 'Driving licence (back)',
  },
  doc_vehicle: {
    pt: 'Cartão de registo do veículo',
    tet: 'Kartaun Rejistu Veíkulu',
    en: 'Vehicle registration card',
  },
  doc_inspection: { pt: 'Cartão de inspeção', tet: 'Kartaun Inspesaun', en: 'Inspection card' },
  doc_veiculofrente: {
    pt: 'Veículo, frente',
    tet: 'Veíkulu, oin',
    en: 'Vehicle, front',
  },
  doc_veiculotras: { pt: 'Veículo, traseira', tet: 'Veíkulu, kotuk', en: 'Vehicle, rear' },
  doc_veiculoesquerda: {
    pt: 'Veículo, lado esquerdo',
    tet: 'Veíkulu, sorin karuk',
    en: 'Vehicle, left side',
  },
  doc_veiculodireita: {
    pt: 'Veículo, lado direito',
    tet: 'Veíkulu, sorin loos',
    en: 'Vehicle, right side',
  },
  doc_fotoveiculo: {
    pt: 'Fotografia do veículo',
    tet: 'Fotografia veíkulu nian',
    en: 'Vehicle photo',
  },
  emailOla: { pt: 'Olá {nome},', tet: 'Olá {nome},', en: 'Hello {nome},' },
  emailRodape: {
    pt: 'Veja os detalhes na app TimorgianaRide, no seu registo de motorista.',
    tet: 'Haree detallu iha app TimorgianaRide, iha ita-nia rejistu motorista.',
    en: 'See the details in the TimorgianaRide app, in your driver registration.',
  },
};

// ── Tradução ───────────────────────────────────────────────────────────

const INDICE = { tet: 0, en: 1 };

// As mensagens com partes variáveis viram expressões: "Máximo de {0}
// fotografias." encontra "Máximo de 3 fotografias." e devolve o 3 no sítio
// certo da tradução, que pode tê-lo noutra posição da frase.
const PADROES = Object.keys(MENSAGENS)
  .filter((k) => /\{\d\}/.test(k))
  .map((k) => ({
    chave: k,
    re: new RegExp(
      '^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\d\\\}/g, '(.+?)') + '$'
    ),
  }));

export function traduzir(texto, lingua) {
  const i = INDICE[lingua];
  if (typeof texto !== 'string' || i === undefined) return texto;
  const directo = MENSAGENS[texto];
  if (directo) return directo[i];
  for (const p of PADROES) {
    const m = texto.match(p.re);
    if (m) return MENSAGENS[p.chave][i].replace(/\{(\d)\}/g, (_, n) => m[Number(n) + 1]);
  }
  return texto;
}

// A língua de um pedido: a que a app diz agora; se não disser, a última que
// esta conta usou; senão, português.
export function linguaDe(req) {
  const h = String(req?.headers?.['x-lingua'] || '').toLowerCase();
  if (LINGUAS.includes(h)) return h;
  return LINGUAS.includes(req?.user?.lingua) ? req.user.lingua : 'pt';
}

export function notificacao(chave, lingua, vars = {}) {
  const e = NOTIFICACOES[chave];
  let s = e?.[LINGUAS.includes(lingua) ? lingua : 'pt'] ?? e?.pt ?? '';
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
