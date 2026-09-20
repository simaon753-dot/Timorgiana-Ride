// AS MENSAGENS DO SERVIDOR NAS TRÊS LÍNGUAS (15/09/26).
//
// Até aqui o servidor respondia sempre em português: "Os carregamentos abrem
// a 1 de Abril de 2027" chegava assim a um motorista com a app em tétum. A app
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
  'Número de dias inválido.': ['Númeru loron la válidu.', 'Invalid number of days.'],
  'Escreva as instruções (conta, titular ou morada) antes de ligar esta forma.': [
    'Hakerek instrusaun (konta, na’in ka enderesu) antes liga forma ida-ne’e.',
    'Write the instructions (account, holder or address) before switching this method on.',
  ],
  'Só uma conta de motorista pode carregar dias.': [
    'Konta motorista de’it mak bele karega loron.',
    'Only a driver account can top up days.',
  ],
  'Os carregamentos abrem a 1 de Abril de 2027.': [
    'Karegamentu loke iha 1 Abríl 2027.',
    'Top-ups open on 1 April 2027.',
  ],
  'Pacote inválido.': ['Pakote la válidu.', 'Invalid package.'],
  'Forma de pagamento inválida.': ['Forma pagamentu la válidu.', 'Invalid payment method.'],
  'Esta forma de pagamento não está disponível.': [
    'Forma pagamentu ida-ne’e la disponível.',
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
    'Ita iha ona pedidu ida hein hela konfirmasaun.',
    'You already have a request awaiting confirmation.',
  ],
  'Este pedido já não está à espera.': [
    'Pedidu ida-ne’e la hein ona.',
    'This request is no longer pending.',
  ],
  'Pedido não encontrado.': ['La hetan pedidu.', 'Request not found.'],
  'Este pedido já foi decidido.': [
    'Pedidu ida-ne’e desidi tiha ona.',
    'This request has already been decided.',
  ],
  'Indique o motivo: o motorista precisa de saber o que corrigir.': [
    'Hakerek motivu: motorista presiza hatene saida mak atu hadi’a.',
    'Give the reason: the driver needs to know what to correct.',
  ],
  'Motivo de devolução inválido.': ['Motivu devolusaun la válidu.', 'Invalid refund reason.'],
  'Esta conta não tem dias por usar.': [
    'Konta ne’e la iha loron ne’ebé seidauk uza.',
    'This account has no unused days.',
  ],
  'Carregue a imagem do QR antes de ligar esta forma.': [
    'Karega QR nia imajen uluk antes liga forma ida-ne’e.',
    'Upload the QR image before switching this method on.',
  ],
  'Desligue o pagamento por QR antes de retirar a imagem.': [
    'Dezliga pagamentu ho QR uluk antes hamoos imajen.',
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
  'Token inválido ou expirado.': ['Token la válidu ka kaduka ona.', 'Invalid or expired token.'],
  'Utilizador não encontrado.': ['La hetan utilizadór.', 'User not found.'],
  'Serviço indisponível. Tenta de novo.': [
    'Servisu la disponível. Koko fila-fali.',
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
  'Falha na autenticação.': ['Autentikasaun falla.', 'Authentication failed.'],
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
  'Tipo de documento inválido.': ['Tipu dokumentu la válidu.', 'Invalid document type.'],
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
  'Motivo desconhecido.': ['Motivu la koñesidu.', 'Unknown reason.'],
  'O teu documento ({0}) caducou em {1}.': [
    'Ita-nia dokumentu ({0}) kaduka ona iha {1}.',
    'Your document ({0}) expired on {1}.',
  ],
  'Falta a data de validade do teu documento ({0}).': [
    'Falta data validade ba ita-nia dokumentu ({0}).',
    'The expiry date of your document ({0}) is missing.',
  ],
  'Faltam documentos na tua conta.': [
    'Falta dokumentu iha ita-nia konta.',
    'Documents are missing from your account.',
  ],

  // ── Recuperar o acesso
  'Número ou código errado.': ['Númeru ka kódigu sala.', 'Wrong number or code.'],
  'A palavra-passe tem de ter pelo menos 6 caracteres.': [
    'Seña tenke iha pelumenus karákter 6.',
    'The password must have at least 6 characters.',
  ],
  'Demasiadas tentativas. Peça um código novo.': [
    'Koko barak liu ona. Husu kódigu foun.',
    'Too many attempts. Ask for a new code.',
  ],

  // ── Painel de administração
  'Documento não encontrado.': ['La hetan dokumentu.', 'Document not found.'],
  'Decisão inválida.': ['Desizaun la válidu.', 'Invalid decision.'],
  'Indica o motivo da decisão.': [
    'Hakerek motivu desizaun nian.',
    'Give the reason for the decision.',
  ],
  'Motorista não encontrado.': ['La hetan motorista.', 'Driver not found.'],
  'Alerta não encontrado.': ['La hetan alerta.', 'Alert not found.'],
  'Fotografia não encontrada.': ['La hetan fotografia.', 'Photo not found.'],
  'Conta não encontrada.': ['La hetan konta.', 'Account not found.'],
  'Viagem não encontrada.': ['La hetan viajen.', 'Ride not found.'],
  'Motorista inválido.': ['Motorista la válidu.', 'Invalid driver.'],
  'Forma de pagamento desconhecida.': ['Forma pagamentu la koñesidu.', 'Unknown payment method.'],
  'Sem comprovativo.': ['La iha komprovativu.', 'No proof of payment.'],
  'Conta inválida.': ['Konta la válidu.', 'Invalid account.'],
  'Documento inválido.': ['Dokumentu la válidu.', 'Invalid document.'],
  'Estado inválido.': ['Estadu la válidu.', 'Invalid status.'],
  'Indica a data no formato AAAA-MM-DD.': [
    'Hakerek data ho formatu AAAA-MM-DD.',
    'Give the date in the format YYYY-MM-DD.',
  ],
  'Não há viagens terminadas até essa data.': [
    'La iha viajen ne’ebé remata ona to’o data ne’e.',
    'There are no finished rides up to that date.',
  ],
  'Confirmação em falta.': ['Falta konfirmasaun.', 'Confirmation missing.'],
  'Falta o nome.': ['Falta naran.', 'The name is missing.'],
  'Faltam coordenadas do sítio ou da paragem.': [
    'Falta koordenada fatin nian ka paragem nian.',
    'Coordinates of the place or stop are missing.',
  ],
  'Essas coordenadas não são de Timor-Leste.': [
    'Koordenada hirak-ne’e la’ós Timor-Leste nian.',
    'Those coordinates are not in Timor-Leste.',
  ],
  'Paragem não encontrada.': ['La hetan paragem.', 'Stop not found.'],

  // ── Registo e entrada
  'Nome é obrigatório.': ['Naran obrigatóriu.', 'Name is required.'],
  'Número de telemóvel inválido.': ['Númeru telemóvel la válidu.', 'Invalid mobile number.'],
  'A palavra-passe deve ter pelo menos 6 caracteres.': [
    'Seña tenke iha pelumenus karákter 6.',
    'The password must be at least 6 characters.',
  ],
  'Escreve um email válido — serve para recuperares a conta.': [
    'Hakerek email ida ne’ebé válidu — ne’e atu rekupera fila-fali ita-nia konta.',
    'Enter a valid email — it is how you recover your account.',
  ],
  'Tipo de conta inválido.': ['Tipu konta la válidu.', 'Invalid account type.'],
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
  'Erro ao criar a conta.': ['Sala bainhira kria konta.', 'Error creating the account.'],
  'Telemóvel e palavra-passe são obrigatórios.': [
    'Telemóvel no seña obrigatóriu.',
    'Mobile number and password are required.',
  ],
  'Telemóvel ou palavra-passe incorretos.': [
    'Telemóvel ka seña la loos.',
    'Incorrect mobile number or password.',
  ],
  'Erro ao iniciar sessão.': ['Sala bainhira tama.', 'Error signing in.'],
  'Erro ao guardar.': ['Sala bainhira rai.', 'Error saving.'],
  'Nada para aceitar.': ['La iha buat ida atu aseita.', 'Nothing to accept.'],
  'Não foi possível guardar.': ['La konsege rai.', 'Could not save.'],
  'Código inválido ou expirado. Peça outro.': [
    'Kódigu la válidu ka kaduka ona. Husu seluk.',
    'Invalid or expired code. Ask for another.',
  ],
  'Não foi possível confirmar.': ['La konsege konfirma.', 'Could not confirm.'],
  'Não foi possível enviar.': ['La konsege haruka.', 'Could not send.'],
  'Escreve um email válido.': ['Hakerek email ida ne’ebé válidu.', 'Enter a valid email.'],

  // ── Motorista
  'Valor inválido.': ['Valor la válidu.', 'Invalid value.'],
  'A tua conta ainda não foi aprovada.': [
    'Ita-nia konta seidauk hetan aprovasaun.',
    'Your account has not been approved yet.',
  ],
  'Os termos para motoristas mudaram. Lê-os e aceita-os para ficares disponível.': [
    'Termu ba motorista muda ona. Lee no aseita atu bele sai disponível.',
    'The driver terms have changed. Read and accept them to go available.',
  ],
  'Tira uma fotografia para começar o dia.': [
    'Hasai fotografia ida atu hahú loron.',
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
  'Só para veículos Pickup.': ['De’it ba veíkulu Pickup.', 'Only for Pickup vehicles.'],
  'Versão dos termos em falta.': ['Falta versaun termu nian.', 'Terms version missing.'],

  // ── Lugares e cotação
  'Tipo desconhecido.': ['Tipu la koñesidu.', 'Unknown type.'],
  'Nome inválido.': ['Naran la válidu.', 'Invalid name.'],
  'Faltam as coordenadas.': ['Falta koordenada.', 'Coordinates missing.'],
  'Faltam as coordenadas de origem ou destino.': [
    'Falta koordenada rekolla nian ka destinu nian.',
    'Pick-up or destination coordinates missing.',
  ],
  'Faltam coordenadas.': ['Falta koordenada.', 'Coordinates missing.'],
  'sem rota': ['la iha rota', 'no route'],

  // ── Viagens
  'Indica o destino.': ['Hakerek destinu.', 'Give the destination.'],
  'O Pickup está temporariamente indisponível.': [
    'Pickup la disponível ba tempu badak.',
    'The Pickup is temporarily unavailable.',
  ],
  // Para os serviços que não têm frase própria (20/09/2026).
  'Este serviço está temporariamente indisponível.': [
    'Servisu ne\'e la disponível ba tempu badak.',
    'This service is temporarily unavailable.',
  ],
  'Serviço desconhecido.': ['Servisu la rekoñese.', 'Unknown service.'],
  'Este serviço ainda está em construção.': [
    'Servisu ne\'e sei iha konstrusaun.',
    'This service is still being built.',
  ],
  'Indica o que vais transportar.': [
    'Hakerek saida mak ita atu tula.',
    'Say what you are going to carry.',
  ],
  'Confirma que os bens são legais, seguros e cabem no veículo.': [
    'Konfirma katak sasán sira legál, seguru no tama iha veíkulu.',
    'Confirm that the goods are lawful, safe and fit in the vehicle.',
  ],
  'Indica o telemóvel de quem vai viajar — o motorista precisa de lhe ligar.': [
    'Hakerek ema ne’ebé sei viaja nia telemóvel — motorista presiza telefone ba nia.',
    'Give the traveller’s mobile number — the driver needs to call them.',
  ],
  'Para uma pessoa menor de idade, é preciso declarar a autorização dos pais.': [
    'Ba ema menór idade, tenke deklara inan-aman nia autorizasaun.',
    'For a minor, you must declare the parents’ authorisation.',
  ],
  'Indica o nome de quem vai viajar.': [
    'Hakerek ema ne’ebé sei viaja nia naran.',
    'Give the name of the person travelling.',
  ],
  'Não há serviço nesse sítio.': [
    'La iha servisu iha fatin ne’e.',
    'There is no service at that place.',
  ],
  'Já tens uma viagem a decorrer.': [
    'Ita iha ona viajen ida la’o hela.',
    'You already have a ride in progress.',
  ],
  'Faltam o tipo de veículo ou a recolha.': [
    'Falta tipu veíkulu ka fatin rekolla.',
    'Vehicle type or pick-up missing.',
  ],
  'Etapa desconhecida.': ['Etapa la koñesidu.', 'Unknown stage.'],
  'Esta etapa não se pode marcar agora.': [
    'Etapa ida-ne’e labele marka agora.',
    'This stage cannot be marked now.',
  ],
  'Tarifa inválida.': ['Tarifa la válidu.', 'Invalid fare.'],
  'Estás indisponível. Liga-te para aceitar pedidos.': [
    'Ita la disponível. Liga atu aseita pedidu.',
    'You are unavailable. Go available to accept requests.',
  ],
  'Esta viagem é para {0} pessoas e o teu carro leva {1}.': [
    'Viajen ida-ne’e ba ema na’in {0} no ita-nia kareta lori na’in {1}.',
    'This ride is for {0} people and your car carries {1}.',
  ],
  'Esta carga é maior do que a capacidade do teu veículo.': [
    'Karga ida-ne’e boot liu ita-nia veíkulu nia kapasidade.',
    'This load is larger than your vehicle’s capacity.',
  ],
  'Já tens uma viagem a decorrer. Termina-a antes de aceitar outra.': [
    'Ita iha ona viajen ida la’o hela. Remata uluk antes aseita seluk.',
    'You already have a ride in progress. Finish it before accepting another.',
  ],
  'Esta viagem já não está disponível.': [
    'Viajen ida-ne’e la disponível ona.',
    'This ride is no longer available.',
  ],
  'Não é possível mudar o estado desta viagem.': [
    'Labele muda viajen ida-ne’e nia estadu.',
    'The status of this ride cannot be changed.',
  ],
  'O código tem quatro algarismos.': ['Kódigu iha númeru haat.', 'The code has four digits.'],
  'Esta viagem já começou ou terminou.': [
    'Viajen ida-ne’e hahú ona ka remata ona.',
    'This ride has already started or ended.',
  ],
  'Código errado. Pergunta outra vez ao passageiro.': [
    'Kódigu sala. Husu fila-fali ba pasajeiru.',
    'Wrong code. Ask the passenger again.',
  ],
  'O preço desta viagem foi calculado pela distância e não se altera.': [
    'Viajen ida-ne’e nia presu kalkula tuir distánsia no la muda.',
    'The price of this ride was calculated from the distance and does not change.',
  ],
  'Mensagem vazia.': ['Mensajen mamuk.', 'Empty message.'],
  'A viagem ainda não foi aceite.': [
    'Viajen seidauk hetan aseitasaun.',
    'The ride has not been accepted yet.',
  ],
  'Avaliação inválida.': ['Avaliasaun la válidu.', 'Invalid rating.'],
  'Só podes avaliar uma viagem concluída.': [
    'Ita bele avalia de’it viajen ne’ebé remata ona.',
    'You can only rate a completed ride.',
  ],
  'Já avaliaste esta viagem.': [
    'Ita avalia tiha ona viajen ida-ne’e.',
    'You have already rated this ride.',
  ],
  'Esta viagem já terminou.': ['Viajen ida-ne’e remata ona.', 'This ride has already ended.'],
  'Sem motorista.': ['La iha motorista.', 'No driver.'],
  'A viagem já terminou.': ['Viajen remata ona.', 'The ride has already ended.'],

  // ── Servidor
  'Rota não encontrada.': ['La hetan rota.', 'Route not found.'],
  'Erro no servidor. Tenta de novo.': [
    'Sala iha servidór. Koko fila-fali.',
    'Server error. Try again.',
  ],
};

// AS NOTIFICAÇÕES, que saem sem pedido nenhum à frente: vão na língua que a
// pessoa usou da última vez (users.lingua, guardada em requireAuth).
export const NOTIFICACOES = {
  pedidoNovoTitulo: {
    pt: 'Novo pedido de viagem',
    tet: 'Pedidu viajen foun',
    en: 'New ride request',
  },
  etapaCarregadaTitulo: { pt: 'Carga carregada', tet: 'Karga tula ona', en: 'Load on board' },
  etapaCarregadaTexto: {
    pt: 'O motorista já carregou e vai a caminho do destino.',
    tet: 'Motorista tula tiha ona karga no iha dalan ba destinu.',
    en: 'The driver has loaded up and is on the way to the destination.',
  },
  etapaDestinoTitulo: {
    pt: 'Chegou ao destino',
    tet: 'To’o ona destinu',
    en: 'Arrived at the destination',
  },
  etapaDestinoTexto: {
    pt: 'O motorista chegou ao destino da entrega.',
    tet: 'Motorista to’o ona iha entrega nia destinu.',
    en: 'The driver has reached the delivery destination.',
  },
  etapaDescarregadaTitulo: { pt: 'Descarga feita', tet: 'Karga hatun ona', en: 'Unloaded' },
  etapaDescarregadaTexto: {
    pt: 'A carga foi descarregada. Falta concluir a entrega.',
    tet: 'Karga hatun tiha ona. Falta atu remata entrega.',
    en: 'The load has been unloaded. The delivery still needs to be completed.',
  },
  motoristaDisponivelTitulo: {
    pt: 'Há um motorista disponível',
    tet: 'Iha motorista disponível',
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
  sosTitulo: { pt: '🚨 PEDIDO DE AJUDA', tet: '🚨 PEDIDU AJUDA', en: '🚨 CALL FOR HELP' },
  sosTexto: {
    pt: '{nome} carregou no SOS · {onde}',
    tet: '{nome} uza SOS · {onde}',
    en: '{nome} pressed SOS · {onde}',
  },
  sosAlguem: { pt: 'Alguém', tet: 'Ema ida', en: 'Someone' },
  sosSemPosicao: { pt: 'sem posição', tet: 'la iha pozisaun', en: 'no position' },
  prontoTitulo: {
    pt: 'Motorista à espera de aprovação',
    tet: 'Motorista hein aprovasaun',
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
    tet: 'Pagamentu hein konfirmasaun',
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
