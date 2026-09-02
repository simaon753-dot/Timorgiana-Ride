import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import EscolherDaLista from './EscolherDaLista.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo as tipografia } from '../design/tipografia.js';

// Dar nome a um sítio que o mapa não conhece — e dizer onde ele fica.
//
// O NOME SOZINHO NÃO CHEGA, e foi isso que nos obrigou a crescer este
// formulário. O OpenStreetMap não aceita um ponto com nome e coordenadas: um
// sítio tem de estar situado na divisão administrativa. Sem isso, o que
// chegava ao painel era uma proposta que ninguém conseguia submeter.
//
// MAS QUASE TUDO VEM PREENCHIDO. As coordenadas dizem o município e o posto,
// e o OpenStreetMap costuma até saber o nome do bairro. Ao passageiro sobra
// confirmar e, se quiser, escolher o suco. Um formulário de oito campos que
// abre com seis já respondidos é outra coisa.
//
// E TUDO MENOS O NOME É OPCIONAL. Quem está com pressa escreve o nome e
// guarda, como antes. Meia contribuição vale mais do que nenhuma.

const LISTA_TIPOS = [
  'casa',
  'edificio',
  'loja',
  'restaurante',
  'escola',
  'hotel',
  'igreja',
  'mercado',
  'escritorio',
  'bairro',
  'outro',
];

// A árvore administrativa inteira, guardada depois do primeiro pedido.
//
// São 49 KB e nunca mudam durante a utilização da app. Pedi-los outra vez de
// cada vez que alguém abre um selector seria gastar rede de Díli para
// receber exactamente os mesmos bytes.
let arvoreEmCache = null;

