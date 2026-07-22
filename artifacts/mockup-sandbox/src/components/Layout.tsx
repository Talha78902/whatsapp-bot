import { type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/customers", label: "Customers", icon: "Users" },
  { href: "/campaigns", label: "Campaigns", icon: "Megaphone" },
  { href: "/templates", label: "Templates", icon: "FileText" },
  { href: "/conversations", label: "Conversations", icon: "MessageSquare" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const currentPath = window.location.pathname;

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold text-sidebar-foreground">WhatsApp Bot</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/"
              ? currentPath === "/"
              : currentPath.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sidebar-foreground">{user?.name}</span>
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
