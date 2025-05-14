import React from "react";

interface StepsProps {
  currentStep: number;
  steps: string[];
  className?: string;
}

export function Steps({ currentStep, steps, className = "" }: StepsProps) {
  return (
    <div className={`w-full ${className}`}>
      <ol className="flex items-center w-full">
        {steps.map((step, index) => (
          <li
            key={index}
            className={`flex items-center ${
              index !== steps.length - 1 ? "w-full" : ""
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index + 1 <= currentStep
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600"
              } transition-all duration-300 ease-in-out`}
            >
              {index + 1 <= currentStep ? (
                <span className="font-medium text-xs">{index + 1}</span>
              ) : (
                <span className="font-medium text-xs">{index + 1}</span>
              )}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                index + 1 <= currentStep ? "text-primary" : "text-gray-500"
              }`}
            >
              {step}
            </span>
            {index !== steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index + 1 < currentStep
                    ? "bg-primary"
                    : "bg-gray-200"
                }`}
              ></div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}