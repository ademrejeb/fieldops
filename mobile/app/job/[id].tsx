import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/api";
import { SignaturePad } from "../../src/signature";
import { Btn, C, Card, Field, Prio, Txt } from "../../src/ui";

const FLOW = ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "DONE"] as const;
const FLOW_LABEL: Record<string, string> = { EN_ROUTE: "En route", ON_SITE: "Sur site", IN_PROGRESS: "En cours", DONE: "Terminé" };

type Step = { key: string; label: string; type: string; required?: boolean };

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [stepResults, setStepResults] = useState<Record<string, string>>({});
  const [partQ, setPartQ] = useState("");
  const [partHits, setPartHits] = useState<any[]>([]);
  const [minutes, setMinutes] = useState("45");
  const [summary, setSummary] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [rating, setRating] = useState(5);
  const [signature, setSignature] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const d = await api.job(id);
      setJob(d.job);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<any>, ok: string) {
    try {
      const r = await fn();
      setMsg(r?.queued ? "Enregistré hors ligne — sera synchronisé. ⏳" : ok);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function pickPhoto(into: (b64: string) => void) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setMsg("Caméra refusée."); return; }
    const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, allowsEditing: false });
    if (!r.canceled && r.assets[0]?.base64) into(`data:image/jpeg;base64,${r.assets[0].base64}`);
  }

  async function searchParts() {
    try {
      const d = await api.partSearch(partQ);
      setPartHits(d.items ?? []);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!job) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, padding: 16 }}>
        <Text style={{ color: C.sub }}>Chargement…{msg ? `\n${msg}` : ""}</Text>
      </SafeAreaView>
    );
  }

  const steps: Step[] = Array.isArray(job.checklist?.steps) ? job.checklist.steps : [];
  const doneKeys = new Set((job.executions ?? []).map((e: any) => e.stepKey));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.clay, fontWeight: "700" }}>← Missions</Text></Pressable>
        {msg ? <Card><Text style={{ color: C.ink }}>{msg}</Text></Card> : null}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: "monospace", fontWeight: "800", fontSize: 16 }}>{job.number}</Text>
            <Prio p={job.ticket.priority} />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 16, marginTop: 4 }}>{job.ticket.title}</Text>
          <Text style={{ color: C.sub }}>{job.ticket.customer.name}</Text>
          {job.ticket.asset ? (
            <Text style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>
              {job.ticket.asset.name} · {job.ticket.asset.site.name}{"\n"}{job.ticket.asset.site.address}
              {job.ticket.asset.site.accessCode ? ` · accès ${job.ticket.asset.site.accessCode}` : ""}
              {job.ticket.asset.site.contactPhone ? ` · ${job.ticket.asset.site.contactPhone}` : ""}
            </Text>
          ) : null}
          <Text style={{ marginTop: 6, fontWeight: "700" }}>Statut : {FLOW_LABEL[job.status] ?? job.status}</Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Avancer</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {FLOW.filter((s) => s !== job.status).map((s) => (
              <View key={s} style={{ flex: 1, minWidth: 100 }}>
                <Btn label={FLOW_LABEL[s]} onPress={() => act(() => api.status(id, s), `Passé à ${FLOW_LABEL[s]}.`)} tone={s === "DONE" ? "green" : "clay"} />
              </View>
            ))}
          </View>
        </Card>

        {steps.length > 0 && (
          <Card>
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>Checklist — {job.checklist.name}</Text>
            {steps.map((st) => {
              const done = doneKeys.has(st.key);
              return (
                <View key={st.key} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: C.line }}>
                  <Text style={{ fontWeight: "700" }}>{done ? "✅ " : "⬜ "}{st.label}</Text>
                  {!done && (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      {(st.type === "check" ? ["PASS", "FAIL"] : ["OK"]).map((v) => (
                        <Pressable key={v} onPress={() => setStepResults((r) => ({ ...r, [st.key]: v }))}
                          style={{ padding: 8, borderRadius: 8, backgroundColor: stepResults[st.key] === v ? C.clay : C.line }}>
                          <Text style={{ color: stepResults[st.key] === v ? "#fff" : C.ink, fontWeight: "700", fontSize: 12 }}>{v}</Text>
                        </Pressable>
                      ))}
                      <Pressable onPress={() => act(() => api.checklist(id, { stepKey: st.key, label: st.label, result: stepResults[st.key] ?? "PASS" }), "Étape validée.")}
                        style={{ padding: 8, borderRadius: 8, backgroundColor: C.olive }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Valider</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        <Card>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Pièces utilisées</Text>
          {(job.parts ?? []).map((p: any) => (
            <Text key={p.id} style={{ fontSize: 13, color: C.sub }}>• {p.item.name} ×{p.qty}</Text>
          ))}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            <View style={{ flex: 1 }}><Txt value={partQ} onChange={setPartQ} placeholder="Rechercher pièce…" /></View>
            <Btn label="🔍" onPress={searchParts} tone="dark" />
          </View>
          {partHits.map((h) => (
            <View key={h.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ flex: 1, fontSize: 13 }}>{h.sku} — {h.name} ({h.qtyOnHand})</Text>
              <Btn label="+1" onPress={() => act(() => api.parts(id, { itemId: h.id, qty: 1 }), "Pièce ajoutée.")} />
            </View>
          ))}
        </Card>

        <Card>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Temps passé</Text>
          <Text style={{ color: C.sub, fontSize: 13, marginBottom: 6 }}>
            Déjà saisi : {(job.timeLogs ?? []).reduce((s: number, t: any) => s + (t.minutes || 0), 0)} min
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1 }}><Txt value={minutes} onChange={setMinutes} keyboard="numeric" placeholder="Minutes" /></View>
            <Btn label="+ Temps" onPress={() => act(() => api.time(id, Number(minutes) || 0), "Temps enregistré.")} />
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Clôturer — rapport + signature client</Text>
          <Field label="Résumé d'intervention"><Txt value={summary} onChange={setSummary} placeholder="Ce qui a été fait…" /></Field>
          <Field label="Signé par (nom client)"><Txt value={signedBy} onChange={setSignedBy} placeholder="Nom + prénom" /></Field>
          <Field label="Satisfaction">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Text style={{ fontSize: 26, color: n <= rating ? "#f59e0b" : "#cbd5e1" }}>★</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Photos ({photos.length})">
            <Btn label="📷 Ajouter une photo" onPress={() => pickPhoto((b) => setPhotos((p) => [...p, b].slice(0, 5)))} tone="ghost" />
          </Field>
          <Field label="Signature">
            {signature ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text style={{ color: C.olive, fontWeight: "700" }}>✓ Signature capturée</Text>
                <Btn label="Refaire" onPress={() => setSignature("")} tone="ghost" />
              </View>
            ) : (
              <SignaturePad onDone={(svg) => setSignature(svg)} />
            )}
          </Field>
          <Btn
            label="Clôturer et faire signer"
            tone="green"
            onPress={() => {
              if (!signedBy.trim()) { setMsg("Nom du signataire requis."); return; }
              if (!signature) { setMsg("Signature requise."); return; }
              act(() => api.report(id, { summary, signedBy, rating, signature, photos }), "Intervention clôturée. 🎉");
            }}
          />
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
