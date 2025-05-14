import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, ChevronsUpDown } from "lucide-react";

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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Addon>({
    name: "",
    description: "",
    price: 0,
    isOptional: true,
  });

  // Update form field
  const updateField = (field: keyof Addon, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Add new addon
  const handleAddAddon = () => {
    if (!formData.name || formData.price < 0) {
      return; // Simple validation
    }
    
    onChange([...addons, { ...formData, id: Date.now() }]);
    setFormData({
      name: "",
      description: "",
      price: 0,
      isOptional: true,
    });
    setShowForm(false);
  };

  // Remove an addon
  const removeAddon = (index: number) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    onChange(newAddons);
  };

  // Move addon up or down in the list
  const moveAddon = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === addons.length - 1)
    ) {
      return;
    }
    
    const newAddons = [...addons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newAddons[index], newAddons[targetIndex]] = 
      [newAddons[targetIndex], newAddons[index]];
    
    onChange(newAddons);
  };

  return (
    <div className="space-y-4">
      {/* Existing addons */}
      {addons.length > 0 && (
        <div className="space-y-3">
          {addons.map((addon, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{addon.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {addon.description}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="font-medium text-sm">
                          ${addon.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`addon-optional-${index}`}
                        checked={addon.isOptional}
                        onCheckedChange={(checked) => {
                          const newAddons = [...addons];
                          newAddons[index].isOptional = !!checked;
                          onChange(newAddons);
                        }}
                      />
                      <label 
                        htmlFor={`addon-optional-${index}`}
                        className="text-sm text-muted-foreground"
                      >
                        Optional add-on
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      onClick={() => moveAddon(index, 'up')}
                    >
                      <span className="sr-only">Move up</span>
                      <ChevronsUpDown className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === addons.length - 1}
                      className="h-8 w-8 p-0"
                      onClick={() => moveAddon(index, 'down')}
                    >
                      <span className="sr-only">Move down</span>
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                      onClick={() => removeAddon(index)}
                    >
                      <span className="sr-only">Remove</span>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new addon form */}
      {showForm ? (
        <div className="border rounded-md p-4 space-y-4">
          <h4 className="font-medium text-sm">Add New Add-on</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="addon-name">Name</Label>
              <Input
                id="addon-name"
                placeholder="e.g., Gun Rental, Extra Ammo"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="addon-description">Description (optional)</Label>
              <Textarea
                id="addon-description"
                placeholder="Describe the add-on..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addon-price">Price ($)</Label>
                <Input
                  id="addon-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="flex items-end pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="addon-optional"
                    checked={formData.isOptional}
                    onCheckedChange={(checked) => updateField('isOptional', !!checked)}
                  />
                  <label 
                    htmlFor="addon-optional"
                    className="text-sm text-muted-foreground"
                  >
                    Make this add-on optional
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              size="sm"
              onClick={handleAddAddon}
              disabled={!formData.name || formData.price < 0}
            >
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Add-on
        </Button>
      )}
    </div>
  );
}