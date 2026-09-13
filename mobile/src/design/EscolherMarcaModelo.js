import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo as tipografia } from './tipografia.js';
import Icone from './Icone.js';
import Button from '../components/Button.js';
import { useI18n } from '../i18n/index.js';
import { MOTORIZADAS, CARROS, CARGA } from '../dados/veiculos.js';

// MARKA E MODELU EM DOIS CAMPOS — sistema de design TGA.
//
// Como na referência do registo do motorista: primeiro a marca, depois o
// modelo dessa marca. Um campo só com trezentos modelos misturados obrigava a
// procurar; dois campos curtos são duas escolhas rápidas.
//
// As listas são as mesmas de sempre (dados/veiculos.js) — o que muda é só a
// forma de perguntar. E há sempre "Seluk" com escrita livre, na marca e no
// modelo: uma lista que não tem o veículo de alguém obriga essa pessoa a
// mentir ou a desistir do registo.
//
// O que sai daqui continua a ser UMA frase ("Toyota Avanza"), porque é assim
// que o veículo está guardado nas contas que já existem.
const FONTE = { motorbike: MOTORIZADAS, car: CARROS, carry: CARGA };

function Lista({ visivel, titulo, opcoes, onEscolher, onFechar, t }) {
  const [livre, setLivre] = useState('');
  const [aEscrever, setAEscrever] = useState(false);
  function fechar() {
    setLivre('');
    setAEscrever(false);
    onFechar();
  }
  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <SafeAreaView style={styles.cheio} edges={['top', 'bottom']}>
        <View style={styles.topo}>
          <Text style={styles.tituloLista}>{titulo}</Text>
          <Pressable onPress={fechar} hitSlop={10} accessibilityRole="button">
            <Text style={styles.fechar}>✕</Text>
          </Pressable>
        </View>
        {aEscrever ? (
          <View style={styles.livre}>
            <TextInput
              style={styles.livreCampo}
              value={livre}
              onChangeText={setLivre}
              autoFocus
              autoCapitalize="words"
              placeholder={titulo}
              placeholderTextColor={colors.textMuted}
            />
            <Button
              title={t('kontinua')}
              variant="marca"
              disabled={!livre.trim()}
              onPress={() => {
                onEscolher(livre.trim());
                fechar();
              }}
            />
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {opcoes.map((o) => (
              <Pressable
                key={o}
                style={styles.item}
                onPress={() => {
                  onEscolher(o);
                  fechar();
                }}
              >
                <Text style={styles.itemNome}>{o}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.item} onPress={() => setAEscrever(true)}>
              <Text style={[styles.itemNome, styles.itemSeluk]}>{t('markaSeluk')} …</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Campo({ rotulo, icone, texto, placeholder, onAbrir, desligado }) {
  return (
    <View style={styles.campoBloco}>
      <Text style={styles.rotulo}>
        {rotulo}
        <Text style={styles.asterisco}> *</Text>
      </Text>
      <Pressable
        style={[styles.campo, desligado && styles.campoDesligado]}
        onPress={onAbrir}
        disabled={desligado}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${texto || placeholder}`}
      >
        <View style={styles.iconeCaixa}>
          <Icone nome={icone} tamanho={20} cor={colors.textMuted} />
        </View>
        <Text style={[styles.campoTexto, !texto && styles.campoVazio]} numberOfLines={1}>
          {texto || placeholder}
        </Text>
        <Text style={styles.seta}>▾</Text>
      </Pressable>
    </View>
  );
}

export default function EscolherMarcaModelo({ tipo, onEscolher }) {
  const { t } = useI18n();
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [aberta, setAberta] = useState(null); // 'marca' | 'modelo' | null
  const fonte = FONTE[tipo] || CARROS;
  const marcas = fonte.map((m) => m.marca);
  const modelos = fonte.find((m) => m.marca === marca)?.modelos || [];

  // O TIPO MUDOU: a marca escolhida já não pertence à lista nova. Uma Honda
  // Beat que ficasse escolhida depois de mudar para Carry seria um veículo
  // que não existe.
  //
  // Num efeito e não durante o desenho: limpar ali chamava o estado do ecrã
  // que nos contém a meio do desenho dele, e o React não o permite. Salta a
  // primeira vez — ao abrir não há nada a limpar.
  const primeiraVez = useRef(true);
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    setMarca('');
    setModelo('');
    onEscolher('');
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  function escolherMarca(m) {
    setMarca(m);
    setModelo('');
    onEscolher('');
  }
  function escolherModelo(m) {
    setModelo(m);
    onEscolher(`${marca} ${m}`.trim());
  }

  return (
    <View style={styles.linha}>
      <Campo
        rotulo={t('marka')}
        icone="carro"
        texto={marca}
        placeholder={t('hiliMarka')}
        onAbrir={() => setAberta('marca')}
      />
      <Campo
        rotulo={t('vehicleModel')}
        icone="documento"
        texto={modelo}
        placeholder={t('hiliModelu')}
        onAbrir={() => setAberta('modelo')}
        desligado={!marca}
      />
      <Lista
        visivel={aberta === 'marca'}
        titulo={t('hiliMarka')}
        opcoes={marcas}
        onEscolher={escolherMarca}
        onFechar={() => setAberta(null)}
        t={t}
      />
      <Lista
        visivel={aberta === 'modelo'}
        titulo={t('hiliModelu')}
        opcoes={modelos}
        onEscolher={escolherModelo}
        onFechar={() => setAberta(null)}
        t={t}
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    linha: { flexDirection: 'row', gap: spacing.sm },
    campoBloco: { flex: 1, marginBottom: spacing.md },
    rotulo: { ...tipografia.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingRight: spacing.sm,
    },
    campoDesligado: { opacity: 0.5 },
    iconeCaixa: {
      width: 44,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      marginRight: spacing.sm,
    },
    campoTexto: { ...tipografia.corpo, color: colors.text, flex: 1 },
    campoVazio: { color: colors.textMuted },
    seta: { ...tipografia.corpo, color: colors.textMuted, marginLeft: 4 },

    cheio: { flex: 1, backgroundColor: colors.paper },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    tituloLista: { ...tipografia.titulo, color: colors.text },
    fechar: { fontSize: 22, color: colors.textMuted },
    item: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 52,
      justifyContent: 'center',
    },
    itemNome: { ...tipografia.corpo, color: colors.text },
    itemSeluk: { ...tipografia.corpoForte, color: colors.teal },
    livre: { padding: spacing.md, gap: spacing.md },
    livreCampo: {
      ...tipografia.corpo,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.teal,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      backgroundColor: colors.inputBg,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
