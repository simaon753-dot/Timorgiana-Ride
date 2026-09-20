import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { encolherFoto } from '../lib/encolherFoto.js';
import Icone from '../design/Icone.js';
import Button from './Button.js';
import TextField from './TextField.js';
import MolduraModal from '../design/MolduraModal.js';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// A ENCOMENDA, vista pelos dois lados (jastip, 20/09/2026).
//
// O MESMO CARTÃO para quem pede e para quem conduz, de propósito: são as
// mesmas contas, e duas versões dele acabariam a mostrar números diferentes
// no dia em que uma mudasse. O passageiro vê o que pediu; o motorista vê o que
// tem de comprar e até quanto pode gastar — que é a informação com que ele
// decide se aceita.
//
// As duas parcelas vivem separadas no ecrã porque são dinheiro de origens
// diferentes: a VIAGEM é o que a plataforma calcula, as COMPRAS são dinheiro
// do motorista a ser devolvido. Somá-las numa linha só esconderia isso.

const dolares = (v) => `$${Number(v || 0).toFixed(2)}`;

export function ResumoEncomenda({ lista, itens, loja, teto, taxa, compras, total, onAlterar }) {
  const { t } = useI18n();
  return (
    <View style={styles.caixa}>
      <View style={styles.topo}>
        <View style={styles.icone}>
          <Icone nome="caixa" tamanho={18} cor={colors.onAcento} />
        </View>
        <Text style={styles.titulo}>{t('encomendaResumo')}</Text>
        {onAlterar ? (
          <Pressable onPress={onAlterar} hitSlop={8} accessibilityRole="button">
            <Text style={styles.alterar}>{t('encomendaEditar')}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ARTIGO A ARTIGO, cada um na sua linha, com a quantidade destacada.
          É o que o motorista lê dentro da loja, com uma mão no telemóvel: um
          parágrafo corrido obriga-o a procurar onde acaba uma coisa e começa
          a outra, e é assim que se esquece a terceira.
          As encomendas pedidas antes de 21/09/2026 não têm artigos — dessas
          mostra-se o texto, que é tudo o que delas se sabe. */}
      {Array.isArray(itens) && itens.length ? (
        <View style={styles.itens}>
          {itens.map((i, n) => (
            <View key={n} style={styles.item}>
              <Text style={styles.quantos}>{i.quantos}×</Text>
              <Text style={styles.itemNome}>
                {i.nome}
                {i.detalhe ? <Text style={styles.itemDetalhe}> · {i.detalhe}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      ) : lista ? (
        <Text style={styles.lista}>{lista}</Text>
      ) : null}

      {/* A LOJA PELO NOME. O ponto no mapa já está no percurso da viagem; o que
          falta ali é qual das lojas daquele quarteirão. */}
      {loja ? (
        <View style={styles.loja}>
          <Icone nome="pin" tamanho={16} cor={colors.acentoCarry} />
          <Text style={styles.lojaTexto}>{loja}</Text>
        </View>
      ) : null}

      <View style={styles.linhas}>
        <Linha rotulo={t('encomendaTeto')} valor={dolares(teto)} />
        {taxa ? <Linha rotulo={t('encomendaTaxaRotulo')} valor={dolares(taxa)} /> : null}
        {compras != null ? <Linha rotulo={t('encomendaCompras')} valor={dolares(compras)} /> : null}
        {total != null ? <Linha rotulo={t('encomendaTotal')} valor={dolares(total)} forte /> : null}
      </View>
    </View>
  );
}

function Linha({ rotulo, valor, forte }) {
  return (
    <View style={styles.linha}>
      <Text style={[styles.linhaRotulo, forte && styles.forte]}>{rotulo}</Text>
      <Text style={[styles.linhaValor, forte && styles.forte]}>{valor}</Text>
    </View>
  );
}

// O motorista diz quanto gastou, e mostra o talão.
//
// A FOTOGRAFIA NÃO TRAVA O REGISTO. Quem está à porta de uma loja, com a chuva
// a cair e o telemóvel numa mão, pode não conseguir fotografar à primeira — e
// o valor é o que o passageiro precisa de saber para preparar o dinheiro. O
// talão pode ir a seguir; obrigar a ele aqui era trocar uma prova por uma
// entrega parada.
export function RegistarCompra({ visivel, teto, aGuardar, onFechar, onGuardar }) {
  const { t } = useI18n();
  const [valor, setValor] = useState('');
  const [foto, setFoto] = useState(null);

  const numero = Number(String(valor).replace(',', '.'));
  const valido = Number.isFinite(numero) && numero >= 0 && numero <= Number(teto);

  async function escolherFoto(daCamara) {
    const permissao = daCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;
    const r = daCamara
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    const pequena = await encolherFoto(r.assets[0].uri, { base64Original: r.assets[0].base64 });
    setFoto({ mime: 'image/jpeg', base64: pequena.base64, uri: pequena.uri });
  }

  function guardar() {
    if (!valido) {
      return Alert.alert(
        t('encomendaQuantoGastou'),
        t('encomendaAcimaDoTeto', { v: dolares(teto) })
      );
    }
    onGuardar({ valorUsd: Math.round(numero * 100) / 100, foto });
  }

  return (
    <Modal visible={!!visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <MolduraModal edges={['bottom']} style={styles.painel}>
          <View style={styles.puxador} />
          <Text style={styles.painelTitulo}>{t('encomendaQuantoGastou')}</Text>
          <Text style={styles.painelNota}>{t('encomendaAteGastar', { v: dolares(teto) })}</Text>

          <TextField
            label={t('encomendaValor')}
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            icone="dinheiro"
            autoFocus
          />

          <Text style={styles.rotulo}>{t('encomendaTalao')}</Text>
          <Text style={styles.nota}>{t('encomendaTalaoNota')}</Text>
          {foto ? (
            <Image source={{ uri: foto.uri }} style={styles.talao} resizeMode="cover" />
          ) : null}
          <View style={styles.botoesFoto}>
            <Button
              title={t('cargaFotoCamera')}
              icone="📷"
              variant="secondary"
              onPress={() => escolherFoto(true)}
              style={styles.metade}
            />
            <Button
              title={t('cargaFotoGaleria')}
              icone="🖼️"
              variant="secondary"
              onPress={() => escolherFoto(false)}
              style={styles.metade}
            />
          </View>

          <Button
            title={t('encomendaGuardar')}
            onPress={guardar}
            loading={aGuardar}
            disabled={!valor.trim()}
            style={styles.guardar}
          />
          <Button title={t('cancel')} variant="ghost" onPress={onFechar} />
        </MolduraModal>
      </View>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      backgroundColor: colors.tintaCarry,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    icone: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.acentoCarry,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: { ...tipo.corpoForte, color: colors.text, flex: 1 },
    alterar: { ...tipo.corpoForte, color: colors.acentoCarry },
    lista: { ...tipo.corpo, color: colors.text },
    itens: { gap: spacing.xs },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    quantos: { ...tipo.corpoForte, color: colors.acentoCarry, minWidth: 28 },
    itemNome: { ...tipo.corpo, color: colors.text, flex: 1 },
    itemDetalhe: { ...tipo.legenda, color: colors.textMuted },
    loja: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    lojaTexto: { ...tipo.legenda, color: colors.text, flex: 1 },
    linhas: { gap: 2 },
    linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    linhaRotulo: { ...tipo.legenda, color: colors.textMuted },
    linhaValor: { ...tipo.legenda, color: colors.text },
    forte: { ...tipo.corpoForte, color: colors.text },

    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    painel: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    puxador: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.sm,
    },
    painelTitulo: { ...tipo.titulo, color: colors.text },
    painelNota: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    rotulo: { ...tipo.corpoForte, color: colors.text, marginTop: spacing.sm },
    nota: { ...tipo.legenda, color: colors.textMuted },
    talao: { width: '100%', height: 160, borderRadius: radius.md, marginTop: spacing.sm },
    botoesFoto: { flexDirection: 'row', gap: spacing.sm },
    metade: { flex: 1 },
    guardar: { marginTop: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
