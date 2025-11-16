import React, { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, MessageSquare, Users, Settings, Menu, FileText, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  const { data: authData } = useQuery<{ success: boolean; user?: { id: string; username: string } } | null>({
    queryKey: ["/api/admin/me"],
    retry: false,
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch("/api/admin/me", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      setLocation("/admin/login");
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
    },
  });

  // Check auth on mount
  useEffect(() => {
    let mounted = true;
    
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/me", {
          credentials: "include",
        });
        
        if (!mounted) return;
        
        if (res.status === 401 || !res.ok) {
          setIsCheckingAuth(false);
          setLocation("/admin/login");
          return;
        }
        
        const data = await res.json();
        if (!data || !data.user) {
          setIsCheckingAuth(false);
          setLocation("/admin/login");
          return;
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        if (mounted) {
          setIsCheckingAuth(false);
          setLocation("/admin/login");
        }
      }
    }
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [setLocation]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!authData || !authData?.user) {
    return null;
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/referrals", label: "Referrals", icon: FileText },
    { href: "/admin/contacts", label: "Contact Submissions", icon: MessageSquare },
    { href: "/admin/subscribers", label: "Newsletter Subscribers", icon: Users },
    { href: "/admin/integrations", label: "Integration Settings", icon: Settings },
    { href: "/admin/live", label: "Live Telemetry", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">MindFit Admin</h1>
              <nav className="hidden md:flex items-center gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={location === item.href ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <nav className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
