import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import TextField from './TextField.js';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Pedir uma viagem para outra pessoa.
//
// A app assumia, em todo o lado, que quem pede é quem viaja. Essa suposição
// segurava quatro coisas ao mesmo tempo: o código de recolha, o telefone que
// o motorista marca, o botão de emergência e quem paga.
//
// Separar as duas pessoas não é acrescentar um nome — é dizer, em cada uma
// dessas quatro, de quem se está a falar. E naquilo que ainda não sabemos
// resolver, dizê-lo em voz alta em vez de deixar subentendido.
//
// O QUE ESTE ECRÃ NÃO RESOLVE, e diz: quem viaja não tem botão de
// emergência, porque não tem a app. Quem pede é que continua a ver o carro e
// a poder pedir ajuda. A resposta certa é um link de acompanhamento com
// emergência para quem viaja sem app — é uma peça a sério, e não um remendo
// a fazer a seguir a este.
//
// MENORES: permitidos, com duas condições que o Simão decidiu. Quem pede
// declara a autorização dos pais, e o motorista vê que é um menor ANTES de
// aceitar — se soubesse depois, já não estaria a escolher.
function Caixa({ marcada, onToque, children }) {
  return (
    <Pressable style={styles.linha} onPress={onToque} hitSlop={6}>
      <View style={[styles.caixa, marcada && styles.caixaMarcada]}>
        {marcada ? <Text style={styles.visto}>✓</Text> : null}
      </View>
      <Text style={styles.texto}>{children}</Text>
    </Pressable>
  );
}

export default function ParaOutraPessoa({
  activo,
  onActivo,
  nome,
  onNome,
  telefone,
  onTelefone,
  menor,
  onMenor,
  consentimento,
  onConsentimento,
}) {
  const { t } = useI18n();

  return (
    <View style={styles.bloco}>
      <Caixa
        marcada={activo}
        onToque={() => {
          const novo = !activo;
          onActivo(novo);
          // AO DESLIGAR, LIMPA-SE TUDO.
          //
          // Sem isto, quem marcasse, escrevesse um nome e voltasse atrás
          // ficava com os campos preenchidos e escondidos — e o pedido
          // seguia para outra pessoa sem ninguém ver. O que está escondido
          // não pode continuar a valer.
          if (!novo) {
            onNome('');
            onTelefone('');
            onMenor(false);
            onConsentimento(false);
          }
        }}
      >
        {t('outraPessoaTitulo')}
      </Caixa>

      {activo ? (
        <View style={styles.campos}>
          <TextField label={t('outraPessoaNome')} value={nome} onChangeText={onNome} />
          <TextField
            label={t('outraPessoaTelefone')}
            value={telefone}
            onChangeText={onTelefone}
            keyboardType="phone-pad"
            hint={t('outraPessoaTelefoneAjuda')}
          />

          <Caixa
            marcada={menor}
            onToque={() => {
              const novo = !menor;
              onMenor(novo);
              // A declaração é sobre o menor. Sem menor não há nada a
              // declarar, e uma marca que sobrasse aqui seria uma
              // declaração guardada sem objecto.
              if (!novo) onConsentimento(false);
            }}
          >
            {t('outraPessoaMenor')}
          </Caixa>

          {menor ? (
            <View style={styles.consentimento}>
              <Caixa marcada={consentimento} onToque={() => onConsentimento(!consentimento)}>
                {t('outraPessoaConsentimento')}
              </Caixa>
              <Text style={styles.notaMenor}>{t('outraPessoaMotoristaEscolhe')}</Text>
            </View>
          ) : null}

          {/* O QUE FICA CONSIGO, dito antes de pedir e não depois.
              Quem lê isto ainda pode decidir ir também, ou telefonar a
              alguém que vá. Depois de o carro estar a caminho, já não é uma
              escolha — é uma surpresa. */}
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>{t('outraPessoaAviso')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginTop: spacing.md },
    linha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    caixa: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
      marginTop: 1,
    },
    caixaMarcada: { backgroundColor: colors.teal },
    visto: { color: colors.white, fontWeight: '900', fontSize: 14, lineHeight: 16 },
    texto: { ...tipo.pequeno, flex: 1, color: colors.text, lineHeight: 20 },
    campos: { marginTop: spacing.md, gap: spacing.sm },
    consentimento: { marginTop: spacing.xs },
    notaMenor: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginLeft: 24 + spacing.sm,
    },
    // Contorno coral e fundo neutro: é um aviso, não um erro. Não há aqui
    // nada de errado — há uma coisa que a pessoa tem de saber.
    aviso: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.coral,
      backgroundColor: colors.tintaCoral,
    },
    avisoTexto: { ...tipo.pequeno, color: colors.text, lineHeight: 20 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
