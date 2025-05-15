import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepsProps {
  steps: string[];
  currentStep: number;
  clickable?: boolean;
  onStepClick?: (step: number) => void;
}

export function Steps({ steps, currentStep, clickable = false, onStepClick }: StepsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep >= index + 1;
          const isCompleted = currentStep > index + 1;
          
          return (
            <div key={index} className="flex items-center flex-grow" style={{ width: index === 0 || index === steps.length - 1 ? 'auto' : '100%' }}>
              {/* Step container */}
              <div 
                className={cn(
                  "flex flex-col items-center relative z-10",
                  clickable && onStepClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                )}
                onClick={() => {
                  if (clickable && onStepClick) {
                    onStepClick(index + 1);
                  }
                }}
              >
                {/* Circle */}
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted border-muted-foreground/30 text-muted-foreground",
                    clickable && "shadow-sm"  
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                
                {/* Step label */}
                <span 
                  className={cn(
                    "text-xs mt-1 text-center font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              
              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-[2px] mx-2 flex-grow",
                    currentStep > index + 1 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}