import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import RodapeMarca from '../design/RodapeMarca.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import EscolherPonto from '../components/EscolherPonto.js';
import { tipo } from '../design/tipografia.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// ENCOMENDA — o primeiro passo do jastip (20/09/2026).
//
// PORQUE É UM ECRÃ À PARTE, e não mais perguntas no ecrã do preço: uma
// encomenda define-se por coisas que nenhuma viagem pergunta — o que comprar e
// até quanto gastar. E define-se ANTES de haver preço, porque é o teto que
// decide a taxa do serviço.
//
// OS DOIS LUGARES PERGUNTAM-SE AQUI, e é a diferença que mais confunde se
// ficar por explicar: numa encomenda a ORIGEM é a LOJA (é lá que o motorista
// vai comprar) e o DESTINO é onde entregar. Numa viagem normal a origem é
// quem pede; aqui, não. Por isso o ecrã pergunta os dois pelo nome — "onde
// comprar" e "onde entregar" — e o ecrã do preço recebe-os feitos.
//
// QUEM AINDA NÃO PODE, SABE QUANTO FALTA. Quem adianta dinheiro é o motorista;
// a app pede um historial de viagens a quem encomenda. Dizer só "não podes"
// seria uma porta sem maçaneta: diz-se quantas faltam.

const TETOS = [5, 10, 15, 25, 50];
const dolares = (v) => `$${Number(v || 0).toFixed(2)}`;

