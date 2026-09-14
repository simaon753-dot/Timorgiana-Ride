import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, elevacao, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { VEICULOS, nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { nomeDaCor, hexDaCor } from '../lib/corVeiculo.js';
import { CARROCERIAS, CAPACIDADES } from '../dados/veiculos.js';
import { useI18n } from '../i18n/index.js';

// O CARTÃO DO VEÍCULO — sistema de design TGA. Saiu da viagem do passageiro
// (14/09/26) para servir também o perfil e o detalhe de conta: o mesmo carro
// não pode ter três aspectos em três ecrãs.
//
// Quem espera na rua faz sempre a mesma sequência: vê a COR e a forma ao
// longe, confirma a MATRÍCULA de perto. Por isso a ilustração do tipo e a
// matrícula em caixa vêm primeiro, e o resto numa linha por baixo.
//
// `veiculo` é o objecto público: { type, model, plate, color, seats? }.
export default function CartaoVeiculo({ veiculo, titulo }) {
  const { t } = useI18n();
  if (!veiculo) return null;
  const tipoV = VEICULOS[veiculo.type];
  return (
    <View style={styles.cartao}>
      <View style={styles.cabeca}>
        <Icone nome={tipoV?.icone || 'carro'} tamanho={20} cor={colors.teal} />
        <Text style={styles.titulo}>{titulo || t('cartaoVeiculoTitulo')}</Text>
      </View>
      <View style={styles.linha}>
        {tipoV ? (
          <View style={styles.fotoCaixa}>
            <Image
              source={tipoV.imagens[paletaEmUso()] || tipoV.imagens.claro}
              style={styles.foto}
              resizeMode="contain"
            />
          </View>
        ) : null}
        {veiculo.plate ? (
          <View style={styles.matriculaCaixa}>
            <Text style={styles.rotulo}>{t('vehiclePlate')}</Text>
            <Text style={styles.matricula}>{veiculo.plate}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.dados}>
        <Dado rotulo={t('vehicleType')} valor={nomeDoVeiculo(t, veiculo.type)} />
        <Dado rotulo={t('vehicleModel')} valor={veiculo.model} />
        {veiculo.color ? (
          <View style={styles.dado}>
            <Text style={styles.rotulo}>{t('rotuloCor')}</Text>
            <View style={styles.corLinha}>
              {hexDaCor(veiculo.color) ? (
                <View style={[styles.amostra, { backgroundColor: hexDaCor(veiculo.color) }]} />
              ) : null}
              <Text style={styles.valor} numberOfLines={1}>
                {nomeDaCor(veiculo.color, t)}
              </Text>
            </View>
          </View>
        ) : null}
        {veiculo.seats ? <Dado rotulo={t('vehicleSeats')} valor={String(veiculo.seats)} /> : null}
      </View>
      {/* A segunda linha, só no Carry: o que protege a carga e quanto leva. */}
      {veiculo.carroceria || veiculo.capacidade || veiculo.ano ? (
        <View style={styles.dados}>
          <Dado
            rotulo={t('rotuloCarroceria')}
            valor={veiculo.carroceria ? t(NOME_CARROCERIA[veiculo.carroceria]) : null}
          />
          <Dado
            rotulo={t('capacidadeRotulo')}
            valor={veiculo.capacidade ? t(NOME_CAPACIDADE[veiculo.capacidade]) : null}
          />
          <Dado rotulo={t('rotuloAno')} valor={veiculo.ano ? String(veiculo.ano) : null} />
        </View>
      ) : null}
    </View>
  );
}

const NOME_CARROCERIA = Object.fromEntries(CARROCERIAS.map((c) => [c.id, c.chave]));
const NOME_CAPACIDADE = Object.fromEntries(CAPACIDADES.map((c) => [c.id, c.chave]));

function Dado({ rotulo, valor }) {
  if (!valor) return null;
  return (
    <View style={styles.dado}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.md,
      ...elevacao.plana,
    },
    cabeca: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    titulo: { ...tipo.corpoForte, color: colors.teal },
    linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    // A imagem num quadrado da cor do fundo DELA (branco/preto): as cores
    // são as dos ficheiros e não do tema — ver SISTEMA.md.
    fotoCaixa: {
      width: 108,
      height: 76,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    foto: { width: 108, height: 76 },
    matriculaCaixa: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.teal,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.paper,
    },
    // Espaçamento largo: uma matrícula lê-se carácter a carácter, e é assim
    // que se compara com o carro que está à frente.
    matricula: { ...tipo.titulo, color: colors.text, letterSpacing: 1.5 },
    dados: {
      flexDirection: 'row',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    dado: { flex: 1, paddingRight: spacing.xs },
    rotulo: { ...tipo.legenda, color: colors.textMuted },
    valor: { ...tipo.corpoForte, color: colors.text },
    corLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    amostra: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
