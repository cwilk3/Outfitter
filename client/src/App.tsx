import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OutfitterProvider } from "@/contexts/OutfitterContext";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
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

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/public-booking/:outfitterId?" component={PublicBooking} />
      
      {/* Landing page for non-authenticated users */}
      {!isAuthenticated && (
        <Route path="/" component={Landing} />
      )}
      
      {/* Protected routes for authenticated users */}
      {isAuthenticated && (
        <>
          <Route path="/">
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          </Route>
          
          <Route path="/dashboard">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/experiences">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Experiences />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/locations">
            {() => {
              // Redirect to experiences
              window.location.href = "/experiences";
              return null;
            }}
          </Route>
          
          <Route path="/calendar">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <CalendarPage />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/bookings">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Bookings />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/customers">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Customers />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/staff">
            <ProtectedRoute requiredRole="admin">
              <OutfitterProvider>
                <AppLayout>
                  <Staff />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/payments">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Payments />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/documents">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Documents />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
          
          <Route path="/settings">
            <ProtectedRoute>
              <OutfitterProvider>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </OutfitterProvider>
            </ProtectedRoute>
          </Route>
        </>
      )}
      
      {/* Legacy auth routes - keeping for compatibility */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      
      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
