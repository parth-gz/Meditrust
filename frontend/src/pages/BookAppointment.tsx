import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

interface SlotDetails {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  doctor: {
    name: string;
    specialization: string;
    clinicAddress: string;
  };
}

const BookAppointment = () => {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<SlotDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchSlotDetails = async () => {
      try {
        // In real app, fetch slot details by ID
        // For now, using mock data
        setSlot({
          id: slotId!,
          date: '2024-01-20',
          startTime: '10:00 AM',
          duration: 30,
          doctor: {
            name: 'Dr. Sarah Johnson',
            specialization: 'Cardiologist',
            clinicAddress: '123 Medical Center, Mumbai',
          },
        });
      } catch (error) {
        console.error('Failed to fetch slot details', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlotDetails();
  }, [slotId]);

  const handleBooking = async () => {
    setIsBooking(true);

    try {
      const response = await api.post('/book-appointment', {
        slotId: slot?.id,
      });
      toast.success('Appointment booked successfully!');
      navigate(`/appointment-success?id=${response.data.appointmentId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!slot) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Slot not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">Confirm Appointment</h1>
            <p className="text-muted-foreground">Review and confirm your booking</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Doctor Info */}
              <div className="rounded-lg bg-secondary/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  <span className="font-semibold">Doctor</span>
                </div>
                <p className="text-lg font-medium text-foreground">{slot.doctor.name}</p>
                <p className="text-sm text-muted-foreground">{slot.doctor.specialization}</p>
                <p className="mt-2 text-sm text-muted-foreground">{slot.doctor.clinicAddress}</p>
              </div>

              {/* Date & Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">Date</span>
                  </div>
                  <p className="text-lg font-medium text-foreground">{slot.date}</p>
                </div>

                <div className="rounded-lg bg-secondary/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold">Time</span>
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {slot.startTime} ({slot.duration} min)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Go Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleBooking}
                  disabled={isBooking}
                >
                  {isBooking ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookAppointment;
