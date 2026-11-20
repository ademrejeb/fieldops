import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export const C = {
  bg: "#f4f6fa",
  card: "#ffffff",
  ink: "#0f172a",
  sub: "#64748b",
  line: "#e2e8f0",
  blue: "#1d4ed8",
  green: "#059669",
  red: "#dc2626",
  amber: "#d97706",
};

export function Btn({ label, onPress, tone, disabled }: { label: string; onPress: () => void; tone?: "blue" | "dark" | "ghost" | "green" | "red"; disabled?: boolean }) {
  const bg = tone === "dark" ? "#0f172a" : tone === "ghost" ? "#e2e8f0" : tone === "green" ? C.green : tone === "red" ? C.red : C.blue;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ backgroundColor: bg, padding: 12, borderRadius: 10, alignItems: "center", opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: tone === "ghost" ? C.ink : "#fff", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.line }}>{children}</View>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: C.sub, textTransform: "uppercase", marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

export function Txt({ value, onChange, placeholder, secure, keyboard }: {
  value: string; onChange: (v: string) => void; placeholder?: string; secure?: boolean; keyboard?: "default" | "numeric" | "email-address";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize="none"
      style={{ borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 11, fontSize: 15, backgroundColor: "#fff" }}
    />
  );
}

export function Prio({ p }: { p: string }) {
  const bg = p.includes("P1") ? "#fee2e2" : p.includes("P2") ? "#ffedd5" : "#dbeafe";
  const fg = p.includes("P1") ? "#b91c1c" : p.includes("P2") ? "#c2410c" : "#1d4ed8";
  return <Text style={{ backgroundColor: bg, color: fg, fontWeight: "800", fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>{p.replace("_", " · ")}</Text>;
}
