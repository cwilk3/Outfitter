import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormContext } from "react-hook-form";

export interface AddOn {
  id: number;
  name: string;
  description?: string;
  price: number;
  isOptional: boolean;
  inventory?: number;
  maxPerBooking?: number;
}

interface AddOnSelectorProps {
  addons: AddOn[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  guests: number;
}

export default function AddOnSelector({ addons, startDate, endDate, guests }: AddOnSelectorProps) {
  const { setValue, watch } = useFormContext();
  const selectedAddons = watch("addons") || [];
  
  // Track inventory per add-on
  const [remainingInventory, setRemainingInventory] = useState<Record<number, number>>(() => {
    const inventory: Record<number, number> = {};
    addons.forEach(addon => {
      inventory[addon.id] = addon.inventory || 999; // Use a high default if no inventory limit
    });
    return inventory;
  });

  const getQuantity = (addonId: number) => {
    const addon = selectedAddons.find((a: any) => a.id === addonId);
    return addon ? addon.quantity : 0;
  };

  const updateAddon = (addon: AddOn, quantity: number) => {
    // Ensure quantity doesn't exceed maxPerBooking or available inventory
    const maxAllowed = Math.min(
      addon.maxPerBooking || 999,
      remainingInventory[addon.id] + getQuantity(addon.id) || 999
    );
    
    const newQuantity = Math.max(0, Math.min(quantity, maxAllowed));
    
    // Find if the addon is already in the selected list
    const existingIndex = selectedAddons.findIndex((a: any) => a.id === addon.id);
    
    let updatedAddons;
    
    if (newQuantity > 0) {
      // If the addon exists, update the quantity
      if (existingIndex >= 0) {
        updatedAddons = [...selectedAddons];
        updatedAddons[existingIndex] = {
          id: addon.id,
          name: addon.name,
          price: addon.price,
          quantity: newQuantity
        };
      } else {
        // Otherwise add it to the list
        updatedAddons = [
          ...selectedAddons,
          {
            id: addon.id,
            name: addon.name,
            price: addon.price,
            quantity: newQuantity
          }
        ];
      }
    } else {
      // If quantity is 0, remove from the list if it exists
      if (existingIndex >= 0) {
        updatedAddons = selectedAddons.filter((a: any) => a.id !== addon.id);
      } else {
        updatedAddons = [...selectedAddons];
      }
    }
    
    setValue("addons", updatedAddons, { shouldValidate: true });
  };

  // Check if addon is available based on inventory
  const isAvailable = (addon: AddOn) => {
    return !addon.inventory || remainingInventory[addon.id] > 0 || getQuantity(addon.id) > 0;
  };

  if (!addons || addons.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Add-ons</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addons.map((addon) => {
          const quantity = getQuantity(addon.id);
          const isDisabled = !isAvailable(addon) && quantity === 0;
          const maxReached = 
            (addon.maxPerBooking && quantity >= addon.maxPerBooking) ||
            (quantity >= (remainingInventory[addon.id] + quantity));

          return (
            <Card key={addon.id} className={`${isDisabled ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{addon.name}</CardTitle>
                  <Badge variant={isDisabled ? "outline" : "default"}>
                    ${addon.price.toFixed(2)}
                  </Badge>
                </div>
                {addon.maxPerBooking && (
                  <div className="text-xs text-muted-foreground">
                    Max {addon.maxPerBooking} per booking
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {addon.description && (
                  <CardDescription className="text-sm mb-2">
                    {addon.description}
                  </CardDescription>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between pt-0">
                <div className="flex items-center space-x-1">
                  {addon.inventory && addon.inventory < 10 && (
                    <span className="text-xs text-muted-foreground">
                      {quantity > 0 
                        ? `${remainingInventory[addon.id] + quantity} available` 
                        : `${remainingInventory[addon.id]} available`}
                    </span>
                  )}
                  
                  {isDisabled && (
                    <span className="text-xs text-destructive font-medium ml-1">
                      Sold Out
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={quantity === 0 || isDisabled}
                    onClick={() => updateAddon(addon, quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="w-6 text-center">{quantity}</span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isDisabled || maxReached}
                    onClick={() => updateAddon(addon, quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}