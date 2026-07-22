import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Settings } from "./pages/Settings";

function PageRouter() {
  const path = window.location.pathname;

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
