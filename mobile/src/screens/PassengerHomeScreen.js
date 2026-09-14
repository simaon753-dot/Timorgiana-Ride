import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import { TIPOS_VEICULO, VEICULOS } from '../dados/tiposDeVeiculo.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import AvisoTeste from '../components/AvisoTeste.js';
import Button from '../components/Button.js';
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from '../termos/versao.js';
import BarraTopo from '../components/BarraTopo.js';
import { useModo } from '../context/ModoContext.js';
import ViagemPassageiro from '../components/ViagemPassageiro.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, radius, elevacao, registarEstilos, paletaEmUso } from '../theme.js';

// A COSTA DE DÍLI COM O CRISTO REI, recortada da referência do Simão
// (13/09/26). Ele escolheu-a em vez de uma gerada, que parecia o Rio de
// Janeiro. WebP com transparência: desvanece à esquerda e em cima para
// assentar sobre qualquer fundo, e pesa uma fracção do PNG na actualização.
const DILI = require('../../assets/entrada/dili.webp');

export default function PassengerHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, logout } = useAuth();
  // TERMOS POR ACEITAR — os desta versão, não "uns termos quaisquer".
  //
  // Compara-se a VERSÃO e não a existência: quem aceitou a de Agosto não
  // aceitou a de hoje se o texto mudou de sentido, e é justamente aí que voltar
  // a perguntar interessa. As contas criadas antes de isto ser guardado têm o
  // campo vazio e caem no mesmo caso, que é o correcto — nunca aceitaram.
  const faltaTermos = user?.termsVersion !== VERSAO_TERMOS;
  const faltaPrivacidade = user?.privacyVersion !== VERSAO_PRIVACIDADE;
  const { podeConduzir, setModo } = useModo();
  const { activeRide: viagemBruta, loading } = useRides();

  // Só mostra viagens em que EU sou o passageiro. Sem isto, quem conduz e
  // caia neste ecrã por um instante veria "o teu motorista: <o próprio
  // nome>", que é absurdo e mina a confiança no resto.
  const activeRide = viagemBruta && viagemBruta.driver?.id !== user?.id ? viagemBruta : null;

  // QUE SERVIÇOS ESTÃO LIGADOS. O Carry pode ser desligado no painel; lido ao
  // entrar e sempre que se volta a este ecrã. Sem resposta, fica tudo como
  // estava — um serviço não desaparece por falta de rede.
  const [servicos, setServicos] = useState(null);
  useEffect(() => {
    const ler = () =>
      api
        .servicos(token)
        .then((r) => setServicos(r?.servicos || null))
        .catch(() => {});
    ler();
    return navigation.addListener('focus', ler);
  }, [navigation, token]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AvisoTeste />
        <BarraTopo navigation={navigation} />

        {/* Um motorista que veio aqui pedir uma viagem tem de saber como
            volta ao trabalho. Sem isto ficaria a olhar para o ecrã errado
            sem perceber porquê. */}
        {podeConduzir ? (
          <Pressable style={styles.voltarConduzir} onPress={() => setModo('motorista')}>
            <Text style={styles.voltarConduzirTexto}>← {t('backToDriving')}</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        ) : activeRide ? (
          // ---- Viagem em curso: components/ViagemPassageiro.js ----
          <ViagemPassageiro ride={activeRide} navigation={navigation} />
        ) : (
          // ---- Sem viagem: pedir ----
          //
          // Este é o estado em que a app abre quase sempre, e era o mais
          // fraco do ecrã: um cartão pequeno com uma saudação e um botão.
          //
          // Agora a saudação respira e a acção tem a forma de uma barra de
          // procura com um ponto coral à esquerda. Não é decoração: é a
          // forma que toda a gente já associa a "escrever para onde vou",
          // e diz o que vai acontecer antes de se lhe tocar. Um botão que
          // diz "Pedir viagem" obriga a adivinhar o passo seguinte.
          <View style={styles.inicio}>
            {/* AVISA, MAS NÃO TRANCA.
             *
             * A tentação era não deixar pedir viagem sem os termos aceites.
             * Mas um engano numa cadeia de versões deixaria toda a gente à
             * porta da app ao mesmo tempo, e o remédio seria pior. A faixa
             * fica sempre à vista até ser resolvida, que é o que uma pessoa
             * precisa para o fazer — e o painel continua a poder mostrar quem
             * ainda não aceitou. */}
            {faltaTermos || faltaPrivacidade ? (
              <View style={styles.termosCaixa}>
                <Text style={styles.termosTexto}>
                  {faltaTermos ? t('termosPorAceitar') : t('privacidadePorAceitar')}
                </Text>
                <View style={{ height: spacing.sm }} />
                <Button
                  title={t('driverTermsRead')}
                  onPress={() =>
                    navigation.navigate('Termos', {
                      // Um de cada vez, e os termos primeiro. Duas caixas ao
                      // mesmo tempo pedem duas decisões antes de se poder fazer
                      // seja o que for; assim que a primeira for aceite, esta
                      // faixa reaparece com a segunda.
                      ...(faltaTermos ? { quem: 'passenger' } : { documento: 'privacidade' }),
                      aceitavel: true,
                    })
                  }
                />
              </View>
            ) : null}

            {/* O CABEÇALHO DAS REFERÊNCIAS TGA: "Olá," numa linha e o nome em
                teal grande na seguinte, com Díli por trás, encostada à direita.
                A imagem vem PRIMEIRO para ficar por baixo do texto. */}
            <View style={styles.heroi}>
              <Image
                source={DILI}
                style={styles.dili}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.saudacao}>{t('saudacaoOla')}</Text>
              {user?.name ? <Text style={styles.saudacaoNome}>{user.name}!</Text> : null}
              <Text style={styles.convite}>{t('escolherVeiculo')}</Text>
            </View>

            {/* O VEÍCULO É O PRIMEIRO PASSO, e não o último.
                Antes escolhia-se o destino aqui e o veículo três ecrãs à
                frente, ao lado do preço. O Simão pediu ao contrário, e faz
                sentido em Díli: entre mota e carro a diferença de preço é
                mais do dobro, e é a decisão que a pessoa já traz tomada
                quando pega no telemóvel.
                Dois cartões grandes e não uma lista: são duas opções, e uma
                escolha entre duas coisas mostra-se lado a lado. */}
            <View style={styles.veiculos}>
              {TIPOS_VEICULO.map((id) => VEICULOS[id]).map((v) => (
                <Pressable
                  key={v.id}
                  style={({ pressed }) => [
                    styles.veiculo,
                    // A tinta de cada veículo vem da tabela (dados/tiposDeVeiculo.js).
                    { backgroundColor: colors[v.tinta] || colors.white },
                    pressed && styles.premido,
                    servicos?.[v.id]?.ativo === false && styles.veiculoDesligado,
                  ]}
                  onPress={() =>
                    servicos?.[v.id]?.ativo === false
                      ? Alert.alert(t('servicoIndisponivel'), t('servicoIndisponivelTexto'))
                      : navigation.navigate(v.primeiroPasso || 'EscolherDestino', { veiculo: v.id })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t(v.chaveNome)}
                >
                  <View style={styles.veiculoFotoCaixa}>
                    <Image
                      source={v.imagens[paletaEmUso()] || v.imagens.claro}
                      style={styles.veiculoFoto}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.veiculoTextos}>
                    <View style={styles.veiculoTopo}>
                      <View style={[styles.veiculoIcone, { backgroundColor: colors[v.acento] }]}>
                        <Icone nome={v.icone} tamanho={18} cor={colors.onAcento} />
                      </View>
                      <Text style={styles.veiculoNome} numberOfLines={1}>
                        {t(v.chaveNome)}
                      </Text>
                    </View>
                    <Text style={styles.veiculoNota}>
                      {servicos?.[v.id]?.ativo === false
                        ? t('servicoIndisponivel')
                        : t(v.chaveNota)}
                    </Text>
                  </View>
                  <View style={styles.veiculoSeta}>
                    <Icone nome="seta" tamanho={18} cor={colors[v.acento]} traco={2.5} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    // ---- Estado sem viagem ----
    inicio: { paddingTop: spacing.sm },
    // Os dois cartões de veículo. Altura fixa para os dois ficarem iguais
    // mesmo com fotografias de proporções diferentes — a mota é alta e
    // estreita, o carro é baixo e largo, e sem altura fixa um cartão
    // ficava maior do que o outro sem razão nenhuma.
    veiculos: { gap: spacing.md, marginTop: spacing.lg },
    // Era `...elevacao.cartao`, que não existe no tema (só há plana,
    // flutuante e painel): os cartões nunca tiveram sombra, sem erro nenhum.
    veiculo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.xl,
      padding: spacing.sm,
      paddingRight: spacing.md,
      minHeight: 124,
      ...elevacao.plana,
    },
    veiculoTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    veiculoIcone: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    veiculoSeta: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A IMAGEM DENTRO DE UM QUADRADO DA COR DO FUNDO DELA.
    //
    // As ilustrações do Simão vêm com fundo branco puro (dia) e preto puro
    // (noite). De dia o quadrado é branco sobre o cartão branco e não se vê;
    // de noite é preto dentro do cartão cinzento-escuro, e lê-se como moldura.
    // Tirar o fundo às imagens automaticamente arriscava contornos sujos —
    // foi o que estragou o Carry anterior. As cores são as dos FICHEIROS e
    // não do tema, por isso estão escritas aqui e não em theme.js.
    veiculoFotoCaixa: {
      width: 120,
      height: 92,
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    veiculoFoto: { width: 120, height: 92 },
    veiculoTextos: { flex: 1 },
    veiculoNome: { ...tipo.titulo, color: colors.text, flex: 1 },
    veiculoNota: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    heroi: { minHeight: 176, justifyContent: 'flex-end', marginBottom: spacing.xs },
    // No escuro o céu claro da ilustração destacava-se como um rectângulo
    // sobre o preto; mais transparente, fica paisagem de fundo.
    dili: {
      position: 'absolute',
      top: -spacing.lg,
      right: -spacing.lg,
      width: '80%',
      aspectRatio: 914 / 506,
      opacity: paletaEmUso() === 'escuro' ? 0.5 : 1,
    },
    saudacao: { ...tipo.display, color: colors.text },
    saudacaoNome: { ...tipo.display, color: colors.teal },
    convite: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
    premido: { opacity: 0.92, transform: [{ scale: 0.995 }] },
    veiculoDesligado: { opacity: 0.5 },

    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { flexGrow: 1, padding: spacing.lg },
    voltarConduzir: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      alignSelf: 'flex-start',
    },
    voltarConduzirTexto: { ...tipo.corpoForte, color: colors.teal },
    // A mesma linguagem do aviso de "Indisponível" no ecrã do pedido: fundo de
    // tinta de perigo e texto na cor de perigo. É a mesma família de recado —
    // "isto não vai acontecer, e a razão não és tu".
    // A mesma forma da caixa dos termos de motorista, no ecrã dele. Duas
    // caixas com o mesmo recado devem ter o mesmo aspecto.
    termosCaixa: {
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    termosTexto: { ...tipo.corpoForte, color: colors.text },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
