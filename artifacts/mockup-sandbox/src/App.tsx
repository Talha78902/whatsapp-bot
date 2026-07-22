import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";

function PageRouter() {
  const path = window.location.pathname;

  if (path === "/customers") return <Customers />;
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
