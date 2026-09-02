// Terms in English — translated from the Portuguese revised by Simão
// (a lawyer) on 29-08-2026.
//
// THE PORTUGUESE PREVAILS. This is stated in section 8 of both documents,
// and it is not a formality: the Portuguese is the version that went
// through legal review. Where a reader finds a difference between the
// two, the Portuguese is the text that governs.
//
// Translated conservatively, keeping legal weight over readability:
// "não responde civil, contraordenacional ou penalmente" becomes "bears
// no civil, administrative or criminal liability" — not "is not
// responsible". Softening the wording here would quietly change what the
// document says.
//
// Two Portuguese terms with no clean English equivalent, and how they
// were handled:
//   · "contraordenacional" — administrative offence liability, a
//     category between civil and criminal in Portuguese-derived law.
//     Rendered as "administrative", the closest English legal category.
//   · "Código do Trabalho" — kept as "Labour Code", capitalised, since
//     it names a specific statute rather than a general concept.
//
// Generated alongside pt.js and tet.js from piloto/TimorgianaRide-termos.docx.

export const termosPassageiro = {
  titulo: 'Terms of use',
  subtitulo: 'Read before creating an account. It is short and clear.',
  atualizado: 'Version of 29 August 2026',
  // Texto da caixa de aceitação. O que está entre ** fica clicável
  // e abre o documento. Sem este campo o ecrã de registo não abre.
  aceitarCurto: 'I have read and accept the **terms of use**',

  seccoes: [
    {
      titulo: 'What TimorgianaRide is',
      texto:
        'TimorgianaRide is an intermediation technology platform that connects people who need transport with independent drivers. In this service, TimorgianaRide acts solely as an intermediary and does not itself provide the transport or any driving service: drivers operate on their own account and at their own risk. The ride is a direct and exclusive agreement between you and the driver. The application is limited to providing the connection, calculating the estimated fare and providing means of communication between the parties.',
    },
    {
      titulo: 'Payment — in cash, no commission',
      texto:
        'Payment is made directly to the driver, in cash, at the end of the ride. The amount payable is the one the application showed at the time of the request, and it does not change at the end. In this initial testing phase, the platform service is free (we charge no commission to either the passenger or the driver). If in the future we begin charging any fee, you will be notified in advance — never during a ride and never without prior notice.',
    },
    {
      titulo: 'Testing phase (Beta version)',
      texto:
        'The application is in a testing phase. Technical failures, temporary unavailability of the service, or a shortage of available drivers in a given area or at a given time may occur. The platform does not guarantee that transport will be obtained immediately or without fail. If you need to reach somewhere at a strict time, do not rely on this service alone.',
    },
    {
      titulo: 'Passenger safety',
      texto:
        'Before entering the vehicle, always check that the number plate, the vehicle model and the driver’s name and photograph match the details shown on screen. If they do not match, do not enter the vehicle. During the ride you have two safety buttons:\n\n' +
        '• Share ride: lets you send your real-time location to someone you trust.\n' +
        '• Emergency: alerts our operations centre with your position and provides direct shortcuts to call the police, an ambulance or the fire service.\n\n' +
        'Important emergency notice: in the event of immediate danger, call 112, 110 or 115 first. The platform acts as a complementary support channel, not as a substitute for the emergency authorities.',
    },
    {
      titulo: 'Processing of personal data',
      texto:
        'We collect and process data essential to the operation of the service: name, mobile number, ride history and pick-up and drop-off points. During the journey, the vehicle’s geolocation is recorded for navigation and safety purposes.\n\n' +
        'The driver has access only to your name, your direct contact number and the ride points strictly necessary to perform the service. Your personal data is not sold to third parties.\n\n' +
        'You may request the closure of your account and the deletion or anonymisation of your data at any time through the contact provided in this app.',
    },
    {
      titulo: 'Conduct and acceptable use',
      texto:
        'Users are required to treat drivers courteously and with respect.\n\n' +
        'Occasional cancellations are understandable. However, repeated cancellation after the driver has accepted the ride creates undue fuel and time costs, and may result in the temporary or permanent suspension of the account.\n\n' +
        'Use of the app for unlawful purposes is expressly prohibited.',
    },
    {
      titulo: 'Liability',
      texto:
        'In the context of the use of this application, TimorgianaRide acts solely as an intermediation technology platform. The transport is carried out by the driver, with their own vehicle and under their own exclusive responsibility; in this relationship TimorgianaRide acts neither as a carrier nor as an insurer.\n\n' +
        'The provision of the transport service constitutes a direct and exclusive agreement between the passenger and the driver. TimorgianaRide bears no civil, administrative or criminal liability for:\n\n' +
        '• Road accidents, personal injury, death or material damage occurring during the ride;\n' +
        '• Delays, failure to keep to schedules, or changes of route by the driver;\n' +
        '• Loss, theft, forgetting of, or damage to personal objects and belongings inside the vehicle;\n' +
        '• Conduct, disputes, or verbal or physical offences occurring between passengers and drivers.\n\n' +
        'The collection and verification of documents (driving licence, vehicle registration and photograph) is intended solely for the driver’s registration validation on the platform, and does not constitute any guarantee or certification of driving skill, the mechanical condition of the vehicle, or the safety of the ride.',
    },
    {
      titulo: 'Contact and changes to these terms',
      texto:
        'For any problem, question or request concerning your personal data, contact us through the number provided within the application. Should these terms be changed, we will ask you to accept them again before you continue using the service.\n\n' +
        'These terms are published in Portuguese, Tetum and English. In the event of any divergence between the versions, the Portuguese text prevails.',
    },
  ],
};

