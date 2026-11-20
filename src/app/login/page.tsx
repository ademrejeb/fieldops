import { basacoreConfig } from "@/lib/basacore";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · FieldOps" };

export default function LoginPage() {
  return <LoginForm basacoreEnabled={basacoreConfig.enabled} />;
}
