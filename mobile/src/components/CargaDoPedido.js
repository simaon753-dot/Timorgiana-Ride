import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert, Modal, ScrollView } from 'react-native';
import Icone from '../design/Icone.js';
import Button from './Button.js';
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

// A lista, a ordem e os emoji são do Simão (13/09/26). A MESMA lista está no
// servidor (TIPOS_CARGA), no cartão do motorista e no painel — o
// verificar-tipos confere que as quatro coincidem.
const TIPOS = [
  { id: 'compras', chave: 'cargaCompras', emoji: '🛒' },
  { id: 'caixas', chave: 'cargaCaixas', emoji: '📦' },
  { id: 'moveis', chave: 'cargaMoveis', emoji: '🪑' },
  { id: 'mudanca', chave: 'cargaMudanca', emoji: '🏠' },
  { id: 'eletrodomesticos', chave: 'cargaEletrodomesticos', emoji: '🧊' },
  { id: 'materiais', chave: 'cargaMateriais', emoji: '🔨' },
  { id: 'mercadorias', chave: 'cargaMercadorias', emoji: '🏪' },
  { id: 'outros', chave: 'cargaOutros', emoji: '📦' },
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

// OS TIPOS EM MOSAICO, com o emoji grande. Pedido do Simão: "aumentar os
// ícones". Duas colunas: oito tipos em fichas de texto obrigavam a ler cada
// palavra; com o desenho grande reconhece-se o tipo de relance.
//
// UM OU MAIS (14/09/26): uma ida à loja traz compras E um electrodoméstico.
// `valor` é a lista; tocar num tipo junta-o ou tira-o. O primeiro escolhido é
// o principal, e é esse que o servidor guarda em `carga_tipo`.
function TiposCarga({ valor = [], onEscolher, t }) {
  return (
    <View style={styles.tiposCarga}>
      {TIPOS.map((o) => {
        const activo = valor.includes(o.id);
        return (
          <Pressable
            key={o.id}
            style={[styles.tipoCarga, activo && styles.tipoCargaActivo]}
            onPress={() => onEscolher(o.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={t(o.chave)}
          >
            <Text style={styles.tipoCargaEmoji}>{o.emoji}</Text>
            <Text
              style={[styles.tipoCargaNome, activo && styles.tipoCargaNomeActivo]}
              numberOfLines={2}
            >
              {t(o.chave)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CargaDoPedido({
  carga = [],
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
  paragens = [],
  onRemoverParagem,
  onAdicionarParagem,
  maxParagens = 2,
  outro = '',
  onOutro,
}) {
  const { t } = useI18n();
  const [aTirar, setATirar] = useState(false);
  const [verProibidos, setVerProibidos] = useState(false);

  // A CÂMARA DE TRÁS, e não a da frente.
  //
  // A única outra captura da app é a fotografia de turno, que pede
  // `CameraType.front` porque é um retrato de quem conduz. Copiar essa linha
  // para aqui punha a pessoa a fotografar a própria cara em vez dos móveis.
  // Omitir o campo dá a câmara de trás, que é a que aponta para o mundo.
  //
  // DA GALERIA TAMBÉM (14/09/26): quem está na loja tira a fotografia na
  // hora, mas quem pede a mudança de casa já tem as fotografias dos móveis.
  // O mesmo pacote (expo-image-picker) faz as duas coisas — não há nada novo
  // para compilar. A galeria não pede autorização: o sistema abre o seu
  // próprio selector e só entrega a fotografia escolhida.
  async function tirarFoto(daGaleria = false) {
    if (fotos.length >= MAX_FOTOS) return;
    if (!daGaleria) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert(t('errCameraPermission'));
    }

    setATirar(true);
    try {
      const opcoes = { quality: 0.55, base64: true, allowsEditing: false };
      const r = daGaleria
        ? await ImagePicker.launchImageLibraryAsync({ ...opcoes, mediaTypes: ['images'] })
        : await ImagePicker.launchCameraAsync(opcoes);
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
      <Text style={styles.seccao}>{t('cargaTiposTitulo')}</Text>
      <Text style={styles.fotosNota}>{t('cargaTiposNota')}</Text>
      <TiposCarga valor={carga} onEscolher={onCarga} t={t} />
      {/* "Outro" obriga a escrever o quê — o botão de pedir espera por isso. */}
      {carga.includes('outros') ? (
        <View style={{ marginTop: spacing.sm }}>
          <TextField
            label={t('cargaOutroTitulo')}
            value={outro}
            onChangeText={onOutro}
            placeholder={t('cargaOutroExemplo')}
          />
        </View>
      ) : null}

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

      {/* AS PARAGENS, depois das tres perguntas de decisao e antes do
          detalhe. O que e, quanto e e que ajuda leva decidem se o motorista
          aceita; onde passa pelo caminho decide quanto tempo lhe custa — e e
          por isso que vem logo a seguir, e nao no fim com as observacoes.

          Escolhem-se por PESQUISA e nao por toque no mapa. O ecra ja tem uma
          maquina de toques que decide entre recolha e destino e que recusa
          tocar em mais nada depois dos dois postos — foi uma correcao de um
          defeito real, em que um toque solto substituia o destino. Um
          terceiro alvo naquela maquina reabria essa porta. */}
      <Text style={styles.seccao}>{t('paragensTitulo')}</Text>
      <Text style={styles.fotosNota}>{t('paragensNota')}</Text>
      {paragens.map((p, i) => (
        <View key={`${p.lat},${p.lng},${i}`} style={styles.paragem}>
          <Text style={styles.paragemNumero}>{i + 1}</Text>
          <Text style={styles.paragemNome} numberOfLines={1}>
            {p.label}
          </Text>
          <Pressable
            onPress={() => onRemoverParagem?.(i)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('paragemRemover')}
          >
            <Text style={styles.paragemX}>✕</Text>
          </Pressable>
        </View>
      ))}
      {paragens.length < maxParagens ? (
        <Pressable
          style={styles.paragemAdd}
          onPress={() => onAdicionarParagem?.()}
          accessibilityRole="button"
          accessibilityLabel={t('paragemAdicionar')}
        >
          <Text style={styles.paragemAddTexto}>+ {t('paragemAdicionar')}</Text>
        </Pressable>
      ) : null}

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
          <>
            <Pressable
              style={styles.fotoAdd}
              onPress={() => tirarFoto(false)}
              disabled={aTirar}
              accessibilityRole="button"
              accessibilityLabel={t('cargaFotoCamera')}
            >
              <Icone nome="camera" tamanho={26} cor={colors.teal} />
              <Text style={styles.fotoAddTexto}>{t('cargaFotoCamera')}</Text>
            </Pressable>
            <Pressable
              style={styles.fotoAdd}
              onPress={() => tirarFoto(true)}
              disabled={aTirar}
              accessibilityRole="button"
              accessibilityLabel={t('cargaFotoGaleria')}
            >
              <Icone nome="galeria" tamanho={26} cor={colors.teal} />
              <Text style={styles.fotoAddTexto}>{t('cargaFotoGaleria')}</Text>
            </Pressable>
          </>
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
      {/* A LISTA DO QUE NÃO SE LEVA, à distância de um toque da declaração.
          Declarar que os bens são "legais e seguros" sem dizer o que isso
          exclui é pedir uma assinatura em branco. */}
      <Pressable
        onPress={() => setVerProibidos(true)}
        hitSlop={8}
        style={styles.proibidosLigacao}
        accessibilityRole="button"
      >
        <Icone nome="proibido" tamanho={18} cor={colors.teal} />
        <Text style={styles.proibidosLigacaoTexto}>{t('verBensProibidos')}</Text>
      </Pressable>

      <Modal
        visible={verProibidos}
        transparent
        animationType="slide"
        onRequestClose={() => setVerProibidos(false)}
      >
        <Pressable style={styles.proibidosFundo} onPress={() => setVerProibidos(false)} />
        <View style={styles.proibidosFolha}>
          <View style={styles.proibidosPega} />
          <Text style={styles.proibidosTitulo}>{t('bensProibidosTitulo')}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {PROIBIDOS.map((k) => (
              <View key={k} style={styles.proibidoLinha}>
                <Icone nome="proibido" tamanho={20} cor={colors.danger} />
                <Text style={styles.proibidoTexto}>{t(k)}</Text>
              </View>
            ))}
            <Text style={styles.proibidosNota}>{t('bensProibidosNota')}</Text>
          </ScrollView>
          <Button
            title={t('admFechar')}
            variant="secondary"
            onPress={() => setVerProibidos(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

// O que não se transporta. A lista é um rascunho para o Simão rever — não
// proíbe animais de propósito: levar porcos ou galinhas numa caixa de Carry é
// uma das coisas para que o Carry serve em Timor.
const PROIBIDOS = [
  'bensProibidos1',
  'bensProibidos2',
  'bensProibidos3',
  'bensProibidos4',
  'bensProibidos5',
  'bensProibidos6',
  'bensProibidos7',
];

// As listas, para o resumo do pedido as poder nomear sem as repetir.
export const TIPOS_CARGA_LISTA = TIPOS;
export const AJUDAS_CARGA_LISTA = AJUDAS;
export const VOLUMES_CARGA_LISTA = VOLUMES;

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

    tiposCarga: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tipoCarga: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 60,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    tipoCargaActivo: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    tipoCargaEmoji: { fontSize: 30, lineHeight: 38 },
    tipoCargaNome: { ...tipo.pequeno, color: colors.text, flex: 1 },
    tipoCargaNomeActivo: { ...tipo.corpoForte, fontSize: 13.5, color: colors.teal },
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

    paragem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      minHeight: 48,
    },
    // O NÚMERO É TEAL E NÃO CORAL, e a razão não é estética.
    //
    // Escrevi um token `onCoral` por simetria com o `onTeal` que uso aqui ao
    // lado. Não existe — e o verificador disse o que isso daria: número
    // transparente dentro de um círculo coral. Uma bolinha vazia.
    //
    // Não inventei um token novo. O tema diz que sobre coral o texto tem de
    // ser ESCURO (6,5:1, nota na linha 23), e em modo escuro o token `white`
    // vale #1C1C1E — ou seja, qualquer escolha minha acertava num modo e
    // falhava no outro, e eu não tenho como ver os dois.
    //
    // O par teal/onTeal já está definido para ambos e já é usado nas fichas
    // deste ficheiro. O pino no mapa continua coral: essa é a paleta do
    // mapa, esta é a da interface.
    paragemNumero: {
      ...tipo.pequeno,
      color: colors.onTeal,
      backgroundColor: colors.teal,
      width: 22,
      height: 22,
      borderRadius: 11,
      textAlign: 'center',
      lineHeight: 22,
      fontWeight: '700',
      overflow: 'hidden',
    },
    paragemNome: { ...tipo.pequeno, color: colors.text, flex: 1 },
    paragemX: { ...tipo.pequeno, color: colors.textMuted },
    paragemAdd: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.teal,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    paragemAddTexto: { ...tipo.pequeno, color: colors.teal, fontWeight: '700' },

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
      width: 96,
      height: 78,
      gap: 2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.teal,
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fotoAddTexto: { ...tipo.legenda, fontSize: 11, color: colors.teal, textAlign: 'center' },
    proibidosLigacao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      minHeight: 40,
      marginTop: spacing.xs,
    },
    proibidosLigacaoTexto: { ...tipo.corpoForte, fontSize: 14, color: colors.teal },
    proibidosFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    proibidosFolha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    proibidosPega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    proibidosTitulo: { ...tipo.titulo, color: colors.text, marginBottom: spacing.xs },
    proibidoLinha: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    proibidoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    proibidosNota: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.sm },

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
