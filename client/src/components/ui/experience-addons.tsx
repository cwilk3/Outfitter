import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlusCircle, Tag, Trash2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Addon {
  id?: number;
  name: string;
  description: string;
  price: number;
  isOptional: boolean;
}

interface ExperienceAddonsProps {
  addons: Addon[];
  onChange: (addons: Addon[]) => void;
}

export function ExperienceAddons({ addons = [], onChange }: ExperienceAddonsProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState<number | "">(0);
  const [isOptional, setIsOptional] = React.useState(true);
  
  const addAddon = () => {
    if (!name || price === "") return;
    
    const newAddon: Addon = {
      name,
      description,
      price: Number(price),
      isOptional
    };
    
    onChange([...addons, newAddon]);
    
    // Reset form
    setName("");
    setDescription("");
    setPrice(0);
    setIsOptional(true);
  };
  
  const removeAddon = (index: number) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    onChange(newAddons);
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  return (
    <div className="space-y-6">
      {/* Add-ons Form */}
      <div className="space-y-4 p-4 border rounded-md bg-muted/20">
        <h4 className="text-sm font-medium mb-1">Add New Add-on</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addon-name">Name</Label>
            <div className="mt-1 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input 
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Equipment Rental"
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="addon-price">Price</Label>
            <div className="mt-1 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input 
                id="addon-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="addon-description">Description</Label>
          <Textarea 
            id="addon-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this add-on includes"
            className="resize-none"
            rows={2}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch 
              id="addon-optional" 
              checked={isOptional}
              onCheckedChange={setIsOptional}
            />
            <Label htmlFor="addon-optional" className="cursor-pointer">
              Optional (customers can choose to add)
            </Label>
          </div>
          
          <Button 
            onClick={addAddon}
            type="button"
            disabled={!name || price === ""}
            size="sm"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
      
      {/* List of Add-ons */}
      {addons.length > 0 ? (
        <div className="border rounded-md divide-y">
          {addons.map((addon, index) => (
            <div key={index} className="p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{addon.name}</h4>
                  <span className="text-sm font-medium text-primary">
                    {formatPrice(addon.price)}
                  </span>
                  <span 
                    className={cn(
                      "text-xs rounded-full px-2 py-0.5",
                      addon.isOptional 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {addon.isOptional ? "Optional" : "Required"}
                  </span>
                </div>
                
                {addon.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {addon.description}
                  </p>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="text-muted-foreground hover:text-destructive h-8 w-8"
                onClick={() => removeAddon(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed rounded-md bg-muted/30">
          <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-sm font-medium mb-1">No Add-ons Added</h3>
          <p className="text-sm text-muted-foreground">
            Create add-ons like equipment rental, guide fees, or meals
          </p>
        </div>
      )}
    </div>
  );
}