import { useEffect, useState, useRef, type FormEvent } from "react";
import { api } from "../lib/api";

interface Message {
  id: number;
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  status: string;
  createdAt: string;
}

interface ConversationData {
  id: number;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  status: string;
  messages: Message[];
}

export function ConversationDetail({ id }: { id: string }) {
  const [data, setData] = useState<ConversationData | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    api<ConversationData>(`/api/conversations/${id}`).then(setData).catch(console.error);
  }
  useEffect(load, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: input.trim() }),
      });
      setInput("");
      load();
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    await api(`/api/conversations/${id}/close`, { method: "POST" });
    load();
  }

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  const name = data.customerName || `Customer #${data.customerId}`;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <a href="/conversations" className="text-sm text-muted-foreground hover:underline">&larr; Back</a>
          <h1 className="text-xl font-semibold mt-1">{name}</h1>
          {data.customerPhone && <p className="text-sm text-muted-foreground">{data.customerPhone}</p>}
        </div>
        {data.status !== "closed" && (
          <button onClick={handleClose} className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted/50">Close</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl border p-4 space-y-3">
        {data.messages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation.</p>
        )}
        {data.messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
              m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <p>{m.content}</p>
              <p className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(m.createdAt).toLocaleString()} · {m.status}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={data.status === "closed"}
        />
        <button
          type="submit"
          disabled={sending || data.status === "closed"}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
