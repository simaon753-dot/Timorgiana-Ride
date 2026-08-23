import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from './Button.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// A selfie do início do dia.
//
// CÂMARA e não galeria: uma foto escolhida da galeria pode ser de qualquer
// dia e de qualquer pessoa, o que anularia o propósito. Não é uma barreira
// forte — quem quiser mesmo enganar fotografa uma fotografia — mas obriga
// a um acto deliberado em vez de dois toques.
export default function FotoDeTurno({ feita, onFeita }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [aEnviar, setAEnviar] = useState(false);
  const [previa, setPrevia] = useState(null);

  async function tirar() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert(t('errCameraPermission'));

    const r = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.55,
      base64: true,
      allowsEditing: false,
    });
    if (r.canceled || !r.assets?.[0]?.base64) return;

    const a = r.assets[0];
    setAEnviar(true);
    try {
      await api.shiftPhoto(token, { mime: 'image/jpeg', base64: a.base64 });
      setPrevia(a.uri);
      onFeita?.();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setAEnviar(false);
    }
  }

  if (feita) {
    return (
      <View style={styles.feita}>
        {previa ? <Image source={{ uri: previa }} style={styles.miniatura} /> : null}
        <Text style={styles.feitaTexto}>{t('shiftPhotoDone')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.caixa}>
      <Text style={styles.titulo}>{t('shiftPhotoTitle')}</Text>
      <Text style={styles.explica}>{t('shiftPhotoExplain')}</Text>
      <View style={{ height: spacing.md }} />
      <Button title={`📷  ${t('shiftPhotoTake')}`} onPress={tirar} loading={aEnviar} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  caixa: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  titulo: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  explica: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  feita: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniatura: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.border },
  feitaTexto: { color: colors.success, fontWeight: '700', fontSize: fontSize.sm },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
