import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";

// Define the Settings type to fix TypeScript errors
interface Settings {
  companyName?: string;
  bookingLink?: string;
  [key: string]: any;
}

export default function BookingLinkGenerator() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  const handleCopy = () => {
    if (settings?.bookingLink) {
      navigator.clipboard.writeText(settings.bookingLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Booking link copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Booking Link</h3>
        </div>
        <div className="p-4">
          <Skeleton className="h-4 w-full mb-3" />
          <div className="flex">
            <Skeleton className="h-10 flex-grow rounded-l-md" />
            <Skeleton className="h-10 w-16 rounded-r-md" />
          </div>
        </div>
      </div>
    );
  }

  // Use the company-specific link format as shown in the screenshots
  const companyName = settings?.companyName ? settings.companyName.toLowerCase().replace(/\s+/g, '-') : 'wilderness-adventures';
  const publicBookingLink = `https://outfitter.app/book/${companyName}`;
  const bookingLink = settings?.bookingLink || publicBookingLink;

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Booking Link</h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">Share this unique link with customers to let them book directly.</p>
        <div className="flex">
          <input
            type="text"
            value={bookingLink}
            readOnly
            className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <Button
            onClick={handleCopy}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-r-md text-sm font-medium"
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
