import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, getSession, queueLength, syncQueue } from "../../src/api";
import { Btn, C, Card, Chip, Prio } from "../../src/ui";

type Job = {
  id: string; number: string; jobType: string; status: string;
  scheduledStart: string | null; estimatedMin: number;
  ticket: { number: string; title: string; priority: string; customer: { name: string }; asset: { name: string; site: { name: string; address: string } } | null };
};

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string;
  meta: { workOrderId?: string; ticketId?: string } | null;
  readAt: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assignée",
  EN_ROUTE: "En route",
  ON_SITE: "Sur site",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
};

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [name, setName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = await getSession();
      if (s) setName(s.user.name);
      const [d, n] = await Promise.all([
        api.jobs(),
        api.notifications().catch(() => ({ items: [], unread: 0 })),
      ]);
      setItems(d.items ?? []);
      setNotifs(n.items ?? []);
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

  const unread = notifs.filter((n) => !n.readAt).length;

  async function openNotif(item: Notif) {
    setNotifs((current) =>
      current.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setShowNotifs(false);
    api.markNotifications([item.id]).catch(() => {});
    const jobId = item.meta?.workOrderId;
    if (jobId) router.push(`/job/${jobId}`);
  }

  async function markAll() {
    setNotifs((current) => current.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    api.markNotifications().catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.white, fontWeight: "900", fontSize: 18 }}>k.</Text>
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: C.ink, letterSpacing: -0.8 }}>Mes missions</Text>
              <Text style={{ color: C.sub, fontSize: 12 }}>
                {name}{offline ? " · hors ligne" : ""}{pending > 0 ? ` · ${pending} en attente` : ""}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowNotifs((v) => !v)}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}
            accessibilityLabel={`Notifications, ${unread} non lue(s)`}
          >
            <Text style={{ fontSize: 17 }}>🔔</Text>
            {unread > 0 && (
              <View style={{ position: "absolute", right: -3, top: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.clay, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: C.white, fontSize: 10, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>
        {pending > 0 && (
          <View style={{ marginTop: 8 }}>
            <Btn label={`Synchroniser (${pending})`} onPress={sync} tone="dark" />
          </View>
        )}
      </View>

      {showNotifs && (
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontWeight: "900", color: C.ink }}>Notifications</Text>
              {unread > 0 && (
                <Pressable onPress={markAll}>
                  <Text style={{ color: C.clay, fontWeight: "800", fontSize: 12 }}>Tout lire</Text>
                </Pressable>
              )}
            </View>
            {notifs.length === 0 && <Text style={{ color: C.sub, fontSize: 13 }}>Rien pour le moment.</Text>}
            {notifs.slice(0, 6).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openNotif(item)}
                style={{ paddingVertical: 9, borderTopWidth: 1, borderColor: C.line, opacity: item.readAt ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.kind === "REVIEW" ? C.amber : C.clay }} />
                  <Text style={{ fontWeight: "800", color: C.ink, flex: 1 }} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={2}>{item.body}</Text>
              </Pressable>
            ))}
          </Card>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={C.clay} />}
        ListEmptyComponent={!refreshing ? (<Card><Text style={{ color: C.sub }}>Aucune mission. Tirez pour rafraîchir. ☀️</Text></Card>) : (<></>)}
        renderItem={({ item: j }) => (
          <Pressable onPress={() => router.push(`/job/${j.id}`)}>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.line,
                borderLeftWidth: 4,
                borderLeftColor: j.ticket.priority.includes("P1") ? C.red : j.ticket.priority.includes("P2") ? C.clay : C.olive,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: "monospace", fontWeight: "800", color: C.sub, fontSize: 12 }}>{j.number}</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Chip label={STATUS_LABEL[j.status] ?? j.status} tone={j.status === "DONE" ? "olive" : "clay"} />
                  <Prio p={j.ticket.priority} />
                </View>
              </View>
              <Text style={{ fontWeight: "900", color: C.ink, fontSize: 15.5, marginTop: 6 }}>{j.ticket.title}</Text>
              <Text style={{ color: C.sub, fontSize: 12.5, marginTop: 1 }}>{j.ticket.customer.name}{j.ticket.asset ? ` · ${j.ticket.asset.name}` : ""}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <Text style={{ color: C.sub, fontSize: 11.5, flex: 1 }} numberOfLines={1}>
                  {j.ticket.asset?.site ? `${j.ticket.asset.site.name} — ${j.ticket.asset.site.address}` : "Adresse à confirmer"}
                </Text>
                <Text style={{ color: C.clay, fontWeight: "800", fontSize: 11.5 }}>{j.estimatedMin} min →</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
