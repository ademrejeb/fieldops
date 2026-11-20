import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { getSession } from "../src/api";
import "../src/location"; // registers the background tracking task

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getSession().then((s) => {
      setAuthed(!!s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const onAuthPage = segments[0] === "login";
    if (!authed && !onAuthPage) router.replace("/login");
    if (authed && onAuthPage) router.replace("/(tabs)/jobs");
  }, [ready, authed, segments]);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
