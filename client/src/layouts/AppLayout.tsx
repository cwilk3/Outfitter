import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, User, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, user } = useRole();
  const { user: authUser } = useAuth();
  
  // Get current role from URL or default to admin
  const urlParams = new URLSearchParams(window.location.search);
  const currentTestRole = (urlParams.get('role') as 'admin' | 'guide') || 'admin';

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const switchTestRole = () => {
    const newRole = currentTestRole === 'admin' ? 'guide' : 'admin';
    setCurrentTestRole(newRole);
    // Refresh the page to apply the role change
    window.location.href = `/?role=${newRole}`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white border-b border-gray-200 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <button 
                  onClick={toggleMobileMenu}
                  className="px-4 text-gray-500 lg:hidden focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center ml-2 lg:ml-0">
                  <h1 className="text-xl font-bold text-primary lg:hidden">Outfitter</h1>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* Role Test Button */}
                <Button
                  onClick={switchTestRole}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  {currentTestRole === 'admin' ? (
                    <>
                      <Shield className="h-4 w-4" />
                      Switch to Guide
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Switch to Admin
                    </>
                  )}
                </Button>
                
                <button className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none">
                  <Bell className="h-6 w-6" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-4 flex items-center gap-2 focus:outline-none">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl || undefined} alt="User" />
                        <AvatarFallback className="bg-primary text-white">
                          {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href="/api/logout" className="flex cursor-pointer items-center text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
