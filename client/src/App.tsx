import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Experiences from "@/pages/Experiences";
import CalendarPage from "@/pages/CalendarPage";
import Bookings from "@/pages/Bookings";
import Customers from "@/pages/Customers";
import Staff from "@/pages/Staff";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    // In a real app, redirect to login page
    return <div className="h-screen w-full flex items-center justify-center">Please log in</div>;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/experiences" component={Experiences} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/customers" component={Customers} />
        <Route path="/staff" component={Staff} />
        <Route path="/payments" component={Payments} />
        <Route path="/documents" component={Documents} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ProtectedRoutes />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
