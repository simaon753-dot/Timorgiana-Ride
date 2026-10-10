import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button.js';
import TextField from './TextField.js';
import EscolherDaLista from './EscolherDaLista.js';
import Chip from '../design/Chip.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

// «AJUDE A MELHORAR O MAPA» (10/10/2026, pedido do Simão). Depois de uma viagem
// concluída, um convite discreto; quem aceitar responde a perguntas sobre o
// sítio onde a viagem acabou, UMA DE CADA VEZ, e pode parar quando quiser.
//
// O servidor decide o que perguntar (backend/src/mapaComunidade.js): sem
// perguntas — já respondeu ali, contribuiu há pouco, ou disse «Agora não» —
// o convite nem aparece. O que já se sabe pergunta-se só para CONFIRMAR.
// Cada resposta é enviada logo: parar a meio não perde nada. Tudo é visto no
// painel antes de entrar no HAKAT Maps, e quem contribuiu não aparece.
const CATEGORIA_ROTULO = {
  shop: 'mapaCatLoja',
  restaurant: 'mapaCatRestaurante',
  school: 'mapaCatEscola',
  clinic: 'mapaCatSaude',
  church: 'mapaCatIgreja',
  hotel: 'mapaCatHotel',
  escritorio: 'mapaCatEscritorio',
  building: 'mapaCatEdificio',
  other: 'mapaCatOutro',
};

