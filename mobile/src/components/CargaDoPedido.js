import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TextField from './TextField.js';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// O QUE VAI DENTRO — as perguntas que só um pedido de Carry faz.
//
// PORQUE EXISTE. Uma viagem de pessoas descreve-se com dois pontos no mapa:
// quem vai sabe o que leva, e o motorista não precisa de saber mais. Uma
// viagem de BENS não: quem conduz tem de decidir, ANTES de aceitar, se a
// carga cabe no veículo dele e se consegue levá-la sozinho.
//
// Sem estas respostas, o motorista chega, olha para um sofá, e vai-se embora
// — com a viagem perdida para os dois e a manhã de alguém estragada.
//
// AS LISTAS SÃO FECHADAS e não texto livre. Contam-se, e ao fim de um ano
// sabe-se o que Díli manda transportar. Quem tiver outra coisa escolhe
// "outros" e explica nas observações — que é onde o texto livre pertence,
// porque aí ninguém precisa de o contar.
//
// A DECLARAÇÃO NÃO É UM AVISO. É a condição de o pedido existir: sem ela o
// botão não avança. Um aviso que se pode ignorar não diz nada sobre quem o
// leu; uma caixa que trava o pedido regista que aquela pessoa, naquele
// instante, declarou aquilo — e o servidor guarda a HORA, não um "sim".

const TIPOS = [
  { id: 'compras', chave: 'cargaCompras' },
  { id: 'moveis', chave: 'cargaMoveis' },
  { id: 'caixas', chave: 'cargaCaixas' },
  { id: 'eletrodomesticos', chave: 'cargaEletrodomesticos' },
  { id: 'materiais', chave: 'cargaMateriais' },
  { id: 'mercadorias', chave: 'cargaMercadorias' },
  { id: 'outros', chave: 'cargaOutros' },
];

const VOLUMES = [
  { id: 'pequeno', chave: 'cargaVolPequeno', nota: 'cargaVolPequenoNota' },
  { id: 'medio', chave: 'cargaVolMedio', nota: 'cargaVolMedioNota' },
  { id: 'grande', chave: 'cargaVolGrande', nota: 'cargaVolGrandeNota' },
];

// Três fotografias, o mesmo tecto do servidor.
//
// Contado NOS DOIS SÍTIOS de propósito: aqui para o botão desaparecer quando
// já não faz falta, e lá para o limite existir mesmo. Um limite que só vive
// no telemóvel não é um limite — é uma sugestão a quem usa a app.
const MAX_FOTOS = 3;

const AJUDAS = [
  { id: 'nenhuma', chave: 'cargaAjudaNenhuma' },
  { id: 'carregar', chave: 'cargaAjudaCarregar' },
  { id: 'descarregar', chave: 'cargaAjudaDescarregar' },
  { id: 'ambas', chave: 'cargaAjudaAmbas' },
];