export const termosMotorista = {
  titulo: 'Terms for drivers',
  subtitulo:
    'Conditions applicable to the provision of transport services connected through TimorgianaRide.',
  atualizado: 'Version of 29 August 2026',
  // Texto da caixa de aceitação. O que está entre ** fica clicável
  // e abre o documento. Sem este campo o ecrã de registo não abre.
  aceitarCurto: 'I have read and accept the **terms for drivers**',

  seccoes: [
    {
      titulo: 'Autonomy and professional status',
      texto:
        'The driver acts as a service provider and independent professional, without any relationship of legal subordination, employment relationship or exclusivity with TimorgianaRide.\n\n' +
        'This relationship is governed by the following principles of autonomy:\n\n' +
        '• There is no obligation to keep to schedules or to accept a minimum number of rides. You make yourself available and accept requests when and where you wish.\n' +
        '• Use of the application confers no right to a fixed salary, allowances, paid holidays, severance pay or the benefits provided for employees under the Labour Code.\n' +
        '• The driver is solely responsible for their vehicle, for maintenance and fuel costs, and for the tax obligations arising from their independent activity.',
    },
    {
      titulo: 'Fares and charging',
      texto:
        'The passenger pays you in cash at the end of the ride. We charge no commission in this initial phase: on a $3 ride, you keep the $3. If a service fee is introduced in the future, you will be notified in advance and will be entirely free to stop using the platform. The price is set by the application and is not negotiated with the passenger — it is that transparency that builds trust in the service.',
    },
    {
      titulo: 'Mandatory requirements and documentation',
      texto:
        'Before accepting rides, it is your sole responsibility to hold and keep valid:\n\n' +
        '• A driving licence valid and appropriate for the vehicle you drive;\n' +
        '• Duly updated vehicle documents and registration;\n' +
        '• Valid vehicle insurance appropriate to the activity carried out, including the transport of passengers;\n' +
        '• The vehicle in proper safety and mechanical condition.\n\n' +
        'Insurance cover is the driver’s exclusive responsibility: TimorgianaRide neither provides nor replaces any passenger transport or accident insurance, and the driver assumes in full the risks and potential damage arising from their driving activity. If any document expires, you must stop accepting rides immediately.',
    },
    {
      titulo: 'Document validation and protection',
      texto:
        'We ask for your driving licence, the vehicle document and a photograph of yourself solely to confirm your identity and formal eligibility — this is what gives passengers confidence when getting into the vehicle. These documents are stored in our database and accessed only by the platform management team. They are not shown to passengers or shared with third parties. You may request the deletion of your documents, which will result in the closure of your driver account.',
    },
    {
      titulo: 'Safety and rules of conduct',
      texto:
        'The driver undertakes to comply strictly with the Highway Code and to drive prudently. Driving under the influence of alcohol, narcotics or psychotropic substances is expressly prohibited. Respectful and non-discriminatory treatment of all passengers is mandatory. While providing the service, the driver has the Emergency button in the app to report situations of risk, and must call 112, 110 or 115 directly in the event of immediate danger.',
    },
    {
      titulo: 'Cancellation and attendance policy',
      texto:
        'By accepting a ride request, the driver undertakes to carry it out. Unjustified cancellations or failure to appear cause serious inconvenience to passengers and damage the reputation of the network.\n\n' +
        'Systematic or unjustified cancellation after acceptance may result in the temporary or permanent suspension of access to the platform.',
    },
    {
      titulo: 'Grounds for suspension and deactivation of the account',
      texto:
        'TimorgianaRide reserves the right to suspend or deactivate a driver’s account in the following situations:\n\n' +
        '• Presentation of false, altered or expired documentation;\n' +
        '• Receipt of serious or recurring complaints regarding safety or conduct;\n' +
        '• An excessive rate of unjustified cancellations;\n' +
        '• Charging amounts higher than, or different from, those set by the app;\n' +
        '• Breach of legal rules or of these Terms.\n\n' +
        'Wherever practicable, the driver will be notified of the reasons for the suspension and given the opportunity to provide an explanation.',
    },
    {
      titulo: 'Exclusion of liability',
      texto:
        'The driver carries out their activity on their own account and at their own risk. TimorgianaRide is not liable for accidents, traffic fines, damage to the vehicle, or any occurrence during the provision of the ride. In this relationship, TimorgianaRide acts solely as an intermediation technology tool; it is neither an insurer nor a guarantee of a minimum number of rides or any particular level of earnings.\n\n' +
        'These terms are published in Portuguese, Tetum and English. In the event of any divergence between the versions, the Portuguese text prevails.',
    },
  ],
};
