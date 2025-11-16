import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Users, MessageSquare, Settings, Loader2, ArrowRight, Activity } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface DashboardStats {
  contactSubmissions: number;
  newsletterSubscribers: number;
  recentContacts: number;
  integrationStatus: string;
}

export default function AdminDashboard() {
  const { data: contacts } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/admin/contacts"],
  });

  const { data: subscribers } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/admin/subscribers"],
  });

  const { data: integrations } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/admin/integrations"],
  });

  const stats: DashboardStats = {
    contactSubmissions: contacts?.data?.length || 0,
    newsletterSubscribers: subscribers?.data?.length || 0,
    recentContacts: contacts?.data?.filter(c => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(c.createdAt) > dayAgo;
    }).length || 0,
    integrationStatus: integrations?.data?.some(i => i.enabled === "true") ? "Active" : "Not configured",
  };

  const isLoading = !contacts || !subscribers || !integrations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-8" data-testid="page-admin-dashboard">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your website management dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-contacts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Submissions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contactSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentContacts} in last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-subscribers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Newsletter Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newsletterSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              Total subscribed users
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-integration">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integration Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.integrationStatus}</div>
            <p className="text-xs text-muted-foreground">
              EMRM & external systems
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-engagement">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.contactSubmissions > 0 ? "Active" : "Starting"}
            </div>
            <p className="text-xs text-muted-foreground">
              Visitor interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-elevate" data-testid="card-action-contacts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact Submissions
            </CardTitle>
            <CardDescription>
              View and respond to client inquiries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/contacts">
              <Button className="w-full" data-testid="button-view-contacts">
                View Submissions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-action-subscribers">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Newsletter Subscribers
            </CardTitle>
            <CardDescription>
              Manage your newsletter subscriber list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/subscribers">
              <Button className="w-full" data-testid="button-view-subscribers">
                View Subscribers <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-action-integrations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure integrations and view live telemetry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/integrations">
              <Button className="w-full" data-testid="button-view-integrations">
                Open Settings <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contact Submissions</CardTitle>
          <CardDescription>Latest inquiries from your website</CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No contact submissions yet
            </p>
          ) : (
            <div className="space-y-4">
              {contacts.data.slice(0, 5).map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0"
                  data-testid={`contact-${contact.id}`}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    <p className="text-sm line-clamp-2">{contact.message}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {contacts.data.length > 5 && (
            <Link href="/admin/contacts">
              <Button variant="outline" className="w-full mt-4">
                View All Submissions
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
