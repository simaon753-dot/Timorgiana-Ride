import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useModo } from '../context/ModoContext.js';
import ConfirmarEmail from '../components/ConfirmarEmail.js';
import Retrato from '../design/Retrato.js';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import CabecalhoEcra from '../design/CabecalhoEcra.js';
import Cartao from '../design/Cartao.js';
import CartaoVeiculo from '../design/CartaoVeiculo.js';
import { LinhaMenu, LinhaInfo } from '../design/LinhaMenu.js';
import RodapeMarca from '../design/RodapeMarca.js';

// Perfil: quem eu sou e o que conduzo. Só isso — sistema de design TGA
// (14/09/26), com as mesmas peças do detalhe de conta do painel: o cartão com
// o rosto, o cartão do veículo e as linhas com ícone.
//
// As definições ficam atrás da roda dentada, no canto: idioma, servidor e
// termos não são "quem eu sou", são como a aplicação se comporta.
export default function PerfilScreen({ navigation }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { setModo } = useModo();

  const podeConduzir = !!user?.podeConduzir;
  const pediuParaConduzir = !!user?.driverStatus;
  const aprovado = user?.driverStatus === 'approved';
  const veiculo = user?.vehicle;

  function sair() {
    Alert.alert(t('logoutConfirm'), t('logoutConfirmExplain'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  }

  const estadoConducao = !pediuParaConduzir
    ? t('wantToDrive')
    : user.driverStatus === 'approved'
      ? t('driverApplicationOk')
      : user.driverStatus === 'rejected'
        ? t('driverApplicationRejected')
        : t('driverApplicationPending');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <CabecalhoEcra
        navigation={navigation}
        titulo={t('perfilTitulo')}
        subtitulo="TimorgianaRide · Díli"
        direita={
          <Pressable
            onPress={() => navigation.navigate('Opcoes')}
            hitSlop={12}
            style={styles.engrenagem}
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
          >
            <Icone nome="engrenagem" tamanho={24} cor={colors.teal} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* Em cima de tudo: é a única coisa neste ecrã que fica por resolver,
            e a única que custa a conta no dia em que a senha se perder.
            Desaparece sozinha quando se confirma. */}
        <ConfirmarEmail />

        <View style={styles.cartaoPerfil}>
          {/* A fotografia mais recente do motorista; quem não tem continua a
              ver a silhueta — é o servidor que responde 404 e o componente
              que trata disso. */}
          <Retrato tamanho={84} />
          <View style={styles.perfilTextos}>
            <Text style={styles.nome} numberOfLines={2}>
              {user?.name}
            </Text>
            {/* O PAPEL em pastilhas, com o selo de verificação: diz que alguém
                olhou para os documentos desta pessoa e os aceitou. */}
            <View style={styles.papeis}>
              <View style={styles.papel}>
                <Icone nome={aprovado ? 'volante' : 'pessoa'} tamanho={15} cor={colors.teal} />
                <Text style={styles.papelTexto}>{aprovado ? t('driver') : t('passenger')}</Text>
              </View>
              {aprovado ? (
                <View style={styles.papel}>
                  <Icone nome="visto" tamanho={15} cor={colors.teal} traco={2.5} />
                  <Text style={styles.papelTexto}>{t('perfilVerificadoSo')}</Text>
                </View>
              ) : null}
              {user?.isAdmin ? (
                <View style={styles.papel}>
                  <Icone nome="coroa" tamanho={15} cor={colors.teal} />
                  <Text style={styles.papelTexto}>{t('admPapelAdmin')}</Text>
                </View>
              ) : null}
            </View>
            {/* SÓ A MÉDIA, sem quantas pessoas avaliaram — decisão do Simão:
                num serviço a começar, "5,0 · 2" lê-se como pouca coisa quando
                é tudo o que houve até agora. */}
            {user?.ratingAvg ? (
              <View style={styles.estrelas}>
                <Icone nome="estrela" tamanho={16} cor={colors.coral} />
                <Text style={styles.estrelasTexto}>{Number(user.ratingAvg).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Cartao icone="pessoa" titulo={t('perfilInfo')} lista>
          <LinhaInfo icone="telefone" rotulo={t('phone')} valor={user?.phone} forte />
          <LinhaInfo icone="email" rotulo={t('email')} valor={user?.email} ultimo />
        </Cartao>

        {/* O veículo com a ilustração do tipo e a matrícula em caixa — o mesmo
            cartão que o passageiro vê na viagem. Assim o motorista sabe
            exactamente o que o passageiro vai procurar na rua. */}
        {veiculo?.plate ? (
          <View style={styles.bloco}>
            <CartaoVeiculo veiculo={veiculo} titulo={t('profileVehicle')} />
          </View>
        ) : null}

        <Cartao lista style={styles.bloco}>
          {podeConduzir ? (
            <LinhaMenu
              icone="pin"
              titulo={t('requestIfNeeded')}
              onPress={() => {
                setModo('passageiro');
                navigation.navigate('RequestRide');
              }}
            />
          ) : null}
          <LinhaMenu
            icone="volante"
            titulo={estadoConducao}
            onPress={() => navigation.navigate('DriverPending')}
          />
          <LinhaMenu
            icone="engrenagem"
            titulo={t('settingsTitle')}
            onPress={() => navigation.navigate('Opcoes')}
          />
          <LinhaMenu icone="sair" titulo={t('logout')} perigo onPress={sair} ultimo />
        </Cartao>

        <RodapeMarca />
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    engrenagem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    cartaoPerfil: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    perfilTextos: { flex: 1 },
    nome: { ...tipo.titulo, color: colors.text },
    papeis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    papel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    papelTexto: { ...tipo.legenda, color: colors.teal },
    estrelas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    estrelasTexto: { ...tipo.corpoForte, color: colors.text },
    bloco: { marginTop: spacing.xs },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
