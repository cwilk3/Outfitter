import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Experiences from "@/pages/Experiences";
// Locations are now managed within the Experiences page
import CalendarPage from "@/pages/CalendarPage";
import Bookings from "@/pages/Bookings";
import Customers from "@/pages/Customers";
import Staff from "@/pages/Staff";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import PublicBooking from "@/pages/PublicBooking";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { OutfitterProvider } from "@/contexts/OutfitterContext";

function ProtectedRoutes() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-gray-500 text-sm font-medium">Loading, please wait...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <OutfitterProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/experiences" component={Experiences} />
          <Route path="/locations">
            {() => {
              // Redirect to experiences
              window.location.href = "/experiences";
              return null;
            }}
          </Route>
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
    </OutfitterProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          {/* Public routes */}
          <Route path="/public-booking/:outfitterId?" component={PublicBooking} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          
          {/* Protected routes */}
          <Route path="/*">
            <ProtectedRoutes />
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
