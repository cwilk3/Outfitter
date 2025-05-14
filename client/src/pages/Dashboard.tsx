import React from "react";
import StatsOverview from "@/components/Dashboard/StatsOverview";
import UpcomingBookings from "@/components/Dashboard/UpcomingBookings";
import RecentActivity from "@/components/Dashboard/RecentActivity";
import QuickActions from "@/components/Dashboard/QuickActions";
import BookingLinkGenerator from "@/components/Dashboard/BookingLinkGenerator";
import CalendarView from "@/components/Calendar/CalendarView";
import { useRole } from "@/hooks/useRole";

export default function Dashboard() {
  const { isAdmin } = useRole();

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-600">Welcome back! Here's an overview of your business.</p>
      </div>

      {/* Stats Overview Cards */}
      <StatsOverview />

      {/* Calendar and Upcoming Bookings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Preview */}
        <div className="lg:col-span-2">
          <CalendarView />
        </div>

        {/* Upcoming Bookings */}
        <div className="lg:col-span-1">
          <UpcomingBookings />
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
          
          {/* Booking Link Generator - For Admins Only */}
          {isAdmin && <BookingLinkGenerator />}
        </div>
      </div>
    </>
  );
}
