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
  atualizado: 'Version of 14 September 2026',
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
        'Payment is made directly to the driver, in cash, at the end of the ride. The amount payable is the one the application showed when the request was made, and does not change at the end. TimorgianaRide charges the passenger no commission and no fee of any kind. If we ever begin charging the passenger a fee, you will be notified in advance — never during a ride and never without prior notice.',
    },
    {
      titulo: 'Entry fees at venues',
      texto:
        'Some venues charge for vehicles to enter, such as the Timor Plaza car park and the Nicolau Lobato Airport grounds. When the pick-up or the destination is inside one of these venues, the application warns you before you request. That fee is not part of the fare: it is paid by the passenger, directly at the barrier, and not to TimorgianaRide or to the driver.',
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
      titulo: 'Requesting for someone else, and minors',
      texto:
        'You may request a ride for someone else by giving the name and mobile number of the person who will travel. In doing so, you declare that this person agrees to the ride and to the use of that data to carry it out. The driver contacts the traveller’s number; the pick-up code and the emergency button stay in the requester’s application, and the requester must give the code to the traveller before the driver arrives. The requester is responsible for the request they make.\n\nA minor may only travel if the requester declares that they are responsible for the minor or have the authorisation of the person who is. That declaration is recorded with the date and time, and the person who makes it answers for its truth. The driver sees that the traveller is a minor before accepting and may refuse the ride.',
    },
    {
      titulo: 'Pickup service',
      texto:
        'The Pickup carries goods or groups of people.\n\nFor goods, the requester declares that the goods are lawful, safe and compatible with the vehicle’s capacity, and describes them truthfully — type, size and, if they wish, photographs. It is prohibited to carry unlawful goods, weapons, ammunition, explosives, fuel or other dangerous materials. The driver may refuse a load that does not match the description, does not fit in the vehicle or cannot be carried safely. Packing and protecting the goods is the requester’s responsibility; help with loading or unloading is only included when requested and shown in the price.\n\nIn this service too, TimorgianaRide acts solely as an intermediary: the transport is a direct agreement between the requester and the driver, and TimorgianaRide is not liable for loss, theft or damage to the goods, or for delays. Photographs of the load serve as a record of the condition of the goods at departure.\n\nFor people, the number stated may not exceed what the vehicle may lawfully carry, and the driver may refuse if the number or the conditions are not safe.',
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
  atualizado: 'Version of 14 September 2026',
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
        'The passenger pays you in cash at the end of the ride, and the fare is entirely yours: TimorgianaRide charges no commission on rides — on a $3 ride, you keep the $3. Access to the platform is paid for separately, through the subscription described in the next clause. The price is set by the application and is not negotiated with the passenger — it is that transparency that builds trust in the service.',
    },
    {
      titulo: 'Platform subscription',
      texto:
        'Instead of a commission, the driver pays for access to the platform in days, in advance.\n\nFree period. Until 30 April 2027 access is free. Working days are recorded all the same, marked as free, so that you can see the mechanism working before you pay. Charging begins on 1 May 2027.\n\nThe day rule. A day is only deducted when you complete at least one ride on that day, by Dili time. The following are not deducted: days on which you were not available, days without rides, and cancelled rides. Several rides on the same day count as a single day. With a zero balance, you may keep working on a day on which you have already completed a ride, but you may not start a new day. Each deducted day is recorded, with its date, on the Subscription screen of the application.\n\nPrices. The packages in force are:\n\n• Motorbike: 3 days – $2; 10 days – $6; 30 days – $15.\n• Car and Pickup: 3 days – $4; 10 days – $12; 30 days – $30.\n\nDays purchased do not expire. Any change in prices will be announced in the application at least 30 days in advance and applies only to later purchases: days already purchased never lose their value. If you do not agree with the change, you are entirely free to stop using the platform, with the right to the refund provided for below.\n\nHow to pay. Payment is made to TimorgianaRide, by the means shown on the Subscription screen — national QR code (TUQR), bank transfer or at the office — quoting the personal reference code shown by the application. Payments made to any person, or by any means other than those shown in the application, are not recognised.\n\nWhen the days are credited. After paying, send the proof of payment through the application. The days are credited to your account once we confirm that the payment has reached TimorgianaRide’s account, within a maximum of 24 hours after the proof is sent. The proof of payment alone is not enough: if the payment cannot be found, you will be told why. Each top-up is recorded in the application, with the date, the days and the payment method.\n\nUnused days.\n\n• Temporary suspension: the days are not lost. Since days are only deducted when rides are completed, no day is spent while the suspension lasts.\n• Account closure at your request: the value of the unused days is refunded to you.\n• Permanent deactivation by TimorgianaRide: the value of the unused days is refunded to you, except where the deactivation results from serious misconduct — false or altered documentation, charging amounts higher than or different from those set by the application, or another serious breach of these Terms.\n• End of the service: if TimorgianaRide ceases to operate, it will give at least 30 days’ notice and refund the value of all unused days.\n\nThe amount refunded corresponds to the unused days, at the price per day you actually paid for them (the days purchased earliest are deemed to be used first), and is paid within 30 days of the request, to the account or wallet you indicate. Days offered free of charge by TimorgianaRide do not give rise to a refund.',
    },
    {
      titulo: 'Mandatory requirements and documentation',
      texto:
        'Before accepting rides, it is your sole responsibility to hold and keep valid:\n\n' +
        '• A driving licence valid and appropriate for the vehicle you drive;\n' +
        '• Duly updated vehicle documents and registration;\n' +
        '• Motor third-party liability insurance, which is COMPULSORY in Timor-Leste for every motor vehicle — Public Instruction no. 07/2010, article 3(1);\n' +
        '• The vehicle in proper safety and mechanical condition.\n\n' +
        'Insurance is the driver’s exclusive responsibility and must be taken out with an insurer licensed by the Central Bank of Timor-Leste. TimorgianaRide is not an insurer, neither provides nor replaces any cover, and does not verify that a policy exists.\n\n' +
        'IF THE VEHICLE IS NOT INSURED, the driver answers personally and without any limit for damage caused to passengers or third parties, with their entire estate. The legal cap of USD 20,000 protects those who hold a policy; those who do not have no cap at all. If any document expires, you must stop accepting rides immediately.',
    },
    {
      titulo: 'Document validation and protection',
      texto:
        'We ask for your driving licence, the vehicle document and a photograph of yourself solely to confirm your identity and formal eligibility — this is what gives passengers confidence when getting into the vehicle. Your driving licence and vehicle document are stored in our database, accessed only by the platform management team, and are not shown to passengers or shared with third parties. Your photograph is different: it is shown to the passenger of a ride you accept, on their screen, for as long as that ride lasts — this is how they confirm they got into the right vehicle, just as they confirm the plate and the model. Once the ride ends it is no longer shown, and the ride history does not display it. You may request the deletion of your documents, which will result in the closure of your driver account.',
    },
    {
      titulo: 'Shift photograph',
      texto:
        'At the start of each working day, the application asks for a photograph of you (the shift photograph) to confirm that the person driving is the account holder. Without it you cannot go available. Your most recent shift photograph is the one the passenger sees during the ride, and the management team may compare it with your registration photograph. Each shift photograph is kept for 7 days and then deleted.',
    },
    {
      titulo: 'Safety and rules of conduct',
      texto:
        'The driver undertakes to comply strictly with the Highway Code and to drive prudently. Driving under the influence of alcohol, narcotics or psychotropic substances is expressly prohibited. Respectful and non-discriminatory treatment of all passengers is mandatory. While providing the service, the driver has the Emergency button in the app to report situations of risk, and must call 112, 110 or 115 directly in the event of immediate danger.',
    },
    {
      titulo: 'Pickup service',
      texto:
        'Drivers of a Pickup receive requests to carry goods and groups of people.\n\n• Goods: before accepting, you see the type and size of the load, the help requested and, where available, the photographs. You may refuse a load that does not match the description, does not fit in the vehicle or cannot be carried safely, and you must refuse goods you know or suspect to be unlawful or dangerous. You must secure the load safely during transport and mark in the application when it was loaded, when it reached the destination and when it was unloaded — these records serve as proof of the service. TimorgianaRide is not liable for loss, theft or damage to the goods carried.\n• People: you may only carry the number of people, and in the conditions, that the law and the vehicle’s documents allow, and you must refuse the request when the number or the conditions are not safe or lawful.',
    },
    {
      titulo: 'Minor passengers',
      texto:
        'A request may be made for a minor, with the requester’s declaration that they are responsible for the minor or have the authorisation of the person who is. The driver sees this before accepting and is free to refuse. If you accept, you must take the minor directly to the destination given.',
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
