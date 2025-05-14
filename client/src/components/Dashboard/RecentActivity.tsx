import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlusCircle, 
  CheckCircle, 
  Edit, 
  UserPlus,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities?limit=4');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
        </div>
        <div className="p-4">
          <div className="flow-root">
            <ul className="-mb-8">
              {[...Array(4)].map((_, index) => (
                <li key={index}>
                  <div className="relative pb-8">
                    {index < 3 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
        </div>
        <div className="p-4">
          <p className="text-red-600">Error loading recent activities</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (action: string) => {
    if (action.includes('Created') || action.includes('new')) {
      return (
        <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <PlusCircle className="h-5 w-5 text-white" />
        </span>
      );
    } else if (action.includes('Payment') || action.includes('completed')) {
      return (
        <span className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-white" />
        </span>
      );
    } else if (action.includes('Updated') || action.includes('edit')) {
      return (
        <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <Edit className="h-5 w-5 text-white" />
        </span>
      );
    } else if (action.includes('customer')) {
      return (
        <span className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-white" />
        </span>
      );
    } else {
      return (
        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
          <Clock className="h-5 w-5 text-white" />
        </span>
      );
    }
  };

  const formatActivityText = (activity: any) => {
    let text = activity.action;
    
    if (activity.details) {
      const details = activity.details;
      
      if (activity.action.includes('booking') && details.bookingNumber) {
        text += `: ${details.bookingNumber}`;
        
        if (details.customerName) {
          text += ` for ${details.customerName}`;
        }
      } else if (activity.action.includes('payment') && details.amount) {
        text += `: ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(details.amount)}`;
        
        if (details.bookingNumber) {
          text += ` for booking ${details.bookingNumber}`;
        }
      } else if (activity.action.includes('customer') && details.customerName) {
        text += `: ${details.customerName}`;
      } else if (activity.action.includes('experience') && details.name) {
        text += `: ${details.name}`;
      }
    }
    
    return text;
  };

  const formatActivityTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
      </div>
      <div className="p-4">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities && activities.length > 0 ? (
              activities.map((activity: any, index: number) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {index < activities.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-800">
                            {formatActivityText(activity)}
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>
                            {formatActivityTime(activity.createdAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li>
                <p className="text-gray-500">No recent activity</p>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-right">
        <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
          View all activity →
        </a>
      </div>
    </div>
  );
}
