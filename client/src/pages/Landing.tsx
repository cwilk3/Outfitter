import React from 'react';
import { AuthForms } from '@/components/AuthForms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mountain, Users, Calendar, DollarSign, Shield, Zap } from 'lucide-react';

export default function Landing() {
  const [showAuth, setShowAuth] = React.useState(false);

  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <AuthForms onSuccess={() => window.location.reload()} />
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowAuth(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Mountain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Outfitter</h1>
          </div>
          <Button onClick={() => setShowAuth(true)}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Manage Your Outdoor Business
            <span className="text-primary block">With Confidence</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline bookings, manage guides, track payments, and grow your hunting and fishing outfitter business with our comprehensive platform designed specifically for outdoor professionals.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => setShowAuth(true)} className="px-8">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Everything You Need to Succeed</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Booking Management</CardTitle>
                <CardDescription>
                  Effortlessly manage reservations, availability, and customer communications in one place.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Guide Scheduling</CardTitle>
                <CardDescription>
                  Assign guides, track their availability, and ensure every trip has the right expertise.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>
                  Secure payment collection, deposit tracking, and automated invoicing for seamless transactions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Build lasting relationships with detailed customer profiles and communication history.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-time Updates</CardTitle>
                <CardDescription>
                  Stay connected with live notifications, status updates, and team coordination tools.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Mountain className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Multi-Location Support</CardTitle>
                <CardDescription>
                  Manage multiple hunting and fishing locations with centralized oversight and control.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Transform Your Business?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of outfitters who trust our platform to manage their operations.
          </p>
          <Button size="lg" variant="secondary" onClick={() => setShowAuth(true)} className="px-8">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Mountain className="h-6 w-6" />
            <span className="text-lg font-semibold">Outfitter</span>
          </div>
          <p className="text-gray-400">
            © 2025 Outfitter. All rights reserved. Built for outdoor professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}