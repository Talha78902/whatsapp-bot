import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";

interface Template {
  id: number;
  name: string;
  category: string;
  status: string;
  body: string;
  variables: string[];
  language: string;
  createdAt: string;
}

const CATEGORIES = ["marketing", "utility", "authentication", "service"];
const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

function emptyForm() {
  return { name: "", category: "marketing", body: "", variables: [] as string[], language: "en" };
}

export function Templates() {
  const [list, setList] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm());
  const [varsInput, setVarsInput] = useState("");

  function load() {
    api<Template[]>("/api/templates").then(setList).catch(console.error);
  }
  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setVarsInput("");
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, category: t.category, body: t.body, variables: t.variables, language: t.language });
    setVarsInput(t.variables.join(", "));
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const body = { ...form, variables: varsInput.split(",").map((s) => s.trim()).filter(Boolean) };
    if (editing) {
      await api(`/api/templates/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/templates", { method: "POST", body: JSON.stringify(body) });
    }
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
          New Template
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-4">{editing ? "Edit Template" : "New Template"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={form.name as string} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category as string} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <input type="text" value={form.language as string} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="en" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <textarea value={form.body as string} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" rows={4} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variables (comma separated)</label>
                <input type="text" value={varsInput} onChange={(e) => setVarsInput(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono" placeholder="{{1}}, {{2}}" />
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
        <p className="text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Language</th>
                <th className="p-3 font-medium">Body</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 text-muted-foreground capitalize">{t.category}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-700"}`}>{t.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.language}</td>
                  <td className="p-3 text-muted-foreground max-w-xs truncate">{t.body}</td>
                  <td className="p-3 flex gap-1">
                    <button onClick={() => openEdit(t)} className="px-2 py-1 text-xs border rounded hover:bg-muted/50">Edit</button>
                    <button onClick={async () => { if (confirm("Delete?")) { await api(`/api/templates/${t.id}`, { method: "DELETE" }); load(); } }} className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50">Del</button>
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
