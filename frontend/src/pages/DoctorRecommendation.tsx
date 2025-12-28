import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Briefcase } from "lucide-react";

const DoctorRecommendation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <>
        <Navbar />
        <div className="p-10 text-center">No doctors found.</div>
        <Footer />
      </>
    );
  }

  const { condition, explanation, specialist, doctors } = state;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-10 px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recommended Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Condition:</strong> {condition}</p>
            <p><strong>Specialist:</strong> {specialist}</p>
            <p className="mt-2 text-muted-foreground">{explanation}</p>
          </CardContent>
        </Card>

        {doctors.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No doctors found.
          </p>
        ) : (
          doctors.map((doctor: any) => (
            <Card key={doctor.doctor_id} className="mb-4">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold">{doctor.name}</h3>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  {doctor.years_experience} years experience
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" /> {doctor.rating}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {doctor.clinic_address}, {doctor.city}
                </div>

                <Button
                  className="w-full mt-3"
                  onClick={() => navigate(`/doctor/${doctor.doctor_id}`)}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DoctorRecommendation;
