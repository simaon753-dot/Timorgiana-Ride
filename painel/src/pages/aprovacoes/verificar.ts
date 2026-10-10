import { diasAte } from '@/lib/formato';
import { tl } from '@/i18n';
import type { DocumentoResumo, Motorista, TipoDocumento } from '@/types/api';

// O QUE A MÁQUINA CONSEGUE VERIFICAR SOZINHA — a mesma regra do painel antigo.
//
// Não recusa nada. Levanta o dedo, para quem decide olhar com atenção para
// AQUELA fotografia em vez de olhar para as seis com a mesma atenção.

export const TIPOS_DOCUMENTO: TipoDocumento[] = ['photo', 'identity', 'licence', 'cartaverso', 'vehicle', 'inspection'];

// As quatro fotografias do veículo (04/10/2026). Impedem a aprovação de um
// registo NOVO, como um documento em falta; a quem já está aprovado só se
// apontam, porque não existiam quando se registou.
export const FOTOS_VEICULO: TipoDocumento[] = ['veiculofrente', 'veiculotras', 'veiculoesquerda', 'veiculodireita'];

// O certificado de registo criminal (09/10/2026, decisão do Simão): como as
// fotografias, impede a aprovação de um registo NOVO; a quem já está aprovado
// só se aponta. «Recente» (3 meses) vê-se na data de emissão do papel.
export const REGISTO_CRIMINAL: TipoDocumento = 'registocriminal';

// VEÍCULO DE TERCEIRO (10/10/2026): quem declarou que o veículo é de outra
// pessoa junta a identificação do dono e a autorização assinada por ele
// (modelo d4). Impedem a aprovação, e no servidor também impedem trabalhar.
export const DOCS_TERCEIRO: TipoDocumento[] = ['idproprietario', 'autorizacaoproprietario'];
export const deTerceiro = (d: Motorista) => d.vehicle?.proprio === false;

// Quanto tempo é PLAUSÍVEL faltar para cada documento caducar. As datas são
// escritas pelo próprio motorista a olhar para o cartão, e nada o impede de
// escrever 2035 — mas um Kartaun Inspesaun vale um ano: uma validade a três
// anos de distância não é um documento válido, é um engano ou uma invenção.
export const MAX_DIAS: Partial<Record<TipoDocumento, number>> = { inspection: 400, licence: 5500, vehicle: 5500 };

export type NivelVerificacao = 'ok' | 'no' | 'duvida';
export interface LinhaVerificacao {
  nivel: NivelVerificacao;
  texto: string;
}

export function porTipo(docs: DocumentoResumo[]) {
  return Object.fromEntries(docs.map((d) => [d.kind, d])) as Partial<Record<TipoDocumento, DocumentoResumo>>;
}

export function documentoSuspeito(doc: DocumentoResumo) {
  const dias = diasAte(doc.expiresOn);
  const max = MAX_DIAS[doc.kind];
  return doc.expirado || (max != null && dias != null && dias > max);
}

