export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

export function getWhatsAppConfig(settings: { getJson: <T>(key: string) => T | null }): WhatsAppConfig | null {
  const cfg = settings.getJson<{ phoneNumberId?: string; accessToken?: string }>("whatsapp");
  if (!cfg?.phoneNumberId || !cfg?.accessToken) return null;
  return { phoneNumberId: cfg.phoneNumberId, accessToken: cfg.accessToken };
}

interface SendTextParams {
  to: string;
  text: string;
  config: WhatsAppConfig;
}

export async function sendTextMessage({ to, text, config }: SendTextParams): Promise<{ waMessageId: string } | { error: string }> {
  const url = `https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return { error: JSON.stringify(data) };
    }

    return { waMessageId: String((data.messages as Array<{ id: string }>)?.[0]?.id ?? "") };
  } catch (err) {
    return { error: String(err) };
  }
}