export default function EncomendaScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [regras, setRegras] = useState(null);
  const [lista, setLista] = useState('');
  const [teto, setTeto] = useState(null);
  const [loja, setLoja] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [aApontar, setAApontar] = useState(null); // 'loja' | 'entrega'
  const [aLocalizar, setALocalizar] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .regrasDaEncomenda(token)
      .then((r) => {
        if (!vivo) return;
        setRegras(r);
        // O teto começa no maior que a regra permite dos valores redondos: é
        // o que as pessoas escolhem quase sempre, e baixá-lo é um toque.
        const possiveis = TETOS.filter((v) => v <= r.tetoMax);
        setTeto(possiveis[possiveis.length - 1] ?? r.tetoMax);
      })
      .catch(() => vivo && setRegras({ erro: true }));
    return () => {
      vivo = false;
    };
  }, [token]);

  // A minha localização, para o caso normal: entregar onde estou.
  async function usarAMinhaLocalizacao() {
    setALocalizar(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      const nome = await nomeDoLugar(lat, lng, pos.coords.accuracy, token);
      setEntrega({ lat, lng, label: nome || rotuloCoordenadas(lat, lng) });
    } finally {
      setALocalizar(false);
    }
  }

  const taxa = escalaoDe(regras, teto);
  const faltam = regras && !regras.erro ? regras.viagensMinimas - regras.viagensFeitas : 0;
  const podePedir = !!regras && !regras.erro && regras.podePedir;
  const pronto = podePedir && lista.trim() && teto && loja && entrega;

  function continuar() {
    navigation.navigate('RequestRide', {
      jastip: { lista: lista.trim(), teto },
      origem: loja,
      destino: entrega,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={styles.voltar}
          >
            <Icone nome="voltar" tamanho={22} cor={colors.text} traco={2.4} />
          </Pressable>
          <View style={styles.pastilha}>
            <Icone nome="caixa" tamanho={18} cor={colors.acentoCarry} />
            <Text style={styles.pastilhaTexto}>{t('encomendaTitulo')}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{t('encomendaTitulo')}</Text>
        <Text style={styles.subtitulo}>{t('encomendaExplica')}</Text>

        {regras == null ? (
          <ActivityIndicator style={styles.roda} color={colors.teal} />
        ) : regras.erro || !regras.ativo ? (
          <View style={styles.aviso}>
            <Icone nome="info" tamanho={18} cor={colors.textMuted} />
            <Text style={styles.avisoTexto}>{t('encomendaIndisponivel')}</Text>
          </View>
        ) : (
          <>
            {!podePedir ? (
              <View style={styles.aviso}>
                <Icone nome="aviso" tamanho={18} cor={colors.danger} />
                <Text style={styles.avisoTexto}>
                  {t('encomendaFaltam', {
                    n: regras.viagensMinimas,
                    feitas: regras.viagensFeitas,
                  })}
                </Text>
              </View>
            ) : null}

            <Text style={styles.seccao}>{t('encomendaLista')}</Text>
            <TextField
              value={lista}
              onChangeText={setLista}
              placeholder={t('encomendaListaExemplo')}
              multiline
              linhas={4}
              maxLength={500}
            />

            <Text style={styles.seccao}>{t('encomendaTeto')}</Text>
            <Text style={styles.nota}>{t('encomendaTetoNota')}</Text>
            <View style={styles.tetos}>
              {TETOS.filter((v) => v <= regras.tetoMax).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setTeto(v)}
                  style={[styles.teto, teto === v && styles.tetoActivo]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: teto === v }}
                >
                  <Text style={[styles.tetoTexto, teto === v && styles.tetoTextoActivo]}>
                    {dolares(v)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {taxa != null ? (
              <>
                <Text style={styles.taxa}>{t('encomendaTaxa', { v: dolares(taxa) })}</Text>
                <Text style={styles.nota}>{t('encomendaTaxaNota')}</Text>
              </>
            ) : null}

            <Text style={styles.seccao}>{t('encomendaOndeComprar')}</Text>
            <Lugar lugar={loja} onEscolher={() => setAApontar('loja')} icone="pin" t={t} />

            <Text style={styles.seccao}>{t('encomendaOndeEntregar')}</Text>
            <Lugar lugar={entrega} onEscolher={() => setAApontar('entrega')} icone="casa" t={t} />
            <Button
              title={t('useMyLocation')}
              variant="ghost"
              icone="📍"
              loading={aLocalizar}
              onPress={usarAMinhaLocalizacao}
            />

            <Button
              title={t('encomendaContinuar')}
              onPress={continuar}
              disabled={!pronto}
              style={styles.continuar}
            />
          </>
        )}

        <RodapeMarca />
      </ScrollView>

      <EscolherPonto
        visivel={!!aApontar}
        titulo={aApontar === 'loja' ? t('encomendaOndeComprar') : t('encomendaOndeEntregar')}
        onFechar={() => setAApontar(null)}
        onEscolher={(lugar) => {
          if (aApontar === 'loja') setLoja(lugar);
          else setEntrega(lugar);
          setAApontar(null);
        }}
      />
    </SafeAreaView>
  );
}

// O escalão em que este teto cai — a mesma conta que o servidor faz, só para
// mostrar o valor ANTES de pedir. Quem cobra é o servidor.
function escalaoDe(regras, teto) {
  if (!regras || regras.erro || !Array.isArray(regras.escaloes) || teto == null) return null;
  const e =
    regras.escaloes.find((x) => teto <= x.ate) || regras.escaloes[regras.escaloes.length - 1];
  return e ? e.taxa : null;
}

function Lugar({ lugar, onEscolher, icone, t }) {
  return (
    <Pressable style={styles.lugar} onPress={onEscolher} accessibilityRole="button">
      <Icone nome={icone} tamanho={20} cor={lugar ? colors.teal : colors.textMuted} />
      <Text style={[styles.lugarTexto, !lugar && styles.lugarVazio]} numberOfLines={2}>
        {lugar ? lugar.label : t('lugarDefinir')}
      </Text>
      <Icone nome="seta" tamanho={18} cor={colors.textMuted} traco={2.5} />
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    voltar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pastilha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.tintaCarry,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    pastilhaTexto: { ...tipo.corpoForte, color: colors.text },
    titulo: { ...tipo.display, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
    roda: { marginTop: spacing.xl },
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    avisoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    seccao: {
      ...tipo.subtitulo,
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    nota: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    tetos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    teto: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.border,
    },
    tetoActivo: { borderColor: colors.acentoCarry, backgroundColor: colors.tintaCarry },
    tetoTexto: { ...tipo.corpoForte, color: colors.textMuted },
    tetoTextoActivo: { color: colors.text },
    taxa: { ...tipo.corpoForte, color: colors.text, marginTop: spacing.md },
    lugar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    lugarTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    lugarVazio: { color: colors.textMuted },
    continuar: { marginTop: spacing.xl },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
