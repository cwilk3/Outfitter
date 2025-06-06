import React from "react";
import { Link, useLocation, useRouter } from "wouter";
import SidebarNavItem from "./SidebarNavItem";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  BookOpen, 
  Calendar, 
  PackageOpen, 
  Users, 
  UserCog,
  Wallet,
  FileText,
  Settings,
  MapPin,
  LogOut
} from "lucide-react";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { isAdmin, user } = useRole();
  const { logout, isLoggingOut } = useAuth();

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 w-64 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white border-r border-gray-200 lg:static lg:inset-0`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-primary">Outfitter</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Dashboard - Available to all users */}
          <SidebarNavItem 
            to="/" 
            icon={<Home className="h-5 w-5" />} 
            isActive={location === "/"}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </SidebarNavItem>

          {/* Calendar - Available to all users */}
          <SidebarNavItem 
            to="/calendar" 
            icon={<Calendar className="h-5 w-5" />} 
            isActive={location === "/calendar"}
            onClick={() => setMobileMenuOpen(false)}
          >
            Calendar
          </SidebarNavItem>

          {/* Customers - Available to all users */}
          <SidebarNavItem 
            to="/customers" 
            icon={<Users className="h-5 w-5" />} 
            isActive={location === "/customers"}
            onClick={() => setMobileMenuOpen(false)}
          >
            Customers
          </SidebarNavItem>

          {/* Admin-only sections */}
          {isAdmin && (
            <>
              <SidebarNavItem 
                to="/experiences" 
                icon={<BookOpen className="h-5 w-5" />} 
                isActive={location === "/experiences"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Experiences
              </SidebarNavItem>

              <SidebarNavItem 
                to="/bookings" 
                icon={<PackageOpen className="h-5 w-5" />} 
                isActive={location === "/bookings"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Bookings
              </SidebarNavItem>

              <SidebarNavItem 
                to="/staff" 
                icon={<UserCog className="h-5 w-5" />} 
                isActive={location === "/staff"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Staff
              </SidebarNavItem>

              <SidebarNavItem 
                to="/payments" 
                icon={<Wallet className="h-5 w-5" />} 
                isActive={location === "/payments"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Payments
              </SidebarNavItem>

              <SidebarNavItem 
                to="/documents" 
                icon={<FileText className="h-5 w-5" />} 
                isActive={location === "/documents"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Documents
              </SidebarNavItem>

              <SidebarNavItem 
                to="/settings" 
                icon={<Settings className="h-5 w-5" />} 
                isActive={location === "/settings"}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </SidebarNavItem>
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {user?.profileImageUrl ? (
                <img 
                  className="w-10 h-10 rounded-full object-cover" 
                  src={user.profileImageUrl} 
                  alt={`${user.firstName} ${user.lastName}`}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                  {user?.firstName?.[0] || "U"}
                </div>
              )}
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Administrator" : "Guide"}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  console.error('Logout error:', error);
                  // Fallback to manual redirect if logout fails
                  window.location.href = '/auth';
                }
              }}
              disabled={isLoggingOut}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Logout"
            >
              <LogOut className={`h-4 w-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
