import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Experience, Location } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface PublicExperiencesProps {
  experienceId?: number;
  companySlug?: string;
}

const PublicExperiences: React.FC<PublicExperiencesProps> = ({ experienceId, companySlug }) => {
  const [, setLocation] = useLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageTitle, setPageTitle] = useState<string>("Explore Experiences");

  // Fetch experiences
  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });
  
  // Fetch all locations for the filter
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });
  
  // Fetch experience-location mappings
  const { data: experienceLocations = [] } = useQuery<any[]>({
    queryKey: ['/api/experienceLocations'],
  });
  
  // Format experience category for display
  const formatCategory = (category: string | undefined) => {
    if (!category) return "Other";
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter experiences based on selected location and search query
  const filteredExperiences = experiences.filter(exp => {
    // Check if the experience matches the search query
    const matchesSearch = searchQuery === "" || 
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // If no location is selected, just check the search query
    if (selectedLocationId === "") {
      return matchesSearch;
    }
    
    // Check if the experience is associated with the selected location
    const isInSelectedLocation = experienceLocations.some(
      mapping => mapping.experienceId === exp.id && mapping.locationId === parseInt(selectedLocationId)
    );
    
    return matchesSearch && isInSelectedLocation;
  });

  // Get all locations for an experience
  const getExperienceLocations = (experienceId: number) => {
    const locationIds = experienceLocations
      .filter(el => el.experienceId === experienceId)
      .map(el => el.locationId);
    
    return locations.filter(loc => locationIds.includes(loc.id));
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Book Your Next Adventure</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover our range of guided hunting and fishing experiences. 
          Filter by location or search for specific adventures.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="w-full md:w-1/3">
          <Select
            value={selectedLocationId}
            onValueChange={setSelectedLocationId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name} - {location.city}, {location.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Search experiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Results */}
      {isLoadingExperiences || isLoadingLocations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video w-full bg-muted">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredExperiences.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No experiences found</h3>
          <p className="text-muted-foreground">
            Try changing your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperiences.map(experience => {
            const experienceLocations = getExperienceLocations(experience.id);
            
            return (
              <Card key={experience.id} className="overflow-hidden flex flex-col h-full">
                <div className="aspect-video w-full bg-muted overflow-hidden">
                  {experience.images && experience.images.length > 0 ? (
                    <img 
                      src={experience.images[0]} 
                      alt={experience.name} 
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Calendar className="h-12 w-12 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                
                <CardHeader>
                  <CardTitle className="text-xl">{experience.name}</CardTitle>
                  <CardDescription>{formatCategory(experience.category)}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {experience.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{experience.duration} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Max {experience.capacity} people</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${experience.price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{experienceLocations.length} locations</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {experienceLocations.map(location => (
                      <Badge key={location.id} variant="outline" className="text-xs">
                        {location.name}, {location.state}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation(`/book/${experience.id}`)}
                  >
                    View & Book
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PublicExperiences;