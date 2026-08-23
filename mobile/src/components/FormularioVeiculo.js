import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button.js';
import TextField from './TextField.js';
import SegmentedPicker from './SegmentedPicker.js';
import EscolherModelo from './EscolherModelo.js';
import EscolherCor from './EscolherCor.js';
import EscolherLugares from './EscolherLugares.js';
import { LUGARES } from '../dados/veiculos.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Declarar o veículo depois do registo.
//
// Existe porque o papel deixou de ser uma parede: quem se registou como
// passageiro e mais tarde quer conduzir não tinha onde pôr estes dados, e
// era obrigado a criar outra conta — com um dos três números de telemóvel
// que uma pessoa em Timor-Leste pode ter.
export default function FormularioVeiculo({ onPronto }) {
  const { t } = useI18n();
  const { token, refreshUser } = useAuth();
  const [tipo, setTipo] = useState('car');
  const [modelo, setModelo] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cor, setCor] = useState('');
  const [lugares, setLugares] = useState(null);
  const [erro, setErro] = useState(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function guardar() {
    setErro(null);
    if (!matricula.trim()) return setErro(t('errPlateRequired'));
    if (tipo === 'car' && !lugares) return setErro(t('errSeatsRequired'));

    setAEnviar(true);
    try {
      await api.registarVeiculo(token, {
        type: tipo,
        model: modelo,
        plate: matricula,
        color: cor,
        ...(tipo === 'car' ? { seats: lugares } : {}),
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
    <View style={styles.caixa}>
      <Text style={styles.titulo}>{t('vehicleSection')}</Text>
      <Text style={styles.ajuda}>{t('wantToDriveHelp')}</Text>
      <View style={{ height: spacing.md }} />

      <SegmentedPicker
        value={tipo}
        onChange={setTipo}
        options={[
          { value: 'car', label: t('vehicleCar'), icon: '🚗' },
          { value: 'motorbike', label: t('vehicleMotorbike'), icon: '🏍️' },
        ]}
      />
      <View style={{ height: spacing.md }} />

      <Text style={styles.rotulo}>{t('vehicleModel')}</Text>
      <EscolherModelo tipo={tipo} valor={modelo} onEscolher={setModelo} />

      <View style={{ height: spacing.md }} />
      <TextField
        label={t('vehiclePlate')}
        value={matricula}
        onChangeText={setMatricula}
        placeholder={t('vehiclePlatePlaceholder')}
        autoCapitalize="characters"
      />

      {tipo === 'car' ? (
        <>
          <Text style={styles.rotulo}>{t('vehicleSeats')}</Text>
          <Text style={styles.ajuda}>{t('vehicleSeatsHelp')}</Text>
          <EscolherLugares opcoes={LUGARES} valor={lugares} onEscolher={setLugares} />
          <View style={{ height: spacing.md }} />
        </>
      ) : null}

      <Text style={styles.rotulo}>{t('vehicleColor')}</Text>
      <EscolherCor valor={cor} onEscolher={setCor} />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={{ height: spacing.md }} />
      <Button title={t('vehicleRegister')} onPress={guardar} loading={aEnviar} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    titulo: { ...tipo.subtitulo, color: colors.text },
    rotulo: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 4 },
    ajuda: { fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 17 },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
