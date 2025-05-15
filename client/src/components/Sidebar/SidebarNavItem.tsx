import React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}

export default function SidebarNavItem({ 
  to, 
  icon, 
  children, 
  isActive, 
  onClick 
}: SidebarNavItemProps) {
  return (
    <Link 
      href={to}
      onClick={onClick}
      className={cn(
        "sidebar-item flex items-center px-3 py-3 text-sm font-medium rounded-md hover:bg-gray-100",
        isActive ? "active" : ""
      )}
    >
      <span className={cn("h-5 w-5 mr-3", isActive ? "text-primary" : "text-gray-500")}>
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}
