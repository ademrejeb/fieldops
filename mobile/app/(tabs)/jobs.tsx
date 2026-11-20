import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, getSession, queueLength, syncQueue } from "../../src/api";
import { Btn, C, Card, Prio } from "../../src/ui";

type Job = {
  id: string; number: string; jobType: string; status: string;
  scheduledStart: string | null; estimatedMin: number;
  ticket: { number: string; title: string; priority: string; customer: { name: string }; asset: { name: string; site: { name: string; address: string } } | null };
};

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [name, setName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const router = useRouter();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = await getSession();
      if (s) setName(s.user.name);
      const d = await api.jobs();
      setItems(d.items ?? []);
      setOffline(false);
      await api.cacheJobs(d.items ?? []);
    } catch {
      const cached = await api.cachedJobs();
      if (cached) {
        setItems(cached.items ?? []);
        setOffline(true);
      }
    } finally {
      setPending(await queueLength());
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function sync() {
    const r = await syncQueue();
    setPending(r.remaining);
    await load();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Mes missions</Text>
        <Text style={{ color: C.sub }}>{name}{offline ? " · ⚠ hors ligne (cache)" : ""}{pending > 0 ? ` · ⏳ ${pending} en attente` : ""}</Text>
        {pending > 0 && (
          <View style={{ marginTop: 8 }}>
            <Btn label={`Synchroniser (${pending})`} onPress={sync} tone="dark" />
          </View>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={!refreshing ? (<Card><Text style={{ color: C.sub }}>Aucune mission. Tirez pour rafraîchir. ☀️</Text></Card>) : (<></>)}
        renderItem={({ item: j }) => (
          <Pressable onPress={() => router.push(`/job/${j.id}`)}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: "monospace", fontWeight: "800" }}>{j.number}</Text>
                <Prio p={j.ticket.priority} />
              </View>
              <Text style={{ fontWeight: "700", marginTop: 4 }}>{j.ticket.title}</Text>
              <Text style={{ color: C.sub, fontSize: 13 }}>{j.ticket.customer.name}{j.ticket.asset ? ` · ${j.ticket.asset.name}` : ""}</Text>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
                {j.ticket.asset?.site ? `${j.ticket.asset.site.name} — ${j.ticket.asset.site.address} · ` : ""}{j.status} · {j.estimatedMin} min
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
