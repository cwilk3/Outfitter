import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepsProps {
  steps: string[];
  currentStep: number;
}

export function Steps({ steps, currentStep }: StepsProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const isActive = currentStep >= index + 1;
          const isCompleted = currentStep > index + 1;
          
          return (
            <React.Fragment key={index}>
              {/* Step circle with number or check */}
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted border-muted-foreground/30 text-muted-foreground"
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
                    "flex-1 h-[2px] mx-2",
                    currentStep > index + 1 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}