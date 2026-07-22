import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Overview {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  totalCustomers: number;
  totalMessages: number;
}

interface TimelinePoint {
  date: string;
  inbound: number;
  outbound: number;
}

interface TopCampaign {
  id: number;
  name: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  deliveryRate: number;
}

export function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [topCamps, setTopCamps] = useState<TopCampaign[]>([]);

  useEffect(() => {
    api<Overview>("/api/analytics/overview").then(setOverview).catch(console.error);
    api<TimelinePoint[]>("/api/analytics/message-timeline").then(setTimeline).catch(console.error);
    api<TopCampaign[]>("/api/analytics/top-campaigns").then(setTopCamps).catch(console.error);
  }, []);

  const maxTimeline = Math.max(...timeline.flatMap((t) => [t.inbound, t.outbound]), 1);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Sent", value: overview.totalSent },
            { label: "Total Delivered", value: overview.totalDelivered },
            { label: "Total Read", value: overview.totalRead },
            { label: "Total Failed", value: overview.totalFailed },
            { label: "Delivery Rate", value: `${overview.deliveryRate}%` },
            { label: "Read Rate", value: `${overview.readRate}%` },
            { label: "Total Customers", value: overview.totalCustomers },
            { label: "Total Messages", value: overview.totalMessages },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-medium mb-4">7-Day Message Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {timeline.map((t) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full space-y-0.5">
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(t.outbound / maxTimeline) * 100}%` }} />
                    <div className="w-full bg-green-500 rounded-t" style={{ height: `${(t.inbound / maxTimeline) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Outbound</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Inbound</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-medium mb-4">Top Campaigns</h2>
          {topCamps.length === 0 ? (
            <p className="text-muted-foreground text-sm">No campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {topCamps.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.sentCount} sent · {c.deliveryRate}% delivered</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === "completed" ? "bg-green-100 text-green-700" :
                    c.status === "running" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{c.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
