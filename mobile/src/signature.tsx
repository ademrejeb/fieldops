import React, { useRef, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

/**
 * Finger signature pad (no native deps — works in Expo Go).
 * onDone(svg) returns an <svg> string stored as the report signature.
 */
export function SignaturePad({ onDone }: { onDone: (svg: string) => void }) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [live, setLive] = useState<string>("");
  const current = useRef<string[]>([]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        current.current = [`${Math.round(e.nativeEvent.locationX)},${Math.round(e.nativeEvent.locationY)}`];
        setLive(current.current.join(" "));
      },
      onPanResponderMove: (e) => {
        current.current.push(`${Math.round(e.nativeEvent.locationX)},${Math.round(e.nativeEvent.locationY)}`);
        setLive(current.current.join(" "));
      },
      onPanResponderRelease: () => {
        if (current.current.length > 1) setStrokes((prev) => [...prev, current.current.join(" ")]);
        current.current = [];
        setLive("");
      },
    })
  ).current;

  const empty = strokes.length === 0;

  function done() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">${strokes
      .map((p) => `<polyline points="${p}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>`)
      .join("")}</svg>`;
    onDone(svg);
  }

  return (
    <View>
      <View {...pan.panHandlers} style={{ height: 150, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, overflow: "hidden" }}>
        <Svg width="100%" height="150">
          {strokes.map((p, i) => (
            <Polyline key={i} points={p} fill="none" stroke="#0f172a" strokeWidth={2.5} strokeLinecap="round" />
          ))}
          {live ? <Polyline points={live} fill="none" stroke="#1d4ed8" strokeWidth={2.5} strokeLinecap="round" /> : null}
        </Svg>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Pressable onPress={() => setStrokes([])} style={{ flex: 1, padding: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#e2e8f0" }}>
          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Effacer</Text>
        </Pressable>
        <Pressable onPress={done} disabled={empty} style={{ flex: 1, padding: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#1d4ed8", opacity: empty ? 0.5 : 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Valider la signature</Text>
        </Pressable>
      </View>
    </View>
  );
}
