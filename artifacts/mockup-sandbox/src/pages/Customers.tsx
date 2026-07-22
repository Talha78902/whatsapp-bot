import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "../hooks/use-toast";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  status: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendText, setSendText] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [sendTargets, setSendTargets] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = () => {
    api<{ data: Customer[] }>("/api/customers?limit=1000")
      .then((r) => setCustomers(r.data))
      .catch(console.error);
  };

  useEffect(load, []);

  const allIds = customers.map((c) => c.id);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    const lines = importText.trim().split("\n").filter(Boolean);
    const rows: { name: string; phone: string }[] = [];
    for (const line of lines) {
      const parts = line.includes(",") ? line.split(",") : [line, line];
      const phone = parts[parts.length - 1].trim().replace(/[^0-9+]/g, "");
      const name = parts[0].trim();
      if (phone) rows.push({ name: name || phone, phone });
    }
    if (!rows.length) {
      toast({ title: "No valid numbers found", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await api<{ imported: number; skipped: number }>("/api/customers/import", {
        method: "POST",
        body: JSON.stringify(rows),
      });
      toast({ title: `Imported ${res.imported}, skipped ${res.skipped}` });
      setShowImport(false);
      setImportText("");
      load();
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const openSendDialog = (ids: number[]) => {
    setSendTargets(ids);
    setSendText("");
    setShowSend(true);
  };

  const handleSend = async () => {
    if (!sendText.trim() || !sendTargets.length) return;
    setSending(true);
    let sent = 0;
    let failed = 0;
    for (const id of sendTargets) {
      try {
        await api(`/api/customers/${id}/send-message`, {
          method: "POST",
          body: JSON.stringify({ content: sendText }),
        });
        sent++;
      } catch {
        failed++;
      }
    }
    toast({ title: `Sent to ${sent}, failed ${failed}` });
    setShowSend(false);
    setSendText("");
    setSelectedIds(new Set());
    setSending(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={() => openSendDialog([...selectedIds])}>
              Send to {selectedIds.size}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)}>
            Import Numbers
          </Button>
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="text-muted-foreground">No customers yet.</p>
      ) : (
        <div className="bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                    />
                  </td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.phone}</td>
                  <td className="p-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === "active" ? "bg-green-100 text-green-700" :
                      c.status === "inactive" ? "bg-gray-100 text-gray-600" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      disabled={sendingId === c.id}
                      onClick={() => {
                        setSendingId(c.id);
                        openSendDialog([c.id]);
                      }}
                    >
                      Send Message
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Numbers</DialogTitle>
            <DialogDescription>
              Paste one number per line, or in CSV format: <code>name,phone</code>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={`Talha,+923001234567\nAhmed,+923001234568`}
            rows={8}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !importText.trim()}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Sending to {sendTargets.length} customer{sendTargets.length > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Type your message..."
            rows={4}
            value={sendText}
            onChange={(e) => setSendText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !sendText.trim()}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
