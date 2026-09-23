import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import StarRating from './StarRating.js';
import Button from './Button.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// OS MOTIVOS, COPIADOS DO SERVIDOR (23/09/2026).
//
// Escritos aqui à mão e não pedidos ao servidor de propósito: o painel de
// avaliação aparece no fim de uma viagem, muitas vezes já com o telemóvel a
// sair da rede, e uma lista que precisasse de uma ida ao servidor
// simplesmente não apareceria. O `scripts/verificar-tipos.mjs` é que impede
// as duas cópias de divergirem — é a quinta lista do projecto montada assim.
//
// A lista é a de quem é AVALIADO, não a de quem avalia: nesta app uma conta
// de motorista também pede viagens, e aí quem está a ser avaliado é o
// motorista dela.
const MOTIVOS_SOBRE_MOTORISTA = ['conducao', 'naoFoiAoLocal', 'atraso', 'malcriado', 'precoAcima'];
const MOTIVOS_SOBRE_PASSAGEIRO = [
  'naoApareceu',
  'fezEsperar',
  'naoEstavaNoLocal',
  'malcriado',
  'cargaDiferente',
];

// Acima disto não se pergunta porquê: pedir defeitos a quem está satisfeito
// é fabricar queixas. O servidor aplica a mesma regra e deita fora o que
// venha acima dela.
const ESTRELAS_COM_MOTIVO = 3;
const MAX_MOTIVOS = 3;

// Painel de avaliação mostrado quando a viagem fica concluída.
export default function RatingPanel({ ride, role }) {
  const { t } = useI18n();
  const { rateRide, rated } = useRides();
  const [stars, setStars] = useState(0);
  const [motivos, setMotivos] = useState([]);
  const [busy, setBusy] = useState(false);

  // Quem eu estou a avaliar: sou passageiro, avalio o motorista.
  const lista = role === 'passenger' ? MOTIVOS_SOBRE_MOTORISTA : MOTIVOS_SOBRE_PASSAGEIRO;
  const perguntarPorque = stars >= 1 && stars <= ESTRELAS_COM_MOTIVO;

  function alternar(m) {
    setMotivos((antes) =>
      antes.includes(m)
        ? antes.filter((x) => x !== m)
        : antes.length >= MAX_MOTIVOS
          ? antes
          : [...antes, m]
    );
  }

  if (rated) {
    return (
      <View style={styles.box}>
        <Text style={styles.thanks}>{t('ratingThanks')}</Text>
      </View>
    );
  }

  async function submit() {
    if (stars < 1) return;
    setBusy(true);
    try {
      // Subir a estrela depois de ter marcado motivos deixava-os pendurados
      // numa avaliação que já não os pede. O servidor também os deita fora,
      // mas quem os enviasse tinha-os visto marcados no ecrã.
      await rateRide(ride.id, stars, perguntarPorque ? motivos : []);
    } catch {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('rateTitle')}</Text>
      <Text style={styles.subtitle}>
        {role === 'passenger' ? t('rateDriver') : t('ratePassenger')}
      </Text>
      <View style={{ marginVertical: spacing.md }}>
        <StarRating value={stars} onChange={setStars} />
      </View>

      {/* SÓ NAS BAIXAS, e nunca de início: o painel abre com as estrelas
          sozinhas, e a pergunta aparece quando ela já foi respondida. Uma
          lista de queixas à vista antes de a pessoa avaliar sugere-lhe as
          queixas. */}
      {perguntarPorque ? (
        <View style={styles.motivos}>
          <Text style={styles.porque}>{t('ratePorque')}</Text>
          <View style={styles.pastilhas}>
            {lista.map((m) => {
              const posto = motivos.includes(m);
              return (
                <Pressable
                  key={m}
                  onPress={() => alternar(m)}
                  style={[styles.pastilha, posto ? styles.pastilhaPosta : null]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: posto }}
                >
                  <Text style={[styles.pastilhaTexto, posto ? styles.pastilhaTextoPosto : null]}>
                    {t('aval' + m.charAt(0).toUpperCase() + m.slice(1))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.opcional}>{t('rateOpcional')}</Text>
        </View>
      ) : null}
      <Button title={t('submitRating')} onPress={submit} loading={busy} disabled={stars < 1} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    box: {
      marginTop: spacing.lg,
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      padding: spacing.lg,
      alignItems: 'center',
    },
    title: { ...tipo.subtitulo, color: colors.text },
    subtitle: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    thanks: { ...tipo.subtitulo, color: colors.success, textAlign: 'center' },
    motivos: { alignSelf: 'stretch', marginBottom: spacing.md },
    porque: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.sm },
    pastilhas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    pastilha: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    // Marcada: fundo cheio, porque um contorno a mudar de cor não se vê num
    // ecrã ao sol — e este painel abre na rua.
    pastilhaPosta: { backgroundColor: colors.teal, borderColor: colors.teal },
    pastilhaTexto: { ...tipo.pequeno, color: colors.text },
    pastilhaTextoPosto: { color: colors.onTeal },
    opcional: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
