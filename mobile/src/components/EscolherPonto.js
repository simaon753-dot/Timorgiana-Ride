import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import MolduraModal from '../design/MolduraModal.js';
import Mapa from './MapaGoogle.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { pontoNaEstrada } from '../lib/estrada.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { metrosEntre } from '../lib/filtroPosicao.js';

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
// Até onde a mira ainda está «em cima» do sítio tocado (ver `irParaLugar`).
const NO_ALVO_M = 15;

export default function EscolherPonto({ visivel, titulo, onEscolher, onFechar }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [centro, setCentro] = useState(null);
  const [nome, setNome] = useState(null);
  const [perto, setPerto] = useState([]);
  const relogio = useRef(null);
  // Qual é a resposta a valer: uma que chegue de um sítio antigo não escreve.
  const pedido = useRef(0);

  // TOCAR NUM NOME SÓ O MOSTRA (30/09/2026, pedido do Simão), como no ecrã de
  // pedir viagem: o mapa vai até lá, o nome fica por cima, e escolher é o
  // botão. Antes o toque na lista escolhia logo, sem se ver onde era. Vale
  // enquanto a mira estiver em cima dele; arrastar para longe larga-o.
  const [alvo, setAlvoEstado] = useState(null);
  const alvoRef = useRef(null);
  const setAlvo = (a) => {
    alvoRef.current = a;
    setAlvoEstado(a);
  };
  const [centrarEm, setCentrarEm] = useState(null);
  function irParaLugar(l, { mover = true } = {}) {
    setAlvo(l);
    ++pedido.current;
    if (relogio.current) clearTimeout(relogio.current);
    setNome(l.label);
    if (mover) setCentrarEm({ lat: l.lat, lng: l.lng, chave: Date.now() });
  }

  useEffect(() => {
    if (!visivel) {
      setCentro(null);
      setNome(null);
      setPerto([]);
      setAlvo(null);
      setCentrarEm(null);
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
      const a = alvoRef.current;
      const noAlvo = !!a && metrosEntre(a, { lat, lng }) < NO_ALVO_M;
      if (a && !noAlvo) setAlvo(null);
      setNome(noAlvo ? a.label : null);
      if (relogio.current) clearTimeout(relogio.current);
      const meu = ++pedido.current;
      relogio.current = setTimeout(async () => {
        const [n, r] = await Promise.all([
          nomeDoLugar(lat, lng, 0, token).catch(() => null),
          token ? api.lugaresPerto(token, lat, lng).catch(() => null) : null,
        ]);
        if (meu !== pedido.current) return;
        // Em cima do sítio tocado, o nome é o dele e não o da morada.
        setNome(noAlvo ? a.label : n || null);
        setPerto(r?.lugares || []);
      }, ESPERA_MS);
    },
    [token]
  );

  useEffect(() => () => relogio.current && clearTimeout(relogio.current), []);

  async function confirmar() {
    if (!centro) return;
    // Com um sítio tocado, fica esse sítio, com o nome e as coordenadas dele
    // — como fazia o toque na lista antes de ter de se confirmar. Sem medir a
    // distância à mira: a meio do meio segundo em que o mapa desliza até lá,
    // a mira ainda está no sítio antigo, e medir gravava o ponto antigo com o
    // nome novo (diagnóstico de 30/09/2026). Arrastar para longe já o larga
    // (ver `centroMudou`), por isso, se ainda existe, é para lá que se vai.
    const a = alvoRef.current;
    if (a) {
      onEscolher({ lat: a.lat, lng: a.lng, label: a.label });
      return;
    }
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
      <MolduraModal style={styles.cheio} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }}>
          <Mapa
            fill
            modoEscolha="destino"
            onCentro={centroMudou}
            centrarEm={centrarEm}
            onTocarNome={({ lat, lng, nome: n }) =>
              irParaLugar({ id: `google:${lat},${lng}`, label: n, lat, lng }, { mover: false })
            }
          />
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
              {perto
                .filter((l) => !alvo || l.id !== alvo.id)
                .slice(0, 3)
                .map((l) => (
                  <Pressable
                    key={l.id}
                    style={styles.item}
                    // Leva a mira lá; escolher é o botão (ver `irParaLugar`).
                    onPress={() => irParaLugar(l)}
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
      </MolduraModal>
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
