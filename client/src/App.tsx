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
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/hooks/useAuth";
// Public pages
import PublicExperiences from "@/pages/PublicExperiences";
import BookExperience from "@/pages/BookExperience";
import BookingConfirmation from "@/pages/BookingConfirmation";

function ProtectedRoutes() {
  // Dev mode - we always authenticate
  const { isLoading } = useAuth();

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
  );
}

// A simple layout for public pages
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <a href="/experiences" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
                <path d="M17 9c.5 0 1-.1 1.4-.4l-7.9 7.9-2.9-2.9c-1.2-1.1-3-.9-4.1.3-.9.9-.9 2.3 0 3.2L7.4 21c.8.8 2.1.8 2.9 0L21 10.3c0 .5-.1 1-.4 1.4-.5 1-1.5 1.7-2.6 1.7-.5 0-1-.1-1.5-.4l2.9-2.9c.8-.8 1-2 .4-3-.5-1-1.5-1.7-2.6-1.7-1 0-1.8.6-2.2 1.3-1.1-.4-2-.2-2.7.5L11.1 9c-.1-1.5-1.4-2.8-3-2.8s-2.9 1.3-3 2.8c0 1.1.6 2.1 1.5 2.6 0 .1 0 .1.1.1 1 .4 2.3.1 3.1-.7l.7-.7 2.9 2.9c.3.3.8.3 1.1 0s.3-.7 0-1.1"></path>
              </svg>
              <span className="text-lg font-semibold text-gray-900">Outfitter</span>
            </a>
          </div>
          <div>
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">Admin Login</a>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
      <footer className="bg-white border-t mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center">© {new Date().getFullYear()} Outfitter. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function PublicRoutes() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/experiences" component={PublicExperiences} />
        <Route path="/experience/:id">
          {(params) => <PublicExperiences experienceId={parseInt(params.id)} />}
        </Route>
        <Route path="/book/:id">
          {(params) => <BookExperience experienceId={parseInt(params.id)} />}
        </Route>
        <Route path="/booking-confirmation/:bookingNumber">
          {(params) => <BookingConfirmation bookingNumber={params.bookingNumber} />}
        </Route>
        {/* Public booking link routes */}
        <Route path="/book/company/:companySlug">
          {(params) => <PublicExperiences companySlug={params.companySlug} />}
        </Route>
        <Route path="/book/wilderness-adventures">
          {() => <PublicExperiences companySlug="wilderness-adventures" />}
        </Route>
      </Switch>
    </PublicLayout>
  );
}

function App() {
  // Check if the current path is a public route
  const isPublicRoute = () => {
    const path = window.location.pathname;
    return path.startsWith('/experiences') || 
           path.startsWith('/experience/') || 
           path.startsWith('/book/') || 
           path.startsWith('/booking-confirmation/');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isPublicRoute() ? <PublicRoutes /> : <ProtectedRoutes />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
