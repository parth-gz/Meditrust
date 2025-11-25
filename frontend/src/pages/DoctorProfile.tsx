import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Briefcase, Languages, DollarSign, Calendar, User } from 'lucide-react';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  available: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  experience: number;
  languages: string[];
  clinicAddress: string;
  city: string;
  consultationFee: number;
}

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorDetails = async () => {
      try {
        const [doctorRes, slotsRes] = await Promise.all([
          api.get(`/doctor/${doctorId}`),
          api.get(`/doctor/${doctorId}/slots`),
        ]);
        setDoctor(doctorRes.data);
        setSlots(slotsRes.data);
      } catch (error) {
        console.error('Failed to fetch doctor details', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorDetails();
  }, [doctorId]);

  if (isLoading) return <LoadingSpinner />;

  if (!doctor) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Doctor not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Doctor Info Card */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                  <p className="text-lg text-muted-foreground">{doctor.specialization}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-warning text-warning" />
                <span className="font-medium">{doctor.rating} Rating</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-5 w-5" />
                <span>{doctor.experience} years experience</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Languages className="h-5 w-5" />
                <span>{doctor.languages.join(', ')}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-5 w-5" />
                <span>₹{doctor.consultationFee} consultation fee</span>
              </div>

              <div className="flex items-start gap-2 text-muted-foreground md:col-span-2">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>{doctor.clinicAddress}, {doctor.city}</span>
              </div>
            </CardContent>
          </Card>

          {/* Available Slots */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Available Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`rounded-lg border p-4 ${
                      slot.available
                        ? 'border-border bg-card hover:border-primary'
                        : 'border-muted bg-muted/50 opacity-50'
                    }`}
                  >
                    <p className="mb-1 font-medium text-foreground">{slot.date}</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {slot.startTime} ({slot.duration} min)
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!slot.available}
                      onClick={() => navigate(`/book/${slot.id}`)}
                    >
                      {slot.available ? 'Book Now' : 'Not Available'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorProfile;
