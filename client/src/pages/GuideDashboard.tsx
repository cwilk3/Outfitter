import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Clock, Star, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface GuideExperience {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: string;
  capacity: number;
  locationId: number;
  location: {
    name: string;
    address: string;
  };
  isPrimary: boolean;
}

interface GuideBooking {
  id: number;
  bookingNumber: string;
  experienceId: number;
  experienceName: string;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  status: string;
  totalAmount: string;
  location: {
    name: string;
    address: string;
  };
}

export default function GuideDashboard() {
  const { user } = useAuth();

  // Fetch guide's assigned experiences
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<GuideExperience[]>({
    queryKey: ["/api/guides", user?.id, "experiences"],
    enabled: !!user?.id,
  });

  // Fetch guide's upcoming bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<GuideBooking[]>({
    queryKey: ["/api/guides", user?.id, "bookings"],
    enabled: !!user?.id,
  });

  // Calculate stats
  const upcomingBookings = bookings.filter((booking: GuideBooking) => 
    new Date(booking.startDate) >= new Date()
  ).length;

  const thisWeekBookings = bookings.filter((booking: GuideBooking) => {
    const bookingDate = new Date(booking.startDate);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return bookingDate >= today && bookingDate <= weekFromNow;
  }).length;

  const primaryExperiences = experiences.filter((exp: GuideExperience) => exp.isPrimary).length;

  if (experiencesLoading || bookingsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-gray-500 text-sm font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'Guide'}!
          </h1>
          <p className="text-gray-600 mt-1">Here's your guide dashboard overview</p>
        </div>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings}</div>
            <p className="text-xs text-muted-foreground">
              Total scheduled trips
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekBookings}</div>
            <p className="text-xs text-muted-foreground">
              Bookings in next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Experiences</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experiences.length}</div>
            <p className="text-xs text-muted-foreground">
              Total experience types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Guide</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{primaryExperiences}</div>
            <p className="text-xs text-muted-foreground">
              Leading these experiences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="experiences">My Experiences</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No upcoming bookings</p>
                  <p className="text-sm">New bookings will appear here automatically</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings
                    .filter((booking: GuideBooking) => new Date(booking.startDate) >= new Date())
                    .sort((a: GuideBooking, b: GuideBooking) => 
                      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                    )
                    .map((booking: GuideBooking) => (
                      <Card key={booking.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{booking.experienceName}</h3>
                                <Badge variant="outline">{booking.bookingNumber}</Badge>
                                <Badge 
                                  variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(booking.startDate), 'MMM d, yyyy')} - 
                                  {format(new Date(booking.endDate), 'MMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {booking.guestCount} guests
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {booking.location?.name}
                                </div>
                              </div>
                              <p className="text-sm">
                                Customer: {booking.customerFirstName} {booking.customerLastName}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${booking.totalAmount}</p>
                              <Button variant="outline" size="sm" className="mt-2">
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Experiences</CardTitle>
            </CardHeader>
            <CardContent>
              {experiences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No experiences assigned</p>
                  <p className="text-sm">Contact your administrator to get assigned to experiences</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {experiences.map((experience: GuideExperience) => (
                    <Card key={experience.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold">{experience.name}</h3>
                            {experience.isPrimary && (
                              <Badge className="bg-amber-500">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {experience.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {experience.duration}h
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                Max {experience.capacity}
                              </div>
                            </div>
                            <span className="font-semibold">${experience.price}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {experience.location?.name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}