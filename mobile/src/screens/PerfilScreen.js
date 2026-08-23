import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  spacing,
  fontSize,
  radius,
  registarEstilos,
} from "../theme.js";
import { useI18n } from "../i18n/index.js";
import { useAuth } from "../context/AuthContext.js";
import { useModo } from "../context/ModoContext.js";
import { nomeDaCor, hexDaCor } from "../lib/corVeiculo.js";
import Voltar from "../components/Voltar.js";
import Retrato from "../design/Retrato.js";
import BarraEstado from "../design/BarraEstado.js";

// Perfil: quem eu sou e o que conduzo. Só isso.
//
// As definições saíram daqui para um ecrã próprio, atrás da roda dentada no
// canto. A razão: idioma, servidor e termos não são "quem eu sou" — são
// como a aplicação se comporta. Misturá-los obrigava a passar por cima
// deles para chegar ao que interessa.
export default function PerfilScreen({ navigation }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { setModo } = useModo();

  const podeConduzir = !!user?.podeConduzir;
  const pediuParaConduzir = !!user?.driverStatus;
  const veiculo = user?.vehicle;

  function sair() {
    Alert.alert(t("logoutConfirm"), t("logoutConfirmExplain"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* A roda dentada fica ao lado do perfil, como pediste: as
            definições pertencem-lhe, mas não lhe ocupam o espaço. */}
        {/* Voltou a ser um ecrã empilhado quando saiu da barra de baixo,
            por isso volta a precisar de saída visível — no iPhone não há
            botão de sistema. */}
        <View style={styles.topo}>
          <Voltar navigation={navigation} />
          <Pressable
            onPress={() => navigation.navigate("Opcoes")}
            hitSlop={12}
            style={styles.engrenagem}
            accessibilityRole="button"
            accessibilityLabel={t("settingsTitle")}
          >
            <Text style={styles.engrenagemIcone}>⚙</Text>
          </Pressable>
        </View>

        <View style={styles.cabecalho}>
          {/* A fotografia enviada no registo. Quem não é motorista — ou
              ainda não a enviou — continua a ver o 👤. */}
          <Retrato tamanho={86} mostrarFoto={pediuParaConduzir} />
          <Text style={styles.nome}>{user?.name}</Text>
          <Text style={styles.telefone}>{user?.phone}</Text>
          {user?.ratingAvg ? (
            <Text style={styles.estrelas}>
              ⭐ {Number(user.ratingAvg).toFixed(1)}
              {user.ratingCount ? ` · ${user.ratingCount}` : ""}
            </Text>
          ) : null}
        </View>

        {/* Veículo em secção própria, com a cor à vista: é por ela que o
            passageiro encontra o carro na rua. */}
        {veiculo?.plate ? (
          <Seccao titulo={t("profileVehicle")}>
            <Linha
              rotulo={t("vehicleType")}
              valor={
                veiculo.type === "motorbike"
                  ? t("vehicleMotorbike")
                  : t("vehicleCar")
              }
            />
            {veiculo.model ? (
              <Linha rotulo={t("vehicleModel")} valor={veiculo.model} />
            ) : null}
            <Linha rotulo={t("vehiclePlate")} valor={veiculo.plate} forte />
            {veiculo.color ? (
              <Linha
                rotulo={t("vehicleColor")}
                valor={nomeDaCor(veiculo.color, t)}
                amostra={hexDaCor(veiculo.color)}
              />
            ) : null}
            {veiculo.seats ? (
              <Linha rotulo={t("vehicleSeats")} valor={String(veiculo.seats)} />
            ) : null}
          </Seccao>
        ) : null}

        {podeConduzir ? (
          <Seccao titulo={t("modeRide")}>
            <Item
              texto={t("requestIfNeeded")}
              onPress={() => {
                setModo("passageiro");
                navigation.navigate("RequestRide");
              }}
            />
          </Seccao>
        ) : null}

        <Seccao titulo={t("modeDrive")}>
          <Item
            texto={
              !pediuParaConduzir
                ? t("wantToDrive")
                : user.driverStatus === "approved"
                  ? t("driverApplicationOk")
                  : user.driverStatus === "rejected"
                    ? t("driverApplicationRejected")
                    : t("driverApplicationPending")
            }
            onPress={() => navigation.navigate("DriverPending")}
          />
        </Seccao>

        <Pressable style={styles.sair} onPress={sair}>
          <Text style={styles.sairTexto}>{t("logout")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Seccao({ titulo, children }) {
  return (
    <View style={styles.seccao}>
      <Text style={styles.seccaoTitulo}>{titulo}</Text>
      <View style={styles.caixa}>{children}</View>
    </View>
  );
}

function Item({ texto, onPress }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Text style={styles.itemTexto}>{texto}</Text>
      <Text style={styles.seta}>›</Text>
    </Pressable>
  );
}

function Linha({ rotulo, valor, forte, amostra }) {
  return (
    <View style={styles.item}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <View style={styles.linhaValor}>
        {amostra ? (
          <View style={[styles.amostra, { backgroundColor: amostra }]} />
        ) : null}
        <Text style={[styles.itemTexto, forte && styles.itemForte]}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
    topo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    engrenagem: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
    },
    engrenagemIcone: { fontSize: 19, color: colors.teal },

    cabecalho: { alignItems: "center", paddingBottom: spacing.lg },
    // Sem círculo, pela mesma razão da barra de cima: a silhueta é clara e
    // sobre o teal escuro perdia-se.
    nome: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
      marginTop: spacing.md,
    },
    telefone: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
    estrelas: {
      fontSize: fontSize.sm,
      color: colors.teal,
      fontWeight: "700",
      marginTop: spacing.sm,
    },

    seccao: { marginBottom: spacing.lg },
    seccaoTitulo: {
      fontSize: fontSize.xs,
      fontWeight: "800",
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    caixa: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    itemTexto: { fontSize: fontSize.md, color: colors.text },
    itemForte: { fontWeight: "800" },
    seta: { fontSize: 22, color: colors.textMuted },
    linhaRotulo: { fontSize: fontSize.sm, color: colors.textMuted },
    linhaValor: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    amostra: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },

    sair: {
      alignItems: "center",
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    sairTexto: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: fontSize.md,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
