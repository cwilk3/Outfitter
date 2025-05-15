import React from "react";
import { Link } from "wouter";
import { useRole } from "@/hooks/useRole";
import { 
  PlusCircle,
  FileEdit,
  Calendar,
  FileText,
  CreditCard
} from "lucide-react";

interface QuickActionItemProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColorClass: string;
}

const QuickActionItem = ({ href, title, description, icon, bgColorClass }: QuickActionItemProps) => (
  <Link 
    href={href}
    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg"
  >
    <div className={`flex-shrink-0 ${bgColorClass} text-white p-2 rounded-md`}>
      {icon}
    </div>
    <div className="ml-3">
      <h4 className="text-sm font-medium text-gray-800">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </Link>
);

export default function QuickActions() {
  const { isAdmin } = useRole();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <QuickActionItem
            href="/bookings/new"
            title="Create New Booking"
            description="Add a new customer or experience"
            icon={<PlusCircle className="h-5 w-5" />}
            bgColorClass="bg-primary"
          />

          {isAdmin && (
            <QuickActionItem
              href="/payments/new"
              title="Generate Invoice"
              description="Create and send to customers"
              icon={<FileEdit className="h-5 w-5" />}
              bgColorClass="bg-secondary"
            />
          )}

          <QuickActionItem
            href="/calendar"
            title="Update Calendar"
            description="Manage guide availability"
            icon={<Calendar className="h-5 w-5" />}
            bgColorClass="bg-accent"
          />

          <QuickActionItem
            href="/documents/upload"
            title="Upload Document"
            description="Add waivers or permits"
            icon={<FileText className="h-5 w-5" />}
            bgColorClass="bg-blue-500"
          />

          {isAdmin && (
            <QuickActionItem
              href="/payments/process"
              title="Process Payment"
              description="Handle customer payments"
              icon={<CreditCard className="h-5 w-5" />}
              bgColorClass="bg-green-600"
            />
          )}
        </div>
      </div>
    </div>
  );
}
