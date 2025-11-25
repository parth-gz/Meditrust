import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, Clock, AlertCircle, Stethoscope } from 'lucide-react';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Summary {
  medicines: Medicine[];
  condition: string;
  explanation: string;
}

const PrescriptionSummary = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get(`/upload/${uploadId}/summary`);
        setSummary(response.data);
      } catch (error) {
        console.error('Failed to fetch summary', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [uploadId]);

  if (isLoading) return <LoadingSpinner />;

  if (!summary) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">No summary found</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Prescription Summary</h1>
            <p className="text-muted-foreground">Analysis of your medical prescription</p>
          </div>

          {/* Condition Card */}
          <Card className="mb-6 border-l-4 border-l-primary shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Diagnosed Condition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-foreground">{summary.condition}</p>
              <p className="mt-2 text-muted-foreground">{summary.explanation}</p>
            </CardContent>
          </Card>

          {/* Medicines List */}
          <Card className="mb-6 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Prescribed Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.medicines.map((medicine, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {medicine.name}
                    </h3>
                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <span className="font-medium text-muted-foreground">Dosage:</span>
                        <p className="text-foreground">{medicine.dosage}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Frequency:</span>
                        <p className="text-foreground">{medicine.frequency}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Duration:</span>
                        <p className="text-foreground">{medicine.duration}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate(`/recommend/${summary.condition}`)}
              className="gap-2"
            >
              <Stethoscope className="h-5 w-5" />
              Find a Doctor
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrescriptionSummary;
