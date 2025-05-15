import React from "react";
import StatsOverview from "@/components/Dashboard/StatsOverview";
import UpcomingBookings from "@/components/Dashboard/UpcomingBookings";
import QuickActions from "@/components/Dashboard/QuickActions";
import BookingLinkGenerator from "@/components/Dashboard/BookingLinkGenerator";
import CalendarView from "@/components/Calendar/CalendarView";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { isAdmin } = useRole();

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-600">Welcome back! Here's an overview of your business.</p>
      </div>

      {/* Stats Overview and Quick Links Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Stats */}
        <div className="lg:col-span-2">
          <StatsOverview />
        </div>
        
        {/* Quick Access Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <QuickActions />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar and Bookings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Preview */}
        <div className="lg:col-span-2">
          <CalendarView />
        </div>

        {/* Sidebar Components */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upcoming Bookings */}
          <UpcomingBookings />
          
          {/* Booking Link Generator - For Admins Only */}
          {isAdmin && (
            <Card>
              <CardContent className="pt-6">
                <BookingLinkGenerator />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
