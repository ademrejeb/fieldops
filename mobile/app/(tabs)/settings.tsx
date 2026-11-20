import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBase, getSession, logout, queueLength, syncQueue } from "../../src/api";
import { requestTracking, stopTracking, trackingStatus } from "../../src/location";
import { Btn, C, Card } from "../../src/ui";

export default function Settings() {
  const [info, setInfo] = useState("");
  const [track, setTrack] = useState("…");
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      const [s, base, t, q] = await Promise.all([getSession(), getBase(), trackingStatus().catch(() => null), queueLength()]);
      setInfo(`${s?.user.name ?? "?"} · ${s?.user.email ?? ""}\nServeur: ${base}\nFile d'envoi: ${q} en attente`);
      setTrack(t ? (t.running ? (t.granted ? "Suivi GPS ACTIF (toutes les 5 min)" : "Tâche active, droits à revoir") : "Suivi GPS arrêté") : "?");
    })();
  }, []);

  async function toggle(on: boolean) {
    try {
      if (on) {
        await requestTracking(5);
        setTrack("Suivi GPS ACTIF (toutes les 5 min)");
      } else {
        await stopTracking();
        setTrack("Suivi GPS arrêté");
      }
    } catch (e) {
      setTrack(`Erreur: ${(e as Error).message}`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Réglages</Text>
      <Card><Text style={{ color: C.sub }}>{info}</Text></Card>
      <Card>
        <Text style={{ fontWeight: "800", marginBottom: 4 }}>Suivi GPS</Text>
        <Text style={{ color: C.sub, marginBottom: 10 }}>{track}{"\n"}Envoie votre position au dispatch pendant les missions, même app fermée.</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Btn label="Activer" onPress={() => toggle(true)} tone="green" /></View>
          <View style={{ flex: 1 }}><Btn label="Arrêter" onPress={() => toggle(false)} tone="ghost" /></View>
        </View>
      </Card>
      <Btn label="Synchroniser maintenant" onPress={() => syncQueue()} tone="dark" />
      <Btn label="Déconnexion" onPress={async () => { await logout(); await stopTracking().catch(() => {}); router.replace("/login"); }} tone="red" />
    </SafeAreaView>
  );
}
