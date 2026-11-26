import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_URL, login } from "../src/api";
import { Btn, C, Card, Field, Txt } from "../src/ui";

export default function Login() {
  const [base, setBase] = useState(DEFAULT_URL);
  const [tenant, setTenant] = useState("demo-casablanca");
  const [email, setEmail] = useState("tech@fieldops.ma");
  const [password, setPassword] = useState("FieldOps123!");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const s = await login(base.trim(), email, password, tenant.trim() || undefined);
      if (!s.user.technicianId && s.user.role !== "ADMIN" && s.user.role !== "DISPATCHER") {
        setErr("Ce compte n'est lié à aucun technicien.");
        return;
      }
      router.replace("/(tabs)/jobs");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#171310", justifyContent: "center", padding: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFF7ED", fontWeight: "900", fontSize: 21 }}>k.</Text>
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.8 }}>khedma.</Text>
          <Text style={{ color: "#A8A29E", fontSize: 12 }}>El khedma, mrigla.</Text>
        </View>
      </View>
      <Text style={{ color: "#D6D3D1", marginBottom: 18, fontSize: 13 }}>
        Missions du jour · checklists · signature · notifications
      </Text>
      <Card>
        <Field label="Serveur (IP du PC sur le même Wi-Fi)">
          <Txt value={base} onChange={setBase} placeholder="http://192.168.0.10:3000" />
        </Field>
        <Field label="Entreprise (slug)">
          <Txt value={tenant} onChange={setTenant} placeholder="demo-casablanca" />
        </Field>
        <Field label="Email"><Txt value={email} onChange={setEmail} keyboard="email-address" /></Field>
        <Field label="Mot de passe"><Txt value={password} onChange={setPassword} secure /></Field>
        {err ? <Text style={{ color: C.red, marginBottom: 8 }}>{err}</Text> : null}
        <Btn label={busy ? "Connexion…" : "Se connecter"} onPress={submit} />
      </Card>
      <Text style={{ color: "#78716C", fontSize: 12, marginTop: 12, textAlign: "center" }}>
        Émulateur Android : 10.0.2.2:3000 · Téléphone réel : IP locale du PC
      </Text>
    </SafeAreaView>
  );
}
