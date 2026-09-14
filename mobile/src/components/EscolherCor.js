import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CORES } from '../dados/veiculos.js';
import TextField from './TextField.js';
import Icone from '../design/Icone.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// O mesmo limite do servidor (routes/driver.js e users.js cortam aos 30).
export const COR_OUTRA_MAX = 30;

// Cores em amostras. O quadrado não precisa de língua nenhuma, e é por ele
// que a maioria vai escolher — mais depressa do que a ler dez nomes.
//
// Guarda-se o CÓDIGO da cor ('branco'), não a palavra: assim o passageiro
// lê "Branco" e o motorista lê "Mutin", cada um na sua língua.
//
// "OUTRA" (14/09/26, pedido do Simão): dourado, rosa, duas cores… nenhuma
// lista de dez cobre todos os veículos de Díli, e sem esta saída o motorista
// escolhia a mais parecida — e o passageiro procurava um carro que não
// existe. O que se escreve guarda-se como TEXTO, e o `nomeDaCor` já o mostra
// tal como está (é o mesmo caminho dos registos anteriores à lista).
export default function EscolherCor({ valor, onEscolher }) {
  const { t } = useI18n();
  const conhecida = CORES.some((c) => c.id === valor);
  // Aberta por estado e não por "o valor não é um código": senão, quem
  // escrevesse "branco e azul" via o campo desaparecer ao chegar a "branco".
  const [outra, setOutra] = useState(!!valor && !conhecida);

  function escolherCor(id) {
    setOutra(false);
    onEscolher(id);
  }

  function escolherOutra() {
    if (outra) return;
    setOutra(true);
    onEscolher('');
  }

  return (
    <View>
      <View style={styles.grelha}>
        {CORES.map((c) => {
          const activa = !outra && valor === c.id;
          return (
            <Pressable
              key={c.id}
              style={[styles.item, activa && styles.itemActivo]}
              onPress={() => escolherCor(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={t(`cor_${c.id}`)}
            >
              <View style={[styles.amostra, { backgroundColor: c.hex }]}>
                {activa ? (
                  <Text style={[styles.visto, { color: escuro(c.hex) ? '#FFF' : '#111' }]}>✓</Text>
                ) : null}
              </View>
              <Text style={[styles.nome, activa && styles.nomeActivo]} numberOfLines={1}>
                {t(`cor_${c.id}`)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.item, outra && styles.itemActivo]}
          onPress={escolherOutra}
          accessibilityRole="button"
          accessibilityState={{ selected: outra }}
          accessibilityLabel={t('cor_outra')}
        >
          <View style={[styles.amostra, styles.amostraOutra, outra && styles.amostraOutraActiva]}>
            <Icone nome="lapis" tamanho={18} cor={outra ? colors.teal : colors.textMuted} />
          </View>
          <Text style={[styles.nome, outra && styles.nomeActivo]} numberOfLines={1}>
            {t('cor_outra')}
          </Text>
        </Pressable>
      </View>
      {outra ? (
        <View style={styles.campoOutra}>
          <TextField
            value={valor}
            onChangeText={onEscolher}
            placeholder={t('corOutraPlaceholder')}
            maxLength={COR_OUTRA_MAX}
            icone="lapis"
            autoFocus
          />
        </View>
      ) : null}
    </View>
  );
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
    // Tracejada e sem cor: diz "esta não é uma cor, é escrever a sua".
    amostraOutra: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.textMuted },
    amostraOutraActiva: { borderColor: colors.teal },
    visto: { fontWeight: '900', fontSize: 16 },
    nome: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    nomeActivo: { color: colors.teal, fontWeight: '700' },
    campoOutra: { marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
