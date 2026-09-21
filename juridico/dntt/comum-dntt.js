// Base comum do processo do DNTT (Setembro de 2026).
//
// Os quatro documentos nascem do mesmo dia e do mesmo enquadramento legal.
// As citações dos diplomas estão AQUI e não em cada ficheiro: uma citação
// legal errada repetida em quatro documentos são quatro erros, e é assim que
// se perde a credibilidade de um dossier inteiro logo no primeiro.
const base = require('../comum.js');

const VERSAO_DNTT = '21 de Setembro de 2026';

// Os diplomas, tal como estão publicados no Jornal da República.
const DL_BASES = 'Decreto-Lei n.º 2/2003, de 10 de Março (Lei de Bases do Sistema de Transportes Rodoviários)';
const DL_ESTRADA = 'Decreto-Lei n.º 6/2003, de 3 de Abril (Código da Estrada)';
const DM_TAXI = 'Diploma Ministerial n.º 5/2010, de 5 de Maio (Disciplina a Atividade de Transporte Público de Passageiros na Modalidade Táxi)';

const documento = (nome, subt, filhos) => base.documento(nome, subt, filhos, VERSAO_DNTT);

module.exports = { ...base, documento, VERSAO_DNTT, DL_BASES, DL_ESTRADA, DM_TAXI };