export default function AjudarMapa({ ride }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const [perguntas, setPerguntas] = useState(null);
  const [fase, setFase] = useState('convite'); // convite | perguntas | fim | fechado
  const [i, setI] = useState(0);
  const [aEscrever, setAEscrever] = useState(false); // «Não, é outro»
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [problemas, setProblemas] = useState([]);
  const [lista, setLista] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState(null);
  const [respondidas, setRespondidas] = useState(0);

  useEffect(() => {
    let vivo = true;
    if (ride?.status !== 'completed' || !token) return undefined;
    api
      .perguntasMapa(token, ride.id)
      .then((r) => vivo && setPerguntas(r?.perguntas || []))
      .catch(() => vivo && setPerguntas([]));
    return () => {
      vivo = false;
    };
  }, [ride?.id, ride?.status, token]);

  if (!perguntas?.length || fase === 'fechado') return null;
  const p = perguntas[i];
  const total = perguntas.length;

  function limpar() {
    setAEscrever(false);
    setTexto('');
    setCategoria(null);
    setProblemas([]);
    setErro(null);
  }
  function seguinte() {
    limpar();
    if (i + 1 >= total) setFase('fim');
    else setI(i + 1);
  }
  async function enviar(corpo) {
    setAEnviar(true);
    setErro(null);
    try {
      await api.responderMapa(token, { rideId: ride.id, tipo: p.tipo, ...corpo });
      setRespondidas((n) => n + 1);
      seguinte();
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAEnviar(false);
    }
  }
  function agoraNao() {
    setFase('fechado');
    api.adiarMapa(token).catch(() => {});
  }

  // ── O convite, debaixo da avaliação.
  const convite = (
    <View style={styles.cartao}>
      <View style={styles.cabeca}>
        <Icone nome="mapa" tamanho={22} cor={colors.teal} />
        <Text style={styles.cartaoTitulo}>{t('mapaAjudarTitulo')}</Text>
      </View>
      <Text style={styles.cartaoTexto}>{t('mapaAjudarTexto')}</Text>
      <View style={styles.botoes}>
        <View style={{ flex: 1 }}>
          <Button
            title={t('mapaContribuir')}
            variant="secondary"
            onPress={() => setFase('perguntas')}
          />
        </View>
        <Pressable
          onPress={agoraNao}
          style={styles.agoraNao}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.agoraNaoTexto}>{t('mapaAgoraNao')}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (fase === 'convite') return convite;

  const temConhecido = !!p?.conhecido && !aEscrever && p.tipo !== 'problema';
  const comLista = !!p?.opcoes?.length && p.tipo !== 'problema';

  return (
    <>
      {fase === 'fim' ? (
        <View style={styles.cartao}>
          <View style={styles.cabeca}>
            <Icone nome="visto" tamanho={22} cor={colors.teal} />
            <Text style={styles.cartaoTitulo}>{t('mapaObrigado')}</Text>
          </View>
          <Text style={styles.cartaoTexto}>
            {t(respondidas ? 'mapaObrigadoTexto' : 'mapaSemRespostas')}
          </Text>
        </View>
      ) : (
        convite
      )}
      <Modal
        visible={fase === 'perguntas'}
        transparent
        animationType="slide"
        onRequestClose={() => setFase('fim')}
      >
        <KeyboardAvoidingView
          style={styles.cortina}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.folha, { paddingBottom: bottom + spacing.md }]}>
            <View style={styles.topo}>
              <Text style={styles.progresso}>{t('mapaProgresso', { n: i + 1, total })}</Text>
              <Pressable
                onPress={() => setFase('fim')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('mapaParar')}
              >
                <Icone nome="fechar" tamanho={22} cor={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.corpo}>
              <Text style={styles.pergunta}>{t('mapaP_' + p.tipo)}</Text>

              {temConhecido ? (
                <>
                  <Text style={styles.conhecido}>{t('mapaPensamos', { valor: p.conhecido })}</Text>
                  <Button
                    title={t('mapaSimCerto')}
                    variant="secondary"
                    loading={aEnviar}
                    onPress={() => enviar({ resposta: p.conhecido, confirmou: true })}
                  />
                  <View style={{ height: spacing.sm }} />
                  <Button
                    title={t('mapaNaoOutro')}
                    variant="ghost"
                    onPress={() => setAEscrever(true)}
                  />
                </>
              ) : p.tipo === 'problema' ? (
                <View style={styles.chips}>
                  {p.opcoes.map((o) => (
                    <Chip
                      key={o}
                      texto={t('mapaProb_' + o)}
                      activo={problemas.includes(o)}
                      onPress={() =>
                        setProblemas((l) => (l.includes(o) ? l.filter((x) => x !== o) : [...l, o]))
                      }
                    />
                  ))}
                </View>
              ) : (
                <>
                  {comLista ? (
                    <Pressable
                      style={styles.escolher}
                      onPress={() => setLista(true)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.escolherTexto, !texto && { color: colors.textMuted }]}>
                        {texto || t('mapaEscolherLista')}
                      </Text>
                      <Icone nome="seta" tamanho={16} cor={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <TextField
                      label={t('mapaResposta')}
                      value={texto}
                      onChangeText={setTexto}
                      placeholder={t('mapaEscreva')}
                      autoCapitalize="words"
                    />
                  )}
                  {p.tipo === 'local' ? (
                    <>
                      <Text style={styles.rotulo}>{t('mapaCategoria')}</Text>
                      <View style={styles.chips}>
                        {(p.categorias || []).map((c) => (
                          <Chip
                            key={c}
                            texto={t(CATEGORIA_ROTULO[c] || 'mapaCatOutro')}
                            activo={categoria === c}
                            onPress={() => setCategoria(c)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </>
              )}

              {erro ? <Text style={styles.erro}>{erro}</Text> : null}

              <View style={styles.rodape}>
                {!temConhecido && p.tipo !== 'problema' ? (
                  <Button
                    title={t('mapaSeguinte')}
                    variant="secondary"
                    loading={aEnviar}
                    disabled={!texto.trim()}
                    onPress={() => enviar({ resposta: texto, categoria })}
                  />
                ) : null}
                {p.tipo === 'problema' ? (
                  <Button
                    title={t('mapaEnviar')}
                    variant="secondary"
                    loading={aEnviar}
                    disabled={!problemas.length}
                    onPress={() => enviar({ problemas })}
                  />
                ) : null}
                <View style={styles.secundarios}>
                  {p.tipo !== 'problema' ? (
                    <Pressable
                      onPress={() => enviar({ naoSei: true })}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.ligacao}>{t('mapaNaoSei')}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={seguinte} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.ligacao}>{t('mapaSaltar')}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        {comLista ? (
          <EscolherDaLista
            visivel={lista}
            titulo={t('mapaP_' + p.tipo)}
            opcoes={p.opcoes.map((nome) => ({ nome }))}
            valor={texto}
            t={t}
            onEscolher={(o) => {
              setTexto(o.nome);
              setLista(false);
            }}
            onFechar={() => setLista(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevacao.plana,
    },
    cabeca: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cartaoTitulo: { ...tipo.titulo, color: colors.text, flex: 1 },
    cartaoTexto: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    botoes: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
    agoraNao: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
    agoraNaoTexto: { ...tipo.corpoForte, color: colors.textMuted },
    cortina: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    folha: {
      maxHeight: '88%',
      backgroundColor: colors.paper,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: spacing.md,
    },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    progresso: {
      ...tipo.legenda,
      color: colors.teal,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    corpo: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
    pergunta: { ...tipo.titulo, color: colors.text, marginBottom: spacing.md },
    conhecido: { ...tipo.corpo, color: colors.text, marginBottom: spacing.md },
    rotulo: {
      ...tipo.corpoForte,
      color: colors.text,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    escolher: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      marginBottom: spacing.sm,
    },
    escolherTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
    rodape: { marginTop: spacing.lg, gap: spacing.sm },
    secundarios: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      marginTop: spacing.xs,
    },
    ligacao: { ...tipo.corpoForte, color: colors.teal, paddingVertical: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
