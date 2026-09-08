import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapa from './MapaGoogle.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { pontoNaEstrada } from '../lib/estrada.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Escolher um ponto apontando no mapa, fora do ecrã de pedir viagem.
//
// PORQUE EXISTE. Definir a Casa e o Trabalho abria só a caixa de escrever. E
// a casa de alguém em Díli é justamente o que não se escreve: não tem nome
// que se procure, tem um portão que se aponta. Pedir para escrever era pedir
// o que não existe.
//
// O ECRÃ DE PEDIR VIAGEM JÁ FAZ ISTO, e não o reaproveitei. O que lá está
// vive agarrado ao estado da viagem — a recolha, o destino, o orçamento, o
// bloqueio depois de os dois estarem postos — e separá-lo hoje seria mexer
// em código que o Simão já testou vezes sem conta.
//
// Fica registado: são duas implementações da mesma ideia. Se aparecer um
// terceiro sítio a precisar disto, é sinal de que chegou a hora de as juntar,
// e esta é a que deve sobreviver — não sabe nada de viagens.
const ESPERA_MS = 500;

export default function EscolherPonto({ visivel, titulo, onEscolher, onFechar }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [centro, setCentro] = useState(null);
  const [nome, setNome] = useState(null);
  const [perto, setPerto] = useState([]);
  const relogio = useRef(null);

  useEffect(() => {
    if (!visivel) {
      setCentro(null);
      setNome(null);
      setPerto([]);
    }
  }, [visivel]);

  // O NOME SÓ SE PEDE QUANDO O DEDO PÁRA.
  //
  // O Nominatim aceita cerca de um pedido por segundo e é gratuito e
  // partilhado. Perguntar a cada quadro do arrasto seria abusivo, e mais
  // lento: as respostas chegariam todas atrasadas e fora de ordem.
  const centroMudou = useCallback(
    ({ lat, lng }) => {
      setCentro({ lat, lng });
      setNome(null);
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(async () => {
        const [n, r] = await Promise.all([
          nomeDoLugar(lat, lng, 0).catch(() => null),
          token ? api.lugaresPerto(token, lat, lng).catch(() => null) : null,
        ]);
        setNome(n || null);
        setPerto(r?.lugares || []);
      }, ESPERA_MS);
    },
    [token]
  );

  useEffect(() => () => relogio.current && clearTimeout(relogio.current), []);

  async function confirmar() {
    if (!centro) return;
    // ENCOSTAR À ESTRADA, como na recolha. Um carro não entra num pátio, e
    // a casa de alguém é quase sempre um portão a meio de um quarteirão.
    const naEstrada = await pontoNaEstrada(centro.lat, centro.lng, token);
    const p = naEstrada || centro;
    onEscolher({
      lat: p.lat,
      lng: p.lng,
      label: nome || naEstrada?.rua || rotuloCoordenadas(p.lat, p.lng),
    });
  }

  return (
    <Modal visible={!!visivel} animationType="slide" onRequestClose={onFechar}>
      <SafeAreaView style={styles.cheio} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }}>
          <Mapa fill modoEscolha="destino" onCentro={centroMudou} />
        </View>

        <View style={styles.barra}>
          <Text style={styles.rotulo}>{titulo}</Text>
          <Text style={styles.nome} numberOfLines={2}>
            {nome || (centro ? t('aVerNome') : t('gettingLocation'))}
          </Text>

          {/* Os sítios com nome à volta. Apontar devolve uma rua; esta lista
              devolve um sítio — e para a Casa isso é a diferença entre "Rua
              de Caicoli" e o nome que a própria pessoa já lá pôs. */}
          {perto.length ? (
            <View style={styles.lista}>
              {perto.slice(0, 3).map((l) => (
                <Pressable
                  key={l.id}
                  style={styles.item}
                  onPress={() => onEscolher({ lat: l.lat, lng: l.lng, label: l.label })}
                >
                  <Text style={styles.itemIcone}>📍</Text>
                  <Text style={styles.itemNome} numberOfLines={1}>
                    {l.label}
                  </Text>
                  <Text style={styles.itemMetros}>{l.metros} m</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            style={[styles.botao, !centro && styles.botaoInativo]}
            onPress={confirmar}
            disabled={!centro}
          >
            <Text style={styles.botaoTexto}>{t('escolherEsteSitio')}</Text>
          </Pressable>
          <Pressable onPress={onFechar} hitSlop={10}>
            <Text style={styles.cancelar}>{t('cancel')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cheio: { flex: 1, backgroundColor: colors.paper },
    barra: { padding: spacing.md, backgroundColor: colors.paper },
    rotulo: { ...tipo.etiqueta, color: colors.textMuted },
    nome: { ...tipo.titulo, color: colors.text, marginTop: 2, marginBottom: spacing.sm },
    lista: { marginBottom: spacing.sm },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemIcone: { fontSize: 15, marginRight: spacing.sm },
    itemNome: { ...tipo.pequeno, color: colors.text, flex: 1 },
    itemMetros: { ...tipo.legenda, color: colors.textMuted },
    botao: {
      backgroundColor: colors.coral,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    botaoInativo: { opacity: 0.5 },
    botaoTexto: { ...tipo.subtitulo, color: colors.white, fontWeight: '800' },
    cancelar: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
