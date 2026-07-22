import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Conversation {
  id: number;
  customerId: number;
  status: string;
  assignedTo: number | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

export function Conversations() {
  const [list, setList] = useState<Conversation[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api<{ data: Conversation[] }>(`/api/conversations?${params}`)
      .then((r) => setList(r.data))
      .catch(console.error);
  }, [statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Conversations</h1>

      <div className="flex gap-2 mb-4">
        {["", "open", "closed", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground">No conversations found.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Last Message</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => window.location.href = `/conversations/${c.id}`}
                >
                  <td className="p-3 font-medium">{c.customerName || `Customer #${c.customerId}`}</td>
                  <td className="p-3 text-muted-foreground">{c.customerPhone || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-xs truncate">{c.lastMessagePreview || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
