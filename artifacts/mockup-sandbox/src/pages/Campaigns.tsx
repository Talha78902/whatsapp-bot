import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";

interface Campaign {
  id: number;
  name: string;
  templateId: number | null;
  targetAudience: string[];
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  running: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  paused: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};

function emptyCampaign() {
  return { name: "", templateId: null, targetAudience: [], scheduledAt: null };
}

export function Campaigns() {
  const [list, setList] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyCampaign());

  function load() {
    api<{ data: Campaign[]; total: number }>("/api/campaigns").then((r) => setList(r.data)).catch(console.error);
  }
  useEffect(load, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (editing) {
      await api(`/api/campaigns/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
    } else {
      await api("/api/campaigns", { method: "POST", body: JSON.stringify(form) });
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyCampaign());
    load();
  }

  function edit(c: Campaign) {
    setEditing(c);
    setForm({ name: c.name, templateId: c.templateId, targetAudience: c.targetAudience });
    setShowForm(true);
  }

  async function action(id: number, action: string) {
    await api(`/api/campaigns/${id}/${action}`, { method: "POST" });
    load();
  }

  function can(stat: string): ("schedule" | "pause" | "resume" | "cancel")[] {
    const a: ("schedule" | "pause" | "resume" | "cancel")[] = [];
    if (stat === "draft" || stat === "scheduled") a.push("schedule");
    if (stat === "running") a.push("pause");
    if (stat === "paused") a.push("resume");
    if (["draft", "scheduled", "running", "paused"].includes(stat)) a.push("cancel");
    return a;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <button onClick={() => { setEditing(null); setForm(emptyCampaign()); setShowForm(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
          New Campaign
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-4">{editing ? "Edit Campaign" : "New Campaign"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={form.name as string} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Audience (comma separated)</label>
                <input type="text" value={(form.targetAudience as string[])?.join(", ") || ""} onChange={(e) => setForm({ ...form, targetAudience: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="tag1, tag2" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Sent</th>
                <th className="p-3 font-medium">Delivered</th>
                <th className="p-3 font-medium">Read</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3">
                    <a href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.name}</a>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.sentCount}</td>
                  <td className="p-3 text-muted-foreground">{c.deliveredCount}</td>
                  <td className="p-3 text-muted-foreground">{c.readCount}</td>
                  <td className="p-3 flex gap-1">
                    <button onClick={() => edit(c)} className="px-2 py-1 text-xs border rounded hover:bg-muted/50">Edit</button>
                    {can(c.status).map((a) => (
                      <button key={a} onClick={() => action(c.id, a)} className="px-2 py-1 text-xs border rounded hover:bg-muted/50 capitalize">{a}</button>
                    ))}
                    <button onClick={() => action(c.id, "duplicate")} className="px-2 py-1 text-xs border rounded hover:bg-muted/50">Copy</button>
                    <button onClick={async () => { if (confirm("Delete?")) { await api(`/api/campaigns/${c.id}`, { method: "DELETE" }); load(); } }} className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
