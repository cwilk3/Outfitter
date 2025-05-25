import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changePeriod?: string;
  iconBgClass?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  changePeriod = "from last week",
  iconBgClass = "bg-primary bg-opacity-10"
}: StatCardProps) {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={cn("p-3 rounded-full", iconBgClass)}>
          {icon}
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4">
          <p className="text-sm flex items-center">
            <span 
              className={cn(
                "font-medium flex items-center",
                isPositiveChange ? "text-green-600" : "",
                isNegativeChange ? "text-red-600" : "",
                !isPositiveChange && !isNegativeChange ? "text-gray-500" : ""
              )}
            >
              {isPositiveChange && (
                <ArrowUp className="h-4 w-4 mr-1" />
              )}
              {isNegativeChange && (
                <ArrowDown className="h-4 w-4 mr-1" />
              )}
              {isPositiveChange ? '+' : ''}{change}
            </span>
            <span className="ml-1 text-gray-500">{changePeriod}</span>
          </p>
        </div>
      )}
    </div>
  );
}
