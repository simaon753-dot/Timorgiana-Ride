import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// A ESPERA DE QUEM PEDIU E AINDA NÃO TEM MOTORISTA (22/09/2026).
//
// PORQUE EXISTE. O pedido morre sozinho ao fim de cinco minutos (decisão do
// Simão a 21/09), e até hoje o ecrã não dizia nada disso: uma roda a girar e
// "à procura de motorista", sem fim à vista. Quem espera no passeio não sabe
// se faltam dez segundos ou meia hora, e na dúvida fica — ou cancela cedo de
// mais.
//
// O RELÓGIO VEM DO SERVIDOR. `minutosAteDesistir` chega com a viagem, pela
// mesma razão que já chegava com a cotação: o número vive num sítio só. Sem
// ele — uma app antiga, um servidor por actualizar — não se desenha relógio
// nenhum e fica o que já havia. Um relógio a contar para o fim errado é pior
// do que nenhum.
//
// A ESCOLHA AO TERCEIRO MINUTO, e não uma caixa de aviso. Eu tinha proposto
// uma pergunta com três respostas; o que está aqui é melhor e mais pequeno:
// ao terceiro minuto aparece UM bloco, e continuar à espera é não fazer nada
// — que é o que a maioria quer. Uma caixa a saltar ao terceiro minuto
// interrompe precisamente quem está a olhar para a estrada.
//
// O AVISO DE DUAS HORAS não é redundante com o pedido a decorrer, e vale a
// pena dizer porquê: enquanto o pedido está vivo, um motorista que chegue
// vê-o e aceita-o. O aviso serve para DEPOIS de caducar — pedi-lo ao terceiro
// minuto é seguro contra os cinco minutos acabarem em nada.

const SEGUNDOS_ATE_ESCOLHER = 180;

function relogio(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EsperaPedido({ ride }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [agora, setAgora] = useState(() => Date.now());
  const [aviso, setAviso] = useState(null); // 'a_pedir' | 'pedido' | 'erro'
  const pedido = useRef(Date.parse(ride?.createdAt) || Date.now());

  const minutos = Number(ride?.minutosAteDesistir);
  const temRelogio = Number.isFinite(minutos) && minutos > 0;

  // UM SEGUNDO, e pára quando já não há nada a contar. Sem a segunda metade,
  // este intervalo continuava a acordar o telemóvel de segundo a segundo
  // depois de o relógio chegar a zero.
  const decorridos = Math.max(0, Math.floor((agora - pedido.current) / 1000));
  const restam = temRelogio ? Math.max(0, minutos * 60 - decorridos) : 0;
  const aContar = temRelogio && restam > 0;

  useEffect(() => {
    if (!aContar) return undefined;
    const r = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(r);
  }, [aContar]);

  async function pedirAviso() {
    setAviso('a_pedir');
    try {
      await api.pedirAviso(token, {
        vehicleType: ride.vehicleType,
        originLat: ride.originLat,
        originLng: ride.originLng,
        cargaVolume: ride.carga?.volume ?? null,
      });
      setAviso('pedido');
    } catch {
      setAviso('erro');
    }
  }

  const escolher = decorridos >= SEGUNDOS_ATE_ESCOLHER;

  return (
    <View style={styles.caixa}>
      {temRelogio ? (
        <View style={styles.linha}>
          <Icone nome="relogio" tamanho={16} cor={colors.textMuted} />
          <Text style={styles.conta}>
            {restam > 0 ? t('esperaRestam', { tempo: relogio(restam) }) : t('esperaAcabou')}
          </Text>
        </View>
      ) : null}

      {escolher && restam > 0 ? (
        <>
          <Text style={styles.nota}>{t('esperaSemResposta')}</Text>
          <Pressable
            style={({ pressed }) => [styles.botao, pressed && { opacity: 0.8 }]}
            onPress={pedirAviso}
            disabled={aviso === 'a_pedir' || aviso === 'pedido'}
            accessibilityRole="button"
          >
            {aviso === 'a_pedir' ? (
              <ActivityIndicator color={colors.teal} />
            ) : (
              <>
                <Icone
                  nome={aviso === 'pedido' ? 'visto' : 'sino'}
                  tamanho={18}
                  cor={colors.teal}
                  traco={aviso === 'pedido' ? 2.5 : undefined}
                />
                <Text style={styles.botaoTexto}>
                  {aviso === 'pedido'
                    ? t('avisoPedidoOk')
                    : aviso === 'erro'
                      ? t('avisoErro')
                      : t('avisarQuando')}
                </Text>
              </>
            )}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = registarEstilos(() =>
  StyleSheet.create({
    caixa: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.sm,
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    conta: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    nota: { ...tipo.pequeno, color: colors.textMuted },
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.white,
    },
    botaoTexto: { ...tipo.corpo, color: colors.teal },
  })
);
