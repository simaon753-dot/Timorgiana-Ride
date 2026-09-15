import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import MolduraModal from '../design/MolduraModal.js';
import { PAISES, PAIS_POR_OMISSAO, OUTRO_PAIS } from '../dados/paises.js';
import { colors, spacing, radius, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';

// UM NÚMERO DE TIMOR-LESTE TEM 8 DÍGITOS E COMEÇA POR 7.
//
// Regra dada pelo Simão (13/09/26), com a frase exacta a mostrar: "Númeru
// telefone tenke iha díjitu 8 no hahú ho 7." É exportada para o registo a
// usar ao passar de etapa — a mesma regra no campo e no botão, e não duas
// que um dia discordam.
//
// Um número estrangeiro chega com o indicativo à frente (+…) e não passa por
// esta regra: basta ter entre 8 e 15 dígitos, o tamanho de um número
// internacional.
export function telefoneValido(numero) {
  const s = String(numero || '');
  const digitos = s.replace(/\D/g, '');
  if (s.startsWith('+')) return digitos.length >= 8 && digitos.length <= 15;
  return /^7\d{7}$/.test(digitos);
}

// O campo do telemóvel, com escolha de país — sistema de design TGA.
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
// A FORMA É A DAS REFERÊNCIAS: ícone do telefone num bloco, a bandeira e o
// +670 noutro, e os dígitos a seguir — 🇹🇱 +670 | 77123456.
//
// O ERRO SÓ APARECE DEPOIS DE SAIR DO CAMPO. A meio da escrita todos os
// números estão errados, e um aviso vermelho ao primeiro dígito castiga quem
// ainda nem acabou.
export default function CampoTelefone({
  label,
  valor,
  onChange,
  hint,
  soTimor = false,
  obrigatorio = false,
  erro,
}) {
  const { t } = useI18n();
  const [pais, setPais] = useState(PAIS_POR_OMISSAO);
  const [aberto, setAberto] = useState(false);
  const [focado, setFocado] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [procura, setProcura] = useState('');

  function montar(digitos, p) {
    const so = String(digitos || '').replace(/[^\d]/g, '');
    if (!so) return '';
    if (p.codigo === 'TL') return so;
    // "Outro país": os dígitos escritos JÁ SÃO o número internacional, com o
    // indicativo lá dentro. Só se lhe põe o + à frente.
    if (p.codigo === 'XX') return `+${so}`;
    return `${p.indicativo}${so}`;
  }

  // A lista, filtrada. Procura pelo nome e pelo indicativo — há quem saiba o
  // número e não o nome em português do seu próprio país.
  const q = procura.trim().toLowerCase();
  const visiveis = [...PAISES, OUTRO_PAIS].filter(
    (p) =>
      !q ||
      p.nome.toLowerCase().includes(q) ||
      p.indicativo.includes(q.replace('+', '')) ||
      p.codigo.toLowerCase() === q
  );

  // O que se mostra é sempre só os dígitos; o indicativo vive no botão.
  const digitos = String(valor || '')
    .replace(/^\+\d+/, '')
    .replace(/[^\d]/g, '');

  const erroMostrado =
    erro || (tocado && !focado && digitos && !telefoneValido(valor) ? t('errTelefoneTL') : null);
  const certo = !erroMostrado && digitos && telefoneValido(valor);

  return (
    <View style={styles.bloco}>
      {label ? (
        <Text style={styles.rotulo}>
          {label}
          {obrigatorio ? <Text style={styles.asterisco}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.linha,
          focado && styles.linhaFocada,
          certo && styles.linhaFocada,
          erroMostrado && styles.linhaErro,
        ]}
      >
        <View style={styles.iconeCaixa}>
          <Icone
            nome="telefone"
            tamanho={20}
            cor={erroMostrado ? colors.danger : focado ? colors.teal : colors.textMuted}
          />
        </View>
        {/* TRANCADO PARA MOTORISTAS. Conduzir na TimorgianaRide é para
            cidadãos de Timor-Leste, por isso o selector deixa de ser uma
            escolha — e mostrar uma escolha que não é escolha seria pior do
            que não a mostrar. A bandeira fica, para se ver qual é. */}
        <Pressable
          style={styles.pais}
          onPress={() => !soTimor && setAberto(true)}
          hitSlop={6}
          disabled={soTimor}
          accessibilityRole="button"
          accessibilityLabel={`${pais.nome} ${pais.indicativo}`}
        >
          <Text style={styles.bandeira}>{pais.bandeira}</Text>
          <Text style={styles.indicativo}>{pais.indicativo}</Text>
          {soTimor ? null : <Text style={styles.seta}>▾</Text>}
        </Pressable>
        <TextInput
          style={styles.campo}
          value={digitos}
          onChangeText={(d) => onChange(montar(d, pais))}
          onFocus={() => setFocado(true)}
          onBlur={() => {
            setFocado(false);
            setTocado(true);
          }}
          keyboardType="phone-pad"
          autoCapitalize="none"
          maxLength={pais.codigo === 'TL' ? 8 : 15}
          placeholder={
            pais.codigo === 'TL' ? '77123456' : pais.codigo === 'XX' ? '351912345678' : ''
          }
          placeholderTextColor={colors.textMuted}
        />
        {certo ? (
          <View style={styles.visto}>
            <Icone nome="visto" tamanho={18} cor={colors.teal} traco={2.5} />
          </View>
        ) : null}
      </View>
      {erroMostrado ? (
        <Text style={styles.erro}>{erroMostrado}</Text>
      ) : pais.codigo === 'XX' ? (
        <Text style={styles.dica}>{t('paisOutroDica')}</Text>
      ) : hint ? (
        <Text style={styles.dica}>{hint}</Text>
      ) : null}

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <MolduraModal style={styles.cheio} edges={['top', 'bottom']}>
          <View style={styles.topo}>
            <Text style={styles.tituloLista}>{t('paisIndicativo')}</Text>
            <Pressable onPress={() => setAberto(false)} hitSlop={10}>
              <Text style={styles.fechar}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.procura}
            value={procura}
            onChangeText={setProcura}
            placeholder={t('paisProcurar')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {!visiveis.length ? <Text style={styles.semPais}>{t('paisSemResultado')}</Text> : null}
            {visiveis.map((p) => (
              <Pressable
                key={p.codigo}
                style={[styles.item, p.codigo === pais.codigo && styles.itemEscolhido]}
                onPress={() => {
                  setPais(p);
                  setAberto(false);
                  setProcura('');
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
        </MolduraModal>
      </Modal>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginBottom: spacing.md },
    rotulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
    },
    linhaFocada: { borderColor: colors.teal },
    linhaErro: { borderColor: colors.danger },
    iconeCaixa: {
      width: 50,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    pais: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      paddingHorizontal: spacing.md,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    procura: {
      margin: spacing.md,
      marginTop: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      color: colors.text,
      fontSize: fontSize.md,
    },
    semPais: { ...tipo.corpo, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
    bandeira: { fontSize: fontSize.lg, marginRight: 6 },
    indicativo: { ...tipo.corpoForte, color: colors.text },
    seta: { ...tipo.legenda, color: colors.textMuted, marginLeft: 4 },
    campo: {
      flex: 1,
      ...tipo.corpo,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      color: colors.text,
    },
    visto: { paddingRight: spacing.md },
    dica: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },
    erro: { ...tipo.legenda, color: colors.danger, marginTop: spacing.xs },

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
