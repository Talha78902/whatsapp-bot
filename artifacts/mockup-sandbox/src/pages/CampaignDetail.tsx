import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface CampaignData {
  campaign: {
    id: number;
    name: string;
    status: string;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: string;
    scheduledAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  analytics: {
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    deliveryRate: number;
    readRate: number;
    failureRate: number;
    timeline: { hour: number; sent: number; delivered: number; read: number }[];
  };
}

export function CampaignDetail({ id }: { id: string }) {
  const [data, setData] = useState<CampaignData | null>(null);

  useEffect(() => {
    api<CampaignData>(`/api/campaigns/${id}/analytics`).then(setData).catch(console.error);
  }, [id]);

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  const { campaign, analytics } = data;
  const maxVal = Math.max(analytics.timeline[analytics.timeline.length - 1]?.sent || 1, 1);

  return (
    <div>
      <a href="/campaigns" className="text-sm text-muted-foreground hover:underline">&larr; Back to Campaigns</a>
      <h1 className="text-2xl font-semibold mt-2 mb-6">{campaign.name}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Sent", value: analytics.sentCount },
          { label: "Delivered", value: analytics.deliveredCount },
          { label: "Read", value: analytics.readCount },
          { label: "Failed", value: analytics.failedCount },
          { label: "Delivery Rate", value: `${analytics.deliveryRate}%` },
          { label: "Read Rate", value: `${analytics.readRate}%` },
          { label: "Failure Rate", value: `${analytics.failureRate}%` },
          { label: "Status", value: campaign.status },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-medium mb-4">24-Hour Timeline</h2>
        <div className="flex items-end gap-1 h-40">
          {analytics.timeline.map((t) => (
            <div key={t.hour} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-green-500 rounded-t"
                style={{ height: `${(t.sent / maxVal) * 100}%` }}
                title={`Sent: ${t.sent}`}
              />
              <span className="text-[10px] text-muted-foreground">{t.hour}h</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Sent</span>
        </div>
      </div>
    </div>
  );
}
