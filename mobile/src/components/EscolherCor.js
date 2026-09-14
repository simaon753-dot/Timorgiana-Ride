import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CORES, CORES_OUTRAS } from '../dados/veiculos.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Cores em amostras. O quadrado não precisa de língua nenhuma, e é por ele
// que a maioria vai escolher — mais depressa do que a ler dez nomes.
//
// Guarda-se o CÓDIGO da cor ('branco'), não a palavra: assim o passageiro
// lê "Branco" e o motorista lê "Mutin", cada um na sua língua.
//
// "OUTRA" (14/09/26, pedido do Simão): abre as outras cores (CORES_OUTRAS),
// para ESCOLHER e não escrever. A primeira versão abria um campo de texto, e
// ele corrigiu: o que se escreve não se traduz nem tem amostra.
export default function EscolherCor({ valor, onEscolher }) {
  const { t } = useI18n();
  const escolhidaOutra = CORES_OUTRAS.find((c) => c.id === valor);
  // Quem já tem uma das outras cores (ao corrigir o veículo) vê-a aberta.
  const [aberta, setAberta] = useState(!!escolhidaOutra);

  function escolherPrincipal(id) {
    setAberta(false);
    onEscolher(id);
  }

  return (
    <View>
      <View style={styles.grelha}>
        {CORES.map((c) => (
          <Amostra
            key={c.id}
            cor={c}
            nome={t(`cor_${c.id}`)}
            activa={valor === c.id}
            onPress={() => escolherPrincipal(c.id)}
          />
        ))}
        {/* O botão "Outra" mostra a cor escolhida lá dentro, para se ver qual
            é mesmo com a lista fechada. */}
        <Pressable
          style={[styles.item, (aberta || escolhidaOutra) && styles.itemActivo]}
          onPress={() => setAberta((a) => !a)}
          accessibilityRole="button"
          accessibilityState={{ expanded: aberta, selected: !!escolhidaOutra }}
          accessibilityLabel={t('cor_outra')}
        >
          {escolhidaOutra ? (
            <View style={[styles.amostra, { backgroundColor: escolhidaOutra.hex }]}>
              <Visto hex={escolhidaOutra.hex} />
            </View>
          ) : (
            <View style={[styles.amostra, styles.paleta]}>
              {PALETA.map((hex) => (
                <View key={hex} style={[styles.quarto, { backgroundColor: hex }]} />
              ))}
            </View>
          )}
          <Text
            style={[styles.nome, (aberta || escolhidaOutra) && styles.nomeActivo]}
            numberOfLines={1}
          >
            {escolhidaOutra ? t(`cor_${escolhidaOutra.id}`) : t('cor_outra')}
          </Text>
        </Pressable>
      </View>

      {aberta ? (
        <View style={styles.outras}>
          <Text style={styles.titulo}>{t('corMaisCores')}</Text>
          <View style={styles.grelha}>
            {CORES_OUTRAS.map((c) => (
              <Amostra
                key={c.id}
                cor={c}
                nome={t(`cor_${c.id}`)}
                activa={valor === c.id}
                onPress={() => onEscolher(c.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Quatro cores num círculo: diz "há mais cores" sem ícone nem texto.
const PALETA = ['#EC8FB2', '#C9A23F', '#6A3D9A', '#1FA6A0'];

function Amostra({ cor, nome, activa, onPress }) {
  return (
    <Pressable
      style={[styles.item, activa && styles.itemActivo]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={nome}
    >
      <View style={[styles.amostra, { backgroundColor: cor.hex }]}>
        {activa ? <Visto hex={cor.hex} /> : null}
      </View>
      <Text
        style={[styles.nome, activa && styles.nomeActivo]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {nome}
      </Text>
    </Pressable>
  );
}

function Visto({ hex }) {
  return <Text style={[styles.visto, { color: escuro(hex) ? '#FFF' : '#111' }]}>✓</Text>;
}

// O visto tem de se ver tanto sobre branco como sobre preto. Luminância
// aproximada chega para decidir de que cor o desenhar.
function escuro(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

const criarEstilos = () =>
  StyleSheet.create({
    grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    item: {
      width: '22%',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    itemActivo: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    amostra: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paleta: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
    quarto: { width: '50%', height: '50%' },
    visto: { fontWeight: '900', fontSize: 16 },
    nome: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    nomeActivo: { color: colors.teal, fontWeight: '700' },
    outras: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    titulo: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.xs },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
