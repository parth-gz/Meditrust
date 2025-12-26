import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Stethoscope } from 'lucide-react';

const ChooseAction = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold mb-2">How can I help you today?</h1>
            <p className="text-muted-foreground">
              Choose one of the options below to continue
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Validate Prescription */}
            <Card className="hover:shadow-lg transition cursor-pointer">
              <CardHeader>
                <FileCheck className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Validate Prescription</CardTitle>
                <CardDescription>
                  Upload a prescription and check if medicines are safe based on your allergies and conditions.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Validate Prescription
                </Button>
              </CardContent>
            </Card>

            {/* Search Doctor */}
            <Card className="hover:shadow-lg transition cursor-pointer">
              <CardHeader>
                <Stethoscope className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Search Doctor by Symptoms</CardTitle>
                <CardDescription>
                  Describe your symptoms and get doctor recommendations without a prescription.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/symptoms')}
                >
                  Search Doctors
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChooseAction;
