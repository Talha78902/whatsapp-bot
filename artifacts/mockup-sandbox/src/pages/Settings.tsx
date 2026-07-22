import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";

interface WhatsAppSettings {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

export function Settings() {
  const [settings, setSettings] = useState<WhatsAppSettings>({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    webhookVerifyToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<WhatsAppSettings>("/api/settings/whatsapp")
      .then(setSettings)
      .catch(console.error);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api("/api/settings/whatsapp", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setMessage("Saved successfully");
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function set(field: keyof WhatsAppSettings, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-medium">WhatsApp Business API</h2>
          <p className="text-sm text-muted-foreground">
            Enter your Meta WhatsApp Business API credentials. You can find these in your
            Meta Business Suite under WhatsApp &gt; API Setup.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number ID</label>
            <input
              type="text"
              value={settings.phoneNumberId}
              onChange={(e) => set("phoneNumberId", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="e.g. 123456789012345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Access Token</label>
            <input
              type="password"
              value={settings.accessToken}
              onChange={(e) => set("accessToken", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="Permanent access token"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Generate a permanent token from Meta Business Suite &gt; API Setup.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Business Account ID</label>
            <input
              type="text"
              value={settings.businessAccountId}
              onChange={(e) => set("businessAccountId", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="e.g. 123456789012345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Webhook Verify Token</label>
            <input
              type="text"
              value={settings.webhookVerifyToken}
              onChange={(e) => set("webhookVerifyToken", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="Any random string you choose"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used when configuring the webhook in Meta Business Suite. Enter the same value there.
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message === "Saved successfully"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
