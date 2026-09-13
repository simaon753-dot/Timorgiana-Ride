import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// OS TRÊS NÚMEROS DA VIAGEM — sistema de design TGA.
//
// Distánsia · Tempu estimadu · Folin estimadu, lado a lado. Aparecem nos dois
// lados das referências: o passageiro vê-os na viagem, o motorista no pedido.
// UM componente e não dois, para os dois lados verem exactamente os mesmos
// números formatados da mesma maneira — numa app a dinheiro vivo, dois ecrãs
// que arredondam o preço de formas diferentes são uma discussão à porta do
// carro.
// `semPreco` é o que se escreve quando o preço é a combinar (ex.: "Hatene hamutuk").
export default function NumerosViagem({ km, min, preco, semPreco }) {
  const { t } = useI18n();
  const itens = [
    { icone: 'rota', rotulo: t('distancia'), valor: km != null ? `${km} km` : '—' },
    { icone: 'relogio', rotulo: t('tempuEstimadu'), valor: min != null ? `${min} min` : '—' },
    {
      icone: 'carteira',
      rotulo: t('folinEstimadu'),
      valor: preco != null ? `$${Number(preco).toFixed(2)}` : semPreco || '—',
    },
  ];
  return (
    <View style={styles.linha}>
      {itens.map((i) => (
        <View key={i.icone} style={styles.caixa}>
          <Icone nome={i.icone} tamanho={22} cor={colors.teal} />
          <View style={styles.textos}>
            <Text style={styles.rotulo} numberOfLines={1}>
              {i.rotulo}
            </Text>
            <Text style={styles.valor} numberOfLines={1}>
              {i.valor}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    linha: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
    caixa: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    textos: { flex: 1 },
    rotulo: { ...tipo.legenda, fontSize: 11, color: colors.textMuted },
    valor: { ...tipo.corpoForte, fontSize: 16, lineHeight: 20, color: colors.text },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
