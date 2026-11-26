import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export const C = {
  bg: "#FAF7F1",
  card: "#FFFFFF",
  ink: "#1C1917",
  sub: "#78716C",
  line: "#E8DCC9",
  sand: "#F4ECDF",
  clay: "#C2410C",
  claySoft: "#FFF1E6",
  olive: "#4D7C0F",
  oliveSoft: "#ECFCCB",
  red: "#B91C1C",
  amber: "#B45309",
  white: "#FFFFFF",
};

export function Btn({
  label,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: "clay" | "dark" | "ghost" | "green" | "red";
  disabled?: boolean;
}) {
  const bg =
    tone === "dark"
      ? "#171310"
      : tone === "ghost"
        ? C.sand
        : tone === "green"
          ? C.olive
          : tone === "red"
            ? C.red
            : C.clay;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 14,
        alignItems: "center",
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: tone === "ghost" ? C.ink : C.white, fontWeight: "800", fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: C.line,
        shadowColor: "#1C1917",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "800",
          color: C.sub,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 5,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export function Txt({
  value,
  onChange,
  placeholder,
  secure,
  keyboard,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: "default" | "numeric" | "email-address";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#A8A29E"
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize="none"
      style={{
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: "#FBFAF7",
        color: C.ink,
      }}
    />
  );
}

export function Prio({ p }: { p: string }) {
  const critical = p.includes("P1");
  const high = p.includes("P2");
  const bg = critical ? "#FEE2E2" : high ? "#FFEDD5" : C.sand;
  const fg = critical ? "#991B1B" : high ? "#9A3412" : "#57534E";
  return (
    <Text
      style={{
        backgroundColor: bg,
        color: fg,
        fontWeight: "800",
        fontSize: 11,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {p.replace("_", " · ")}
    </Text>
  );
}

export function Chip({ label, tone }: { label: string; tone?: "clay" | "olive" | "neutral" }) {
  const bg = tone === "clay" ? C.claySoft : tone === "olive" ? C.oliveSoft : C.sand;
  const fg = tone === "clay" ? "#9A3412" : tone === "olive" ? C.olive : "#57534E";
  return (
    <Text
      style={{
        backgroundColor: bg,
        color: fg,
        fontWeight: "700",
        fontSize: 11,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      {label}
    </Text>
  );
}
