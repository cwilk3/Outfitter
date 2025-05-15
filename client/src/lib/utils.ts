import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  
  const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  
  if (isSameMonth) {
    return `${format(start, "MMM d")}-${format(end, "d, yyyy")}`;
  }
  
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "??";
  
  const firstInitial = firstName ? firstName.charAt(0) : "";
  const lastInitial = lastName ? lastName.charAt(0) : "";
  
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'deposit_paid':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-primary bg-opacity-10 text-primary';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatStatus(status: string): string {
  return status
    .replace('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isFuture(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj >= today;
}

export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

export function generateBookingNumber(): string {
  const prefix = "B";
  const year = new Date().getFullYear().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  
  return `${prefix}-${year}-${random}`;
}
