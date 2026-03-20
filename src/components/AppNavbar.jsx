import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import NotificationBell from "@/components/NotificationBell.jsx";
import ThemeToggle from "@/components/ThemeToggle.jsx";
import { Compass, LayoutDashboard, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/profile", label: "Profile", icon: User },
];

const AppNavbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            Skill<span className="text-secondary">Swap</span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                asChild
                className={cn(location.pathname === item.to && "bg-accent text-accent-foreground")}
              >
                <Link to={item.to} className="gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
          <ThemeToggle />
          <NotificationBell />
          <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="flex border-t sm:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground",
              location.pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default AppNavbar;
