import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Campaigns } from "./pages/Campaigns";
import { CampaignDetail } from "./pages/CampaignDetail";
import { Templates } from "./pages/Templates";
import { Conversations } from "./pages/Conversations";
import { ConversationDetail } from "./pages/ConversationDetail";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";

function PageRouter() {
  const path = window.location.pathname;

  if (path.startsWith("/campaigns/")) {
    const id = path.split("/")[2];
    return <CampaignDetail id={id} />;
  }
  if (path.startsWith("/campaigns")) return <Campaigns />;
  if (path.startsWith("/templates")) return <Templates />;
  if (path.startsWith("/conversations/")) {
    const id = path.split("/")[2];
    return <ConversationDetail id={id} />;
  }
  if (path.startsWith("/conversations")) return <Conversations />;
  if (path.startsWith("/analytics")) return <Analytics />;
  if (path.startsWith("/customers")) return <Customers />;
  if (path.startsWith("/settings")) return <Settings />;
  return <Dashboard />;
}

function App() {
  const { token } = useAuth();

  if (!token) return <Login />;

  return (
    <Layout>
      <PageRouter />
    </Layout>
  );
}

export default App;
