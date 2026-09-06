import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAISES, PAIS_POR_OMISSAO } from '../dados/paises.js';
import { colors, spacing, radius, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// O campo do telemóvel, com escolha de país.
//
// O TIMOR-LESTE VEM ESCOLHIDO, e está em primeiro na lista. Noventa e nove
// por cento de quem se inscreve não vai tocar neste selector — e é por isso
// que ele é pequeno e fica ao lado, em vez de ser um campo por cima.
//
// O QUE SAI DAQUI: um número já pronto para o servidor. Com o Timor-Leste,
// são os oito dígitos como sempre — é assim que está guardado nas contas que
// já existem, e é assim que toda a gente escreve o seu número. Com outro
// país, leva o indicativo à frente.
//
// Parece inconsistente e é deliberado: mudar o formato dos números locais
// obrigava a migrar as contas existentes e a ensinar toda a gente a escrever
// quatro dígitos que nunca escreveu.
export default function CampoTelefone({ label, valor, onChange, hint }) {
  const { t } = useI18n();
  const [pais, setPais] = useState(PAIS_POR_OMISSAO);
  const [aberto, setAberto] = useState(false);
  const [focado, setFocado] = useState(false);

  function montar(digitos, p) {
    const so = String(digitos || '').replace(/[^\d]/g, '');
    if (!so) return '';
    return p.codigo === 'TL' ? so : `${p.indicativo}${so}`;
  }

  // O que se mostra é sempre só os dígitos; o indicativo vive no botão.
  const digitos = String(valor || '')
    .replace(/^\+\d+/, '')
    .replace(/[^\d]/g, '');

  return (
    <View style={styles.bloco}>
      {label ? <Text style={styles.rotulo}>{label}</Text> : null}
      <View style={[styles.linha, focado && styles.linhaFocada]}>
        <Pressable style={styles.pais} onPress={() => setAberto(true)} hitSlop={6}>
          <Text style={styles.bandeira}>{pais.bandeira}</Text>
          <Text style={styles.indicativo}>{pais.indicativo}</Text>
          <Text style={styles.seta}>▾</Text>
        </Pressable>
        <TextInput
          style={styles.campo}
          value={digitos}
          onChangeText={(d) => onChange(montar(d, pais))}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          keyboardType="phone-pad"
          autoCapitalize="none"
          placeholder={pais.codigo === 'TL' ? '77123456' : ''}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {hint ? <Text style={styles.dica}>{hint}</Text> : null}

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={styles.cheio} edges={['top', 'bottom']}>
          <View style={styles.topo}>
            <Text style={styles.tituloLista}>{t('paisIndicativo')}</Text>
            <Pressable onPress={() => setAberto(false)} hitSlop={10}>
              <Text style={styles.fechar}>✕</Text>
            </Pressable>
          </View>
          <ScrollView>
            {PAISES.map((p) => (
              <Pressable
                key={p.codigo}
                style={[styles.item, p.codigo === pais.codigo && styles.itemEscolhido]}
                onPress={() => {
                  setPais(p);
                  setAberto(false);
                  // O número mantém-se; só muda o país que o acompanha.
                  onChange(montar(digitos, p));
                }}
              >
                <Text style={styles.itemBandeira}>{p.bandeira}</Text>
                <Text style={styles.itemNome}>{p.nome}</Text>
                <Text style={styles.itemIndicativo}>{p.indicativo}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginBottom: spacing.md },
    rotulo: { ...tipo.etiqueta, color: colors.textMuted, marginBottom: spacing.xs },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
    },
    linhaFocada: { borderColor: colors.teal },
    pais: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    bandeira: { fontSize: fontSize.lg, marginRight: 4 },
    indicativo: { ...tipo.corpoForte, color: colors.text },
    seta: { ...tipo.legenda, color: colors.textMuted, marginLeft: 3 },
    campo: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
    },
    dica: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },

    cheio: { flex: 1, backgroundColor: colors.paper },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    tituloLista: { ...tipo.titulo, color: colors.text },
    fechar: { fontSize: fontSize.lg, color: colors.textMuted },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemEscolhido: { backgroundColor: colors.tintaTeal },
    itemBandeira: { fontSize: fontSize.lg, marginRight: spacing.sm },
    itemNome: { ...tipo.corpo, color: colors.text, flex: 1 },
    itemIndicativo: { ...tipo.corpoForte, color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
