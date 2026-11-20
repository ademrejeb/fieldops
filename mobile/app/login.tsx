import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_URL, login } from "../src/api";
import { Btn, C, Card, Field, Txt } from "../src/ui";

export default function Login() {
  const [base, setBase] = useState(DEFAULT_URL);
  const [email, setEmail] = useState("tech@fieldops.ma");
  const [password, setPassword] = useState("FieldOps123!");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const s = await login(base.trim(), email, password);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>FieldOps Tech</Text>
      <Text style={{ color: "#94a3b8", marginBottom: 18 }}>Missions du jour · checklists · signature</Text>
      <Card>
        <Field label="Serveur (IP du PC sur le même Wi-Fi)">
          <Txt value={base} onChange={setBase} placeholder="http://192.168.0.10:3000" />
        </Field>
        <Field label="Email"><Txt value={email} onChange={setEmail} keyboard="email-address" /></Field>
        <Field label="Mot de passe"><Txt value={password} onChange={setPassword} secure /></Field>
        {err ? <Text style={{ color: C.red, marginBottom: 8 }}>{err}</Text> : null}
        <Btn label={busy ? "Connexion…" : "Se connecter"} onPress={submit} />
      </Card>
      <Text style={{ color: "#475569", fontSize: 12, marginTop: 12, textAlign: "center" }}>
        Émulateur Android : 10.0.2.2:3000 · Téléphone réel : IP locale du PC
      </Text>
    </SafeAreaView>
  );
}
