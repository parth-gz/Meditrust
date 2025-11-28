// frontend/src/pages/DoctorRecommendation.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Briefcase, User } from 'lucide-react';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Doctor {
  id: number;                
  name: string;
  specialization: string;
  rating: number;
  experience: number;
  clinicAddress: string;
  city: string;
}

const DoctorRecommendation = () => {
  const { condition } = useParams();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/recommend?condition=${condition}`);

        // 🔥 FIX: Use doctor.doctor_id from backend
        const mapped = response.data.map((doc: any) => ({
          id: doc.doctor_id,               // correct field
          name: doc.name,
          specialization: doc.specialization,
          rating: doc.rating,
          experience: doc.experience,
          clinicAddress: doc.clinicAddress,
          city: doc.city,
        }));

        setDoctors(mapped);
      } catch (error) {
        console.error('Failed to fetch doctors', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctors();
  }, [condition]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Recommended Doctors</h1>
            <p className="text-muted-foreground">
              Specialists for <span className="font-semibold text-primary">{condition}</span> in your area
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <Card key={doctor.id} className="shadow-md transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{doctor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-medium">{doctor.rating}</span>
                    <span className="text-muted-foreground">Rating</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{doctor.experience} years experience</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{doctor.clinicAddress}, {doctor.city}</span>
                  </div>

                  <Button
                    onClick={() => navigate(`/doctor/${doctor.id}`)}
                    className="w-full"
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