export default function NomearLugar({ alvo, onFechar, onGuardar }) {
  const { t } = useI18n();
  const { token } = useAuth();

  const [nome, setNome] = useState('');
  const [tipoLugar, setTipoLugar] = useState(null);
  const [endereco, setEndereco] = useState('');
  const [municipio, setMunicipio] = useState(null); // { id, nome }
  const [posto, setPosto] = useState(null); // { id, nome }
  const [suco, setSuco] = useState(null); // { id, nome }
  const [aldeia, setAldeia] = useState('');

  const [arvore, setArvore] = useState(arvoreEmCache);
  const [sucosDoPosto, setSucosDoPosto] = useState([]);
  const [aldeiasConhecidas, setAldeiasConhecidas] = useState([]);
  const [aDescobrir, setADescobrir] = useState(false);
  const [aEscolher, setAEscolher] = useState(null); // 'municipio' | 'posto' | 'suco'

  // Quando abre, pergunta ao servidor onde é isto.
  useEffect(() => {
    setNome(alvo?.ponto?.label ?? '');
    setTipoLugar(null);
    setEndereco('');
    setMunicipio(null);
    setPosto(null);
    setSuco(null);
    setAldeia('');
    setSucosDoPosto([]);
    setAldeiasConhecidas([]);
    if (!alvo?.ponto) return;

    let vivo = true;
    setADescobrir(true);
    api
      .lugarAdministrativo(token, alvo.ponto.lat, alvo.ponto.lng)
      .then((r) => {
        if (!vivo) return;
        setMunicipio(r.municipio ?? null);
        setPosto(r.posto ?? null);
        setSucosDoPosto(r.sucos ?? []);
        setAldeiasConhecidas(r.aldeias ?? []);
        // O bairro que o OpenStreetMap conhece entra já escrito no campo da
        // aldeia. Está certo na maior parte de Díli, e quando não está
        // apaga-se — corrigir uma palavra custa menos do que escrever uma.
        if (r.sugestaoAldeia) setAldeia(r.sugestaoAldeia);
      })
      // Sem rede não se descobre nada, e o formulário fica todo por
      // preencher à mão. Não se mostra erro: ele veio aqui dar um nome, não
      // pedir uma morada, e essa parte continua a funcionar.
      .catch(() => {})
      .finally(() => vivo && setADescobrir(false));
    return () => {
      vivo = false;
    };
  }, [alvo, token]);

  async function garantirArvore() {
    if (arvore) return arvore;
    if (arvoreEmCache) {
      setArvore(arvoreEmCache);
      return arvoreEmCache;
    }
    try {
      const r = await api.lugarMunicipios(token);
      arvoreEmCache = r.municipios ?? [];
      setArvore(arvoreEmCache);
      return arvoreEmCache;
    } catch {
      return null;
    }
  }

  // As opções de cada selector, sempre derivadas do que está escolhido acima.
  const postosDoMunicipio = useMemo(() => {
    if (!arvore || !municipio) return [];
    return arvore.find((m) => m.id === municipio.id)?.postos ?? [];
  }, [arvore, municipio]);

  const sucosVisiveis = useMemo(() => {
    if (posto && postosDoMunicipio.length) {
      const p = postosDoMunicipio.find((x) => x.id === posto.id);
      if (p) return p.sucos;
    }
    return sucosDoPosto;
  }, [posto, postosDoMunicipio, sucosDoPosto]);

  // As aldeias que já foram escritas no suco escolhido.
  const sugestoesDeAldeia = useMemo(() => {
    if (!suco) return [];
    return aldeiasConhecidas
      .filter((a) => a.suco === suco.nome && a.aldeia !== aldeia)
      .map((a) => a.aldeia)
      .slice(0, 6);
  }, [aldeiasConhecidas, suco, aldeia]);

  if (!alvo) return null;
  const limpo = nome.trim();
  const p = alvo.ponto;

  function abrirSelector(qual) {
    garantirArvore();
    setAEscolher(qual);
  }

  const opcoesDoSelector =
    aEscolher === 'municipio'
      ? (arvore ?? [])
      : aEscolher === 'posto'
        ? postosDoMunicipio
        : aEscolher === 'suco'
          ? sucosVisiveis
          : [];

  const tituloDoSelector =
    aEscolher === 'municipio'
      ? t('lugarMunicipio')
      : aEscolher === 'posto'
        ? t('lugarPosto')
        : t('lugarSuco');

  const valorDoSelector =
    aEscolher === 'municipio' ? municipio?.nome : aEscolher === 'posto' ? posto?.nome : suco?.nome;

  function escolhido(item) {
    if (aEscolher === 'municipio') {
      setMunicipio({ id: item.id, nome: item.nome });
      // Trocar de município invalida o que está por baixo. Deixar o posto
      // de Díli debaixo do município de Baucau seria guardar uma morada que
      // não existe.
      setPosto(null);
      setSuco(null);
      setSucosDoPosto([]);
    } else if (aEscolher === 'posto') {
      setPosto({ id: item.id, nome: item.nome });
      setSuco(null);
      setSucosDoPosto(item.sucos ?? []);
    } else {
      setSuco({ id: item.id, nome: item.nome });
    }
    setAEscolher(null);
  }

  function guardar() {
    onGuardar(limpo, tipoLugar, {
      endereco: endereco.trim() || null,
      municipio: municipio?.nome ?? null,
      posto: posto?.nome ?? null,
      suco: suco?.nome ?? null,
      aldeia: aldeia.trim() || null,
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFechar}>
      {/* O teclado tapava o campo por completo: escrevia-se às cegas.
          Com isto, a folha sobe com ele. */}
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={estilosNome.fundo} onPress={onFechar} />
        <View style={estilosNome.folha}>
          <View style={estilosNome.pega} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
          >
            <Text style={estilosNome.titulo}>{t('lugarCorrigirTitulo')}</Text>
            <Text style={estilosNome.explica}>{t('lugarCorrigirExplica')}</Text>

            <Text style={estilosNome.rotulo}>{t('lugarCorrigirCampo')}</Text>
            <TextInput
              style={estilosNome.campo}
              value={nome}
              onChangeText={setNome}
              autoFocus
              selectTextOnFocus
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            {/* O tipo de sítio, na linguagem do OpenStreetMap mas em palavras
              que se reconhecem. É o que falta saber a quem for acrescentar:
              sem isto, o nome sozinho não diz se é uma loja ou um bairro.
              Opcional de propósito — quem não souber, salta. */}
            <Text style={estilosNome.rotulo}>{t('lugarQueTipo')}</Text>
            <View style={estilosNome.tipos}>
              {LISTA_TIPOS.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setTipoLugar(tipoLugar === x ? null : x)}
                  style={[estilosNome.tipo, tipoLugar === x && estilosNome.tipoActivo]}
                >
                  <Text
                    style={[estilosNome.tipoTexto, tipoLugar === x && estilosNome.tipoTextoActivo]}
                  >
                    {t('tipo' + x.charAt(0).toUpperCase() + x.slice(1))}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={estilosNome.separador} />

            <View style={estilosNome.cabecalhoSeccao}>
              <Text style={estilosNome.seccao}>{t('lugarMorada')}</Text>
              {aDescobrir ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            </View>
            <Text style={estilosNome.explica}>
              {aDescobrir ? t('lugarADescobrir') : t('lugarMoradaExplica')}
            </Text>

            <Text style={estilosNome.rotulo}>
              {t('lugarEndereco')} · {t('lugarOpcional')}
            </Text>
            <TextInput
              style={estilosNome.campo}
              value={endereco}
              onChangeText={setEndereco}
              placeholder={t('lugarEnderecoDica')}
              placeholderTextColor={colors.textMuted}
            />

            <Escolha
              rotulo={t('lugarMunicipio')}
              valor={municipio?.nome}
              porPreencher={t('lugarPorPreencher')}
              onPress={() => abrirSelector('municipio')}
            />
            <Escolha
              rotulo={t('lugarPosto')}
              valor={posto?.nome}
              porPreencher={t('lugarPorPreencher')}
              onPress={() => municipio && abrirSelector('posto')}
              inactivo={!municipio}
            />
            <Escolha
              rotulo={t('lugarSuco')}
              valor={suco?.nome}
              porPreencher={posto ? t('lugarPorPreencher') : t('lugarEscolhaPostoPrimeiro')}
              onPress={() => posto && abrirSelector('suco')}
              inactivo={!posto}
            />

            <Text style={estilosNome.rotulo}>
              {t('lugarAldeia')} · {t('lugarOpcional')}
            </Text>
            <TextInput
              style={estilosNome.campo}
              value={aldeia}
              onChangeText={setAldeia}
              placeholder={t('lugarAldeiaDica')}
              placeholderTextColor={colors.textMuted}
            />
            {/* As aldeias que outras pessoas já escreveram neste suco.
                Não há lista oficial de aldeias em fonte legível nenhuma — nem
                no OpenStreetMap, nem no conjunto das Nações Unidas. Esta
                lista faz-se sozinha, de quem cá vive. */}
            {sugestoesDeAldeia.length ? (
              <View style={estilosNome.tipos}>
                {sugestoesDeAldeia.map((a) => (
                  <Pressable key={a} style={estilosNome.tipo} onPress={() => setAldeia(a)}>
                    <Text style={estilosNome.tipoTexto}>{a}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* As coordenadas mostram-se e não se escrevem.
                São as do ponto que ele marcou no mapa: deixá-las editáveis
                seria deixar mudar o sítio de que se está a falar, e um erro
                de um dígito põe o lugar no mar. */}
            <Text style={estilosNome.coordenadas}>
              {t('lugarCoordenadas')}: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
            </Text>
          </ScrollView>

          <Pressable
            style={[estilosNome.botao, limpo.length < 2 && estilosNome.botaoInactivo]}
            disabled={limpo.length < 2}
            onPress={guardar}
          >
            <Text style={estilosNome.botaoTexto}>{t('lugarGuardar')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <EscolherDaLista
        visivel={aEscolher != null}
        titulo={tituloDoSelector}
        opcoes={opcoesDoSelector}
        valor={valorDoSelector}
        t={t}
        onEscolher={escolhido}
        onFechar={() => setAEscolher(null)}
      />
    </Modal>
  );
}

// Uma linha que abre um selector. Mostra o que está escolhido, ou convida a
// escolher.
function Escolha({ rotulo, valor, porPreencher, onPress, inactivo }) {
  return (
    <View>
      <Text style={estilosNome.rotulo}>{rotulo}</Text>
      <Pressable
        style={[estilosNome.campo, estilosNome.escolha, inactivo && estilosNome.escolhaInactiva]}
        onPress={onPress}
        disabled={inactivo}
        accessibilityRole="button"
      >
        <Text style={valor ? estilosNome.escolhaValor : estilosNome.escolhaVazia}>
          {valor || porPreencher}
        </Text>
      </Pressable>
    </View>
  );
}

const criarEstilosNome = () =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    folha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      // Deixa ver o mapa por trás. Uma folha que ocupa o ecrã todo deixa de
      // parecer uma folha e passa a parecer outro ecrã — e perde-se a noção
      // de que se está a falar daquele ponto ali atrás.
      maxHeight: '85%',
    },
    pega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    titulo: { ...tipografia.subtitulo, color: colors.text },
    explica: { ...tipografia.pequeno, color: colors.textMuted },
    rotulo: { ...tipografia.legenda, color: colors.textMuted, marginTop: spacing.sm },
    campo: {
      ...tipografia.corpo,
      color: colors.text,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    escolha: { justifyContent: 'center', minHeight: 48 },
    escolhaInactiva: { opacity: 0.5 },
    escolhaValor: { ...tipografia.corpo, color: colors.text },
    escolhaVazia: { ...tipografia.corpo, color: colors.textMuted },
    separador: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    cabecalhoSeccao: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    seccao: { ...tipografia.corpoForte, color: colors.text },
    coordenadas: { ...tipografia.pequeno, color: colors.textMuted, marginTop: spacing.md },
    botao: {
      backgroundColor: colors.coral,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    tipo: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
    },
    tipoActivo: { borderColor: colors.teal, backgroundColor: colors.teal },
    tipoTexto: { ...tipografia.pequeno, color: colors.textMuted },
    tipoTextoActivo: { color: colors.onTeal },
    botaoInactivo: { opacity: 0.4 },
    botaoTexto: { ...tipografia.corpoForte, color: '#22100A' },
  });

let estilosNome = criarEstilosNome();
registarEstilos(() => {
  estilosNome = criarEstilosNome();
});
