import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import TextField from './TextField.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// CORRIGIR O NOME (22/09/2026).
//
// PORQUE EXISTE. O nome escrevia-se uma vez, no registo, e ficava para
// sempre: não havia na app, no painel nem no servidor uma única forma de o
// mudar. Quem trocasse uma letra ficava com ela à frente de todos os
// passageiros que o chamassem — e um motorista ficava com um nome que não
// bate certo com a carta de condução que a plataforma aprovou.
//
// Foi o Simão a dar com isto, ao perguntar se podia trocar o nome dele por
// umas horas para tirar capturas. A resposta era não, e a razão não era
// prudência: é que não existia.
//
// O LÁPIS E NÃO UM BOTÃO. Isto corrige-se uma vez na vida de uma conta, ou
// nenhuma. Um botão "Corrigir o nome" sempre à vista pesa todos os dias para
// servir um dia; o lápis encostado ao nome diz o mesmo e não ocupa nada.
//
// O AVISO SÓ APARECE A QUEM CONDUZ, e é isso que o torna lido. Para um
// passageiro o nome é uma etiqueta; para um motorista aprovado é o que o
// passageiro confere com o documento. Mostrar a mesma frase às duas pessoas
// ensinava as duas a saltá-la.
export default function EditarNome() {
  const { t } = useI18n();
  const { user, token, refreshUser } = useAuth();
  const [aEditar, setAEditar] = useState(false);
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);

  const aprovado = user?.driverStatus === 'approved';
  const limpo = nome.replace(/\s+/g, ' ').trim();
  // O mesmo mínimo do servidor. Não é para o substituir — é para o botão não
  // convidar a um pedido que já se sabe que volta com um recado.
  const pronto = limpo.length >= 2 && limpo !== user?.name;

  function abrir() {
    setNome(user?.name || '');
    setErro(null);
    setAEditar(true);
  }

  async function guardar() {
    setOcupado(true);
    setErro(null);
    try {
      await api.mudarNome(token, limpo);
      await refreshUser();
      setAEditar(false);
    } catch (e) {
      setErro(e?.message || t('errGeneric'));
    } finally {
      setOcupado(false);
    }
  }

  if (!aEditar) {
    return (
      <View style={styles.linha}>
        <Text style={styles.nome} numberOfLines={2}>
          {user?.name}
        </Text>
        <Pressable
          onPress={abrir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('perfilMudarNome')}
        >
          <Icone nome="lapis" tamanho={18} cor={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.editor}>
      <TextField
        label={t('name')}
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
        maxLength={60}
      />
      {aprovado ? <Text style={styles.aviso}>{t('perfilNomeAviso')}</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={styles.botoes}>
        <Pressable
          style={styles.cancelar}
          onPress={() => setAEditar(false)}
          disabled={ocupado}
          accessibilityRole="button"
        >
          <Text style={styles.cancelarTexto}>{t('cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.guardar, (!pronto || ocupado) && styles.inativo]}
          onPress={guardar}
          disabled={!pronto || ocupado}
          accessibilityRole="button"
        >
          {ocupado ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.guardarTexto}>{t('lugarGuardar')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = registarEstilos(() =>
  StyleSheet.create({
    linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    nome: { ...tipo.titulo, color: colors.text, flexShrink: 1 },
    editor: { gap: spacing.xs },
    aviso: { ...tipo.pequeno, color: colors.textMuted },
    erro: { ...tipo.pequeno, color: colors.danger },
    botoes: { flexDirection: 'row', gap: spacing.xs },
    cancelar: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelarTexto: { ...tipo.corpo, color: colors.textMuted },
    guardar: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.teal,
    },
    guardarTexto: { ...tipo.corpo, color: colors.white },
    inativo: { opacity: 0.5 },
  })
);
