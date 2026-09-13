import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button.js';
import TextField from './TextField.js';
import EscolherCor from './EscolherCor.js';
import EscolherLugares from './EscolherLugares.js';
import CartaoSeccao from '../design/CartaoSeccao.js';
import EscolherTipoVeiculo from '../design/EscolherTipoVeiculo.js';
import EscolherMarcaModelo from '../design/EscolherMarcaModelo.js';
import { LUGARES } from '../dados/veiculos.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Declarar o veículo depois do registo — sistema de design TGA (13/09/26).
//
// Existe porque o papel deixou de ser uma parede: quem se registou como
// passageiro e mais tarde quer conduzir não tinha onde pôr estes dados, e
// era obrigado a criar outra conta — com um dos três números de telemóvel
// que uma pessoa em Timor-Leste pode ter.
//
// AS MESMAS PEÇAS DO REGISTO: as ilustrações dos veículos em cartões, Marka e
// Modelu em dois campos, os campos com ícone. É a mesma pergunta nos dois
// sítios, e tem de parecer a mesma — o Simão pediu que a área do motorista
// seguisse a referência da seleção de veículos.
//
// OS LUGARES PERGUNTAM-SE À TABELA (`perguntaLugares`) e não com
// `tipo === 'car'`: era mais um ternário de dois tipos, dos que o Carry já
// desmentiu em trinta sítios.
export default function FormularioVeiculo({ onPronto }) {
  const { t } = useI18n();
  const { token, refreshUser } = useAuth();
  const [tipoVeiculo, setTipoVeiculo] = useState('car');
  const [modelo, setModelo] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cor, setCor] = useState('');
  const [lugares, setLugares] = useState(null);
  const [erro, setErro] = useState(null);
  const [aEnviar, setAEnviar] = useState(false);
  const pedeLugares = !!VEICULOS[tipoVeiculo]?.perguntaLugares;

  async function guardar() {
    setErro(null);
    if (!modelo.trim()) return setErro(t('errMarcaModelo'));
    if (!matricula.trim()) return setErro(t('errPlateRequired'));
    if (pedeLugares && !lugares) return setErro(t('errSeatsRequired'));
    // Também aqui, senão bastava editar o veículo para a cor voltar a
    // desaparecer — e este é o ecrã por onde um motorista já registado a vai
    // preencher pela primeira vez.
    if (!cor) return setErro(t('errColorRequired'));

    setAEnviar(true);
    try {
      await api.registarVeiculo(token, {
        type: tipoVeiculo,
        model: modelo,
        plate: matricula.trim().toUpperCase(),
        color: cor,
        ...(pedeLugares ? { seats: lugares } : {}),
      });
      await refreshUser();
      onPronto?.();
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <CartaoSeccao
      icone="carro"
      titulo={t('vehicleSection').toUpperCase()}
      subtitulo={t('wantToDriveHelp')}
      obrigatorio={t('obrigatoriu')}
    >
      <Text style={styles.rotulo}>
        {t('vehicleType')}
        <Text style={styles.asterisco}> *</Text>
      </Text>
      <EscolherTipoVeiculo valor={tipoVeiculo} onEscolher={setTipoVeiculo} />
      {tipoVeiculo === 'carry' ? (
        <View style={styles.notaCarry}>
          <Text style={styles.notaCarryTexto}>🛻 {t('carryNota')}</Text>
        </View>
      ) : null}
      <EscolherMarcaModelo tipo={tipoVeiculo} onEscolher={setModelo} />
      <TextField
        label={t('vehiclePlate')}
        value={matricula}
        onChangeText={setMatricula}
        placeholder={t(VEICULOS[tipoVeiculo]?.chaveMatricula || 'vehiclePlatePlaceholderCar')}
        hint={t('vehiclePlateHint')}
        autoCapitalize="characters"
        icone="documento"
        obrigatorio
      />
      {pedeLugares ? (
        <>
          <Text style={styles.rotulo}>
            {t('vehicleSeats')}?<Text style={styles.asterisco}> *</Text>
          </Text>
          <Text style={styles.ajuda}>{t('vehicleSeatsHelp')}</Text>
          <EscolherLugares opcoes={LUGARES} valor={lugares} onEscolher={setLugares} />
          <View style={{ height: spacing.md }} />
        </>
      ) : null}
      <Text style={styles.rotulo}>
        {t('vehicleColor')}
        <Text style={styles.asterisco}> *</Text>
      </Text>
      <EscolherCor valor={cor} onEscolher={setCor} />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={{ height: spacing.md }} />
      <Button
        title={t('vehicleRegister')}
        onPress={guardar}
        loading={aEnviar}
        variant="marca"
        tamanho="grande"
      />
    </CartaoSeccao>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    rotulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    ajuda: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    notaCarry: {
      backgroundColor: colors.tintaCarry,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
    },
    notaCarryTexto: { ...tipo.pequeno, color: colors.text },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