export function verificar(d: Motorista): LinhaVerificacao[] {
  const docs = porTipo(d.documents);
  const linhas: LinhaVerificacao[] = [];

  // A COR DO VEÍCULO impede a aprovação como um documento em falta: é o que o
  // passageiro vê primeiro. A matrícula só se lê a três metros.
  if (d.vehicle && !d.vehicle.color) {
    linhas.push({ nivel: 'no', texto: 'Sem cor do veículo — o passageiro não o distingue ao longe' });
  }

  const faltam = TIPOS_DOCUMENTO.filter((k) => !docs[k]).map((k) => tl('documento', k));
  linhas.push(
    faltam.length
      ? { nivel: 'no', texto: `Em falta: ${faltam.join(', ')}` }
      : { nivel: 'ok', texto: 'Os seis documentos estão presentes' }
  );

  if (!docs[REGISTO_CRIMINAL]) {
    linhas.push({
      nivel: d.driverStatus === 'approved' ? 'duvida' : 'no',
      texto: 'Falta o certificado de registo criminal',
    });
  } else {
    linhas.push({ nivel: 'duvida', texto: 'Registo criminal: confirmar que foi emitido nos últimos 3 meses e que não tem NENHUMA condenação — qualquer condenação impede a aprovação' });
  }

  if (deTerceiro(d)) {
    const semDono = DOCS_TERCEIRO.filter((k) => !docs[k]).map((k) => tl('documento', k).toLowerCase());
    linhas.push(
      semDono.length
        ? { nivel: 'no', texto: `Veículo de terceiro — falta: ${semDono.join(', ')}` }
        : {
            nivel: 'duvida',
            texto:
              'Veículo de terceiro: confirmar que a autorização está assinada e identifica o proprietário, o motorista e este veículo (matrícula), e que o nome do proprietário bate com o cartão de registo',
          }
    );
  }

  const semFotos = FOTOS_VEICULO.filter((k) => !docs[k]).map((k) => tl('documento', k).toLowerCase());
  if (semFotos.length) {
    linhas.push({
      nivel: d.driverStatus === 'approved' ? 'duvida' : 'no',
      texto: `Faltam fotografias do veículo: ${semFotos.join(', ')}`,
    });
  } else {
    linhas.push({ nivel: 'ok', texto: 'As quatro fotografias do veículo estão presentes' });
  }

  const semData = (['licence', 'vehicle', 'inspection'] as TipoDocumento[]).filter((k) => docs[k] && !docs[k]!.expiresOn);
  if (semData.length) linhas.push({ nivel: 'no', texto: `Sem data de validade: ${semData.map((k) => tl('documento', k)).join(', ')}` });

  const caducados = d.documents.filter((x) => x.expirado);
  if (caducados.length) {
    linhas.push({ nivel: 'no', texto: `Caducado: ${caducados.map((x) => tl('documento', x.kind)).join(', ')}` });
  } else if (!semData.length && !faltam.length) {
    linhas.push({ nivel: 'ok', texto: 'Nenhum documento caducado' });
  }

  for (const k of TIPOS_DOCUMENTO) {
    const doc = docs[k];
    const max = MAX_DIAS[k];
    if (!doc?.expiresOn || max == null) continue;
    const dias = diasAte(doc.expiresOn);
    if (dias == null) continue;
    if (dias > max) {
      linhas.push({ nivel: 'duvida', texto: `${tl('documento', k)}: validade longe demais (${Math.round(dias / 365)} anos)` });
    } else if (dias >= 0 && dias <= 30) {
      // Dito NA ALTURA DE APROVAR: aprovar alguém cuja carta acaba daqui a três
      // semanas é aprovar trabalho para três semanas.
      linhas.push({ nivel: 'duvida', texto: `${tl('documento', k)}: caduca em ${dias} dia${dias === 1 ? '' : 's'}` });
    }
  }

  // A CORREÇÃO PEDIDA IMPEDE, como um documento em falta (04/10/2026): quem
  // pediu disse que aquele papel não serve. Aprovar sem ele obriga ao «mesmo
  // assim», com a lista à frente.
  for (const k of [...TIPOS_DOCUMENTO, REGISTO_CRIMINAL, ...FOTOS_VEICULO, ...DOCS_TERCEIRO]) {
    const doc = docs[k];
    if (doc?.correcao) linhas.push({ nivel: 'no', texto: `${tl('documento', k)}: correção pedida — ${doc.correcao}` });
  }

  for (const k of TIPOS_DOCUMENTO) {
    const doc = docs[k];
    if (doc?.porRever) {
      linhas.push({
        nivel: 'duvida',
        texto: `${tl('documento', k)}: substituído (${doc.motivo ? tl('motivoDocumento', doc.motivo) : '—'}) — por confirmar`,
      });
    }
  }
  return linhas;
}

export function resumoVerificacao(d: Motorista) {
  const linhas = verificar(d);
  return {
    linhas,
    impede: linhas.some((l) => l.nivel === 'no'),
    problemas: linhas.filter((l) => l.nivel !== 'ok').length,
    presentes: TIPOS_DOCUMENTO.filter((k) => d.documents.some((x) => x.kind === k)).length,
  };
}
