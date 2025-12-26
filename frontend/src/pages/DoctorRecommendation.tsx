import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Briefcase, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  rating: number;
  experience: number;
  clinic_address: string;
  consultation_fee: number;
}

const DoctorRecommendation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    navigate('/choose-action');
    return null;
  }

  const { condition, explanation, specialist, doctors } = state;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Recommended Doctors</h1>
            <p className="text-muted-foreground">
              Specialists for <span className="font-semibold text-primary">{specialist}</span>
            </p>
          </div>

          <Alert className="mb-6">
            <AlertDescription>
              <strong>Possible condition:</strong> {condition}
              <br />
              {explanation}
              <br />
              <span className="text-xs text-muted-foreground">
                As an AI model, I can be wrong. Please consult a doctor.
              </span>
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor: Doctor) => (
              <Card key={doctor.doctor_id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{doctor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {doctor.rating}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {doctor.experience} years experience
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    {doctor.clinic_address}
                  </div>

                  <Button
                    className="w-full mt-3"
                    onClick={() => navigate(`/doctor/${doctor.doctor_id}`)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorRecommendation;
