import React from "react";
import StatCard from "./StatCard";
import { Calendar, DollarSign, Users, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg mb-8">
        <p className="text-red-600">Error loading dashboard statistics</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Upcoming Bookings"
        value={stats?.upcomingBookings || 0}
        icon={<Calendar className="h-6 w-6 text-primary" />}
        change={3}
        changePeriod="from last week"
      />
      
      <StatCard
        title="Monthly Revenue"
        value={formatCurrency(stats?.monthlyRevenue || 0)}
        icon={<DollarSign className="h-6 w-6 text-secondary" />}
        change={12}
        changePeriod="from last month"
        iconBgClass="bg-secondary bg-opacity-10"
      />
      
      <StatCard
        title="Active Customers"
        value={stats?.activeCustomers || 0}
        icon={<Users className="h-6 w-6 text-accent" />}
        change={4}
        changePeriod="new this week"
        iconBgClass="bg-accent bg-opacity-10"
      />
      
      <StatCard
        title="Completed Trips"
        value={stats?.completedTrips || 0}
        icon={<CheckCircle className="h-6 w-6 text-blue-500" />}
        change={8}
        changePeriod="from last year"
        iconBgClass="bg-blue-500 bg-opacity-10"
      />
    </div>
  );
}
