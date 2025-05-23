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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={ProtectedRoutes} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Outfitter
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Professional hunting and fishing guide management
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div>
            <a
              href="/api/login"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in to continue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
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
          
          {/* Protected routes with authentication */}
          <Route path="/*">
            <Router />
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
