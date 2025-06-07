import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { UpcomingBooking } from "@/types";

export default function UpcomingBookings() {
  const { data: bookings = [], isLoading, error } = useQuery<UpcomingBooking[]>({
    queryKey: ['/api/dashboard/upcoming-bookings'],
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Upcoming Bookings</h3>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '550px' }}>
          <ul className="divide-y divide-gray-200">
            {[...Array(4)].map((_, index) => (
              <li key={index} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-20 mb-2" />
                    <div className="flex items-center mt-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24 ml-2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Upcoming Bookings</h3>
        </div>
        <div className="p-4">
          <p className="text-red-600">Error loading upcoming bookings</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'deposit_paid':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    if (isSameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`;
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Upcoming Bookings</h3>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '550px' }}>
        <ul className="divide-y divide-gray-200">
          {bookings && bookings.length > 0 ? (
            bookings.map((booking: any) => (
              <li key={booking.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{booking.experienceName}</h4>
                    <p className="text-sm text-gray-500">
                      {formatDateRange(booking.startDate, booking.endDate)}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        {booking.customerFirstName?.[0] || "C"}
                      </div>
                      <span className="ml-1.5 text-sm">
                        {booking.customerFirstName} {booking.customerLastName}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                      {booking.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {booking.guides && booking.guides.length > 0 && (
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        Guide: {booking.guides[0].guideFirstName && booking.guides[0].guideLastName 
                          ? `${booking.guides[0].guideFirstName} ${booking.guides[0].guideLastName}`
                          : 'Deleted Guide'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      {formatCurrency(booking.totalAmount)}
                    </span>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-4">
              <p className="text-gray-500">No upcoming bookings</p>
            </li>
          )}
        </ul>
      </div>
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-right">
        <Link 
          href="/bookings"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View all bookings →
        </Link>
      </div>
    </div>
  );
}
