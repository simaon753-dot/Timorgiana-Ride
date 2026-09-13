import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';

// AS QUATRO ETAPAS DA VIAGEM, com a hora de cada — sistema de design TGA.
//
// Pedidu konfirmadu → Motorista iha dalan → Viajen hahú → To'o ona. A feita
// leva ✓, a actual fica teal com o seu ícone, as seguintes esperam a cinzento
// com --:--. É a primeira coisa que o passageiro lê: em que ponto está, e há
// quanto tempo.
//
// AS HORAS VÊM DO SERVIDOR (createdAt, acceptedAt, startedAt, e a conclusão
// no updatedAt), nunca do relógio do telemóvel: a hora a que o motorista
// aceitou é um facto, não uma estimativa. Onde não há hora — as viagens
// anteriores a 14/09/26 não guardavam a de aceitar — mostra-se --:--.
function hhmm(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function etapaDaViagem(status) {
  if (status === 'requested') return 0;
  if (status === 'accepted' || status === 'arriving') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 4;
  return 0;
}

export default function EtapasViagem({ ride }) {
  const { t } = useI18n();
  const actual = etapaDaViagem(ride?.status);
  const etapas = [
    { nome: t('etapaPedidu'), icone: 'visto', hora: ride?.createdAt },
    {
      nome: t('etapaMotoristaDalan'),
      icone: VEICULOS[ride?.vehicleType]?.icone || 'carro',
      hora: ride?.acceptedAt,
    },
    { nome: t('etapaHahu'), icone: 'rota', hora: ride?.startedAt },
    {
      nome: t('etapaToo'),
      icone: 'pin',
      hora: ride?.status === 'completed' ? ride?.updatedAt : null,
    },
  ];
  const n = etapas.length;
  const margem = `${50 / n}%`;
  const feito = (Math.min(actual, n - 1) / (n - 1)) * (100 - 100 / n);

  return (
    <View style={styles.bloco}>
      <View style={[styles.traco, { left: margem, right: margem }]} />
      <View style={[styles.traco, styles.tracoFeito, { left: margem, width: `${feito}%` }]} />
      <View style={styles.linha}>
        {etapas.map((e, i) => {
          const passada = i < actual;
          const agora = i === actual;
          return (
            <View key={e.nome} style={styles.etapa}>
              <View
                style={[
                  styles.circulo,
                  passada && styles.circuloFeito,
                  agora && styles.circuloAgora,
                ]}
              >
                <Icone
                  nome={passada ? 'visto' : e.icone}
                  tamanho={18}
                  cor={passada || agora ? colors.onTeal : colors.textMuted}
                  traco={passada ? 3 : 2}
                />
              </View>
              <Text
                style={[styles.nome, (passada || agora) && styles.nomeActivo]}
                numberOfLines={2}
              >
                {i + 1}. {e.nome}
              </Text>
              <Text style={[styles.hora, (passada || agora) && styles.horaActiva]}>
                {passada || agora ? hhmm(e.hora) : '--:--'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CIRCULO = 40;
const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginVertical: spacing.md },
    linha: { flexDirection: 'row' },
    etapa: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
    traco: {
      position: 'absolute',
      top: CIRCULO / 2 - 1.5,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    tracoFeito: { backgroundColor: colors.teal },
    circulo: {
      width: CIRCULO,
      height: CIRCULO,
      borderRadius: CIRCULO / 2,
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circuloFeito: { backgroundColor: colors.teal, borderColor: colors.teal },
    circuloAgora: { backgroundColor: colors.teal, borderColor: colors.tintaTeal, borderWidth: 4 },
    nome: { ...tipo.legenda, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
    nomeActivo: { ...tipo.corpoForte, fontSize: 12, lineHeight: 16, color: colors.teal },
    hora: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    horaActiva: { color: colors.text },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
