import { basacoreConfig } from "@/lib/basacore";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · FieldOps" };

// OIDC credentials come from runtime env; prerendering would bake in whatever
// the build machine had (usually nothing) and hide the Basacore button forever.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm basacoreEnabled={basacoreConfig.enabled} />;
}
