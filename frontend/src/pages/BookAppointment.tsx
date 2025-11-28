// frontend/src/pages/BookAppointment.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Slot {
  slot_id: number;
  slot_start: string;
  slot_end: string;
  doctor_name: string;
  doctor_specialization: string;
  clinic_address: string;
}

const BookAppointment = () => {
  const { slotId } = useParams();
  const navigate = useNavigate();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/slots/${slotId}`);
        setSlot(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slotId]);

  const handleBook = async () => {
    setBooking(true);
    try {
      const res = await api.post("/appointments", { slot_id: slot?.slot_id });
      toast.success("Appointment booked!");
      navigate(`/appointment-success?id=${res.data.appointment_id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!slot)
    return (
      <div>
        <Navbar />
        <div className="p-10 text-center">Slot not found</div>
        <Footer />
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Confirm Appointment</CardTitle>
          </CardHeader>

          <CardContent>
            <p><strong>Doctor:</strong> {slot.doctor_name}</p>
            <p><strong>Specialization:</strong> {slot.doctor_specialization}</p>
            <p><strong>Clinic:</strong> {slot.clinic_address}</p>
            <p><strong>Time:</strong> {new Date(slot.slot_start).toLocaleString()}</p>

            <Button className="w-full mt-6" disabled={booking} onClick={handleBook}>
              {booking ? "Booking..." : "Confirm Appointment"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default BookAppointment;
