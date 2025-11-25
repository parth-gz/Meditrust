import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Activity, Shield, Users, Stethoscope } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="flex-1 bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-12 w-12 text-primary" />
          </div>
          
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-6xl">
            Welcome to <span className="text-primary">Meditrust+</span>
          </h1>
          
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Your trusted healthcare companion. Upload prescriptions, get expert recommendations, 
            and book appointments with top doctors in your area.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Why Choose Meditrust+?
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Secure & Trusted</h3>
              <p className="text-muted-foreground">
                Your medical data is encrypted and stored securely with industry-leading standards.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Expert Doctors</h3>
              <p className="text-muted-foreground">
                Connect with verified healthcare professionals specialized in various fields.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Easy Booking</h3>
              <p className="text-muted-foreground">
                Book appointments seamlessly with real-time availability and instant confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
