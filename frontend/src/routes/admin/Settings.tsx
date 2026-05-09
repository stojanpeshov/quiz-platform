import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery<{ settings: Record<string, string> }>({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch("/api/admin/settings"),
  });
  const [webhook, setWebhook] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setWebhook(data.settings.teams_webhook_url ?? "");
      setEnabled((data.settings.teams_notify_enabled ?? "false") === "true");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            teams_webhook_url: webhook,
            teams_notify_enabled: String(enabled),
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <label className="block text-sm">
        Teams webhook URL
        <input
          type="text"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          className="w-full mt-1 px-2 py-1 rounded"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--fg)" }}
        />
      </label>
      <label className="text-sm flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Notifications enabled
      </label>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="px-4 py-2 rounded font-medium"
        style={{ background: "var(--accent)", color: "var(--bg)" }}>
        {save.isPending ? "Saving…" : "Save"}
      </button>
      {save.isSuccess && <p style={{ color: "var(--accent)" }}>Saved.</p>}
    </div>
  );
}
