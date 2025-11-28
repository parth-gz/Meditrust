// frontend/src/pages/DoctorProfile.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  rating: number;
  years_experience: number;
  languages: string[];
  clinic_address: string;
  city: string;
  consultation_fee: number;
  bio: string | null;
}

interface Slot {
  slot_id: number;
  slot_start: string;
  slot_end: string;
  is_booked: boolean;
}

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.get(`/doctor/${doctorId}`);
        setDoctor({
          doctor_id: d.data.doctor_id,
          name: d.data.name,
          specialization: d.data.specialization,
          rating: d.data.rating,
          years_experience: d.data.years_experience,
          languages: d.data.languages || [],
          clinic_address: d.data.clinic_address,
          city: d.data.city,
          consultation_fee: d.data.consultation_fee,
          bio: d.data.bio ?? "",
        });

        const s = await api.get(`/doctor/${doctorId}/slots`);
        setSlots(s.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [doctorId]);

  if (loading) return <LoadingSpinner />;

  if (!doctor)
    return (
      <div>
        <Navbar />
        <div className="p-10 text-center">Doctor not found</div>
        <Footer />
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{doctor.name}</CardTitle>
          </CardHeader>

          <CardContent>
            <p><strong>Specialization:</strong> {doctor.specialization}</p>
            <p><strong>Experience:</strong> {doctor.years_experience} years</p>
            <p><strong>Rating:</strong> ⭐ {doctor.rating}</p>
            <p><strong>Languages:</strong> {doctor.languages.join(", ")}</p>
            <p><strong>Clinic:</strong> {doctor.clinic_address}, {doctor.city}</p>
            <p><strong>Fees:</strong> ₹{doctor.consultation_fee}</p>

            <h2 className="mt-6 mb-3 text-xl font-semibold">Available Slots</h2>

            {slots.filter((s) => !s.is_booked).length === 0 ? (
              <p className="text-muted-foreground">No available slots</p>
            ) : (
              slots
                .filter((s) => !s.is_booked)
                .map((slot) => (
                  <Card key={slot.slot_id} className="mb-3 p-4">
                    <div className="flex justify-between items-center">
                      <span>{new Date(slot.slot_start).toLocaleString()}</span>
                      <Button onClick={() => navigate(`/book/${slot.slot_id}`)}>
                        Book
                      </Button>
                    </div>
                  </Card>
                ))
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorProfile;
