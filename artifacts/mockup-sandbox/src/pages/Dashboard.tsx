import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Kpis {
  totalCustomers: number;
  activeConversations: number;
  totalMessages: number;
  activeCampaigns: number;
  deliveryRate: number;
}

export function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    api<Kpis>("/api/dashboard/kpis").then(setKpis).catch(console.error);
  }, []);

  const cards = kpis
    ? [
        { label: "Total Customers", value: kpis.totalCustomers },
        { label: "Active Conversations", value: kpis.activeConversations },
        { label: "Total Messages", value: kpis.totalMessages },
        { label: "Active Campaigns", value: kpis.activeCampaigns },
        { label: "Delivery Rate", value: `${kpis.deliveryRate}%` },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      {!kpis ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-3xl font-semibold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
