"use client";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.teams_webhook_url ?? "");
        setEnabled(d.settings?.teams_notify_enabled !== "false");
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teams_webhook_url: webhookUrl,
        teams_notify_enabled: enabled ? "true" : "false",
      }),
    });
    setSaving(false);
    setStatus(res.ok ? "Saved." : "Failed to save.");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Platform settings</h1>

      <form onSubmit={save} className="space-y-4">
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Microsoft Teams</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm">Enable sharing to Teams</span>
          </label>

          <div className="space-y-1">
            <label className="text-sm text-[var(--muted)]">Incoming Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-org.webhook.office.com/webhookb2/…"
              className="w-full bg-transparent border border-[var(--border)] rounded px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-[var(--muted)]">
              Create this in Teams → channel → Connectors → Incoming Webhook. The URL stays server-side only.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {status && <span className="text-sm text-[var(--muted)]">{status}</span>}
        </div>
      </form>
    </div>
  );
}
