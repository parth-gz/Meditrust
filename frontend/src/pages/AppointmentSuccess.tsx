import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AppointmentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('id') || 'APT12345';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Appointment Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-lg bg-secondary/30 p-6">
              <p className="mb-2 text-sm text-muted-foreground">Your Appointment ID</p>
              <p className="text-2xl font-bold text-primary">{appointmentId}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Confirmation email sent to your registered email</p>
              <p>✓ SMS reminder will be sent before appointment</p>
              <p>✓ You can view details in your dashboard</p>
            </div>

            <Button onClick={() => navigate('/dashboard')} className="w-full gap-2">
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AppointmentSuccess;