// Fichas que embrulham. Sete tipos não cabem numa linha em telemóvel nenhum,
// e uma lista vertical de sete faria o ecrã crescer sem necessidade.
function Fichas({ opcoes, valor, onEscolher, t }) {
  return (
    <View style={styles.fichas}>
      {opcoes.map((o) => {
        const activa = valor === o.id;
        return (
          <Pressable
            key={o.id}
            style={[styles.ficha, activa && styles.fichaActiva]}
            onPress={() => onEscolher(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
          >
            <Text style={[styles.fichaTexto, activa && styles.fichaTextoActivo]}>{t(o.chave)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CargaDoPedido({
  carga,
  onCarga,
  volume,
  onVolume,
  ajuda,
  onAjuda,
  notas,
  onNotas,
  declarado,
  onDeclarado,
  fotos = [],
  onFotos,
}) {
  const { t } = useI18n();
  const [aTirar, setATirar] = useState(false);

  // A CÂMARA DE TRÁS, e não a da frente.
  //
  // A única outra captura da app é a fotografia de turno, que pede
  // `CameraType.front` porque é um retrato de quem conduz. Copiar essa linha
  // para aqui punha a pessoa a fotografar a própria cara em vez dos móveis.
  // Omitir o campo dá a câmara de trás, que é a que aponta para o mundo.
  async function tirarFoto() {
    if (fotos.length >= MAX_FOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert(t('errCameraPermission'));

    setATirar(true);
    try {
      const r = await ImagePicker.launchCameraAsync({
        quality: 0.55,
        base64: true,
        allowsEditing: false,
      });
      if (r.canceled || !r.assets?.[0]?.base64) return;
      const a = r.assets[0];
      // Guardadas EM MEMÓRIA e não enviadas já: a viagem ainda não existe, e
      // sem `id` não há a que agarrar a fotografia. Sobem no fim, no ecrã.
      onFotos?.([...fotos, { uri: a.uri, base64: a.base64 }]);
    } finally {
      setATirar(false);
    }
  }

  return (
    <View>
      <Text style={styles.seccao}>{t('cargaTitulo')}</Text>
      <Fichas opcoes={TIPOS} valor={carga} onEscolher={onCarga} t={t} />

      <Text style={styles.seccao}>{t('cargaVolumeTitulo')}</Text>
      {/* O volume tem uma NOTA por baixo de cada opção, e os outros não.
          "Médio" não quer dizer nada a quem está numa loja com uma caixa na
          mão; "enche meia caixa do Carry" quer. É a diferença entre uma
          escala inventada por nós e uma medida que a pessoa consegue ver. */}
      <View style={styles.volumes}>
        {VOLUMES.map((v) => {
          const activo = volume === v.id;
          return (
            <Pressable
              key={v.id}
              style={[styles.volume, activo && styles.volumeActivo]}
              onPress={() => onVolume(v.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text style={[styles.volumeNome, activo && styles.volumeNomeActivo]}>
                {t(v.chave)}
              </Text>
              <Text style={styles.volumeNota}>{t(v.nota)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.seccao}>{t('cargaAjudaTitulo')}</Text>
      <Fichas opcoes={AJUDAS} valor={ajuda} onEscolher={onAjuda} t={t} />

      <Text style={styles.seccao}>{t('cargaNotasTitulo')}</Text>
      <TextField
        value={notas}
        onChangeText={onNotas}
        placeholder={t('cargaNotasExemplo')}
        multiline
      />

      {/* AS FOTOGRAFIAS, depois das observações e antes da declaração.
          As três primeiras perguntas — o quê, quanto, que ajuda — são a
          decisão, e ficam juntas. A fotografia e as observações são a mesma
          família: o pormenor que se acrescenta se houver. E a declaração
          continua a ser a última coisa antes do botão, porque é o portão.

          Valem mais do que as observações e por isso vêm depois delas: é o que
          fica mais perto do olho quando se acaba de ler o ecrã. "Uma cómoda"
          escrito são duas palavras; a cómoda fotografada mostra que é alta
          demais para a caixa, coisa que nenhuma lista de volumes ia dizer. */}
      <Text style={styles.seccao}>{t('cargaFotosTitulo')}</Text>
      <Text style={styles.fotosNota}>{t('cargaFotosNota')}</Text>
      <View style={styles.fotos}>
        {fotos.map((f, i) => (
          <View key={f.uri} style={styles.foto}>
            <Image
              source={{ uri: f.uri }}
              style={styles.fotoImagem}
              accessibilityIgnoresInvertColors
            />
            {/* O ✕ é pequeno à vista e grande ao dedo: 26 de largura com
                `hitSlop` de 9 dá os 44 que um dedo precisa. Desenhá-lo com 44
                tapava a fotografia que ele serve para remover. */}
            <Pressable
              style={styles.fotoRemover}
              hitSlop={9}
              onPress={() => onFotos?.(fotos.filter((_, j) => j !== i))}
              accessibilityRole="button"
              accessibilityLabel={t('cargaFotoRemover')}
            >
              <Text style={styles.fotoRemoverTexto}>✕</Text>
            </Pressable>
          </View>
        ))}
        {fotos.length < MAX_FOTOS ? (
          <Pressable
            style={styles.fotoAdd}
            onPress={tirarFoto}
            disabled={aTirar}
            accessibilityRole="button"
            accessibilityLabel={t('cargaFotoTirar')}
          >
            <Text style={styles.fotoAddIcone}>📷</Text>
          </Pressable>
        ) : null}
      </View>

      {/* A declaração, à vista e por marcar. Ver a nota no topo do ficheiro. */}
      <Pressable
        style={styles.declaracao}
        onPress={() => onDeclarado(!declarado)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: declarado }}
      >
        <View style={[styles.caixa, declarado && styles.caixaMarcada]}>
          {declarado ? <Text style={styles.visto}>✓</Text> : null}
        </View>
        <Text style={styles.declaracaoTexto}>{t('cargaDeclaracao')}</Text>
      </Pressable>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    ficha: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      minHeight: 44,
      justifyContent: 'center',
    },
    fichaActiva: { backgroundColor: colors.teal, borderColor: colors.teal },
    fichaTexto: { ...tipo.pequeno, color: colors.text },
    fichaTextoActivo: { color: colors.onTeal, fontWeight: '700' },

    volumes: { gap: spacing.sm },
    volume: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 56,
      justifyContent: 'center',
    },
    volumeActivo: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    volumeNome: { ...tipo.corpoForte, color: colors.text },
    volumeNomeActivo: { color: colors.teal },
    volumeNota: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },

    fotosNota: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginTop: -4,
      marginBottom: spacing.sm,
    },
    fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    foto: { width: 78, height: 78 },
    fotoImagem: { width: 78, height: 78, borderRadius: radius.md, backgroundColor: colors.border },
    fotoRemover: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fotoRemoverTexto: { color: colors.white, fontSize: 13, lineHeight: 15 },
    fotoAdd: {
      width: 78,
      height: 78,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.teal,
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fotoAddIcone: { fontSize: 26 },

    declaracao: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginTop: spacing.lg,
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    caixa: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    caixaMarcada: { backgroundColor: colors.teal },
    visto: { color: colors.white, fontWeight: '900', fontSize: 14, lineHeight: 16 },
    declaracaoTexto: { ...tipo.pequeno, color: colors.text, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
