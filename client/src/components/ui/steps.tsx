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
  // Create array for rendering steps and connector lines
  const items = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isActive = currentStep >= i + 1;
    const isCompleted = currentStep > i + 1;
    
    // Add step button
    items.push(
      <div 
        key={`step-${i}`}
        className={cn(
          "flex flex-col items-center justify-center",
          clickable && onStepClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        )}
        onClick={() => {
          if (clickable && onStepClick) {
            onStepClick(i + 1);
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
            <span>{i + 1}</span>
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
    );
    
    // Add connector line after all but last step
    if (i < steps.length - 1) {
      items.push(
        <div 
          key={`connector-${i}`}
          className={cn(
            "h-[2px] self-center w-full",
            currentStep > i + 1 
              ? "bg-primary" 
              : "bg-muted-foreground/30"
          )}
        />
      );
    }
  }
  
  return (
    <div className="w-full">
      <div className="grid" style={{ 
        display: "grid", 
        gridTemplateColumns: Array(steps.length)
          .fill(null)
          .map((_, i) => i < steps.length - 1 ? "auto 1fr" : "auto")
          .join(" "),
        gridGap: "0", 
        alignItems: "center" 
      }}>
        {items}
      </div>
    </div>
  );
}