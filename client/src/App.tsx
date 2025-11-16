import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Portal from "@/pages/Portal";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminContacts from "@/pages/AdminContacts";
import AdminSubscribers from "@/pages/AdminSubscribers";
import AdminIntegrations from "@/pages/AdminIntegrations";
import AdminReferrals from "@/pages/AdminReferrals";
import LiveDashboard from "@/pages/LiveDashboard";
import NotFound from "@/pages/not-found";

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  // Portal and admin pages use their own layout without public header/footer
  if (location.startsWith("/portal") || location.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/portal/login" component={Portal} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/contacts" component={AdminContacts} />
      <Route path="/admin/subscribers" component={AdminSubscribers} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/referrals" component={AdminReferrals} />
      <Route path="/admin/live" component={LiveDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
