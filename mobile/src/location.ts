import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { api, getBase, getSession } from "./api";

export const TRACK_TASK = "fieldops-bg-track";
export const TRACK_INTERVAL_MIN = 5;

TaskManager.defineTask(TRACK_TASK, async ({ data, error }) => {
  if (error) return;
  const locs = (data as { locations?: { coords: { latitude: number; longitude: number; speed?: number | null } }[] })?.locations;
  const loc = locs?.[0];
  if (!loc) return;
  try {
    const s = await getSession();
    if (!s) return;
    const base = await getBase();
    await fetch(`${base}/api/mobile/position`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude, speed: Math.round((loc.coords.speed ?? 0) * 3.6) }),
    });
  } catch { /* offline: dropped (next fix sends on reconnect) */ }
});

export async function trackingStatus(): Promise<{ granted: boolean; running: boolean }> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  const running = await TaskManager.isTaskRegisteredAsync(TRACK_TASK);
  return { granted: fg.granted && bg.granted, running };
}

export async function requestTracking(intervalMin = TRACK_INTERVAL_MIN): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error("Position refusée.");
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) throw new Error("Position en arrière-plan refusée — le suivi continu est impossible.");
  const registered = await TaskManager.isTaskRegisteredAsync(TRACK_TASK);
  if (registered) await Location.stopLocationUpdatesAsync(TRACK_TASK);
  await Location.startLocationUpdatesAsync(TRACK_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalMin * 60 * 1000,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "FieldOps — suivi mission",
      notificationBody: "Position envoyée au dispatch.",
    },
  });
  // Immediate first fix so the map lights up now
  try {
    const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await api.position(cur.coords.latitude, cur.coords.longitude, Math.round((cur.coords.speed ?? 0) * 3.6));
  } catch { /* will come with next tick */ }
}

export async function stopTracking(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(TRACK_TASK);
  if (registered) await Location.stopLocationUpdatesAsync(TRACK_TASK);
}
