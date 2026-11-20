/** Read-only readiness check for the AI Agent Factory dispatch integration. */
export interface FactoryStatus {
  configured: boolean;
  reachable: boolean | null;
  gatewayUrl: string | null;
  agentId: string | null;
  error: string | null;
}

export async function factoryStatus(): Promise<FactoryStatus> {
  const gatewayUrl = process.env.FACTORY_GATEWAY_URL?.trim() || null;
  const agentId = process.env.FACTORY_AGENT_ID?.trim() || null;
  const key = process.env.FACTORY_AGENT_KEY?.trim() || null;
  if (!gatewayUrl || !agentId || !key) {
    return {
      configured: false,
      reachable: null,
      gatewayUrl,
      agentId,
      error: "Set FACTORY_GATEWAY_URL, FACTORY_AGENT_ID and FACTORY_AGENT_KEY.",
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);
    const response = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/health`, {
      signal: controller.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timer));
    return {
      configured: true,
      reachable: response.ok,
      gatewayUrl,
      agentId,
      error: response.ok ? null : `Factory health check returned HTTP ${response.status}.`,
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      gatewayUrl,
      agentId,
      error: "Factory is configured but unreachable from this app.",
    };
  }
}
