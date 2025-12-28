import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api from '@/lib/axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

const Symptoms = () => {
  const navigate = useNavigate();

  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [loading, setLoading] = useState(false);

  const submitSymptoms = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    try {
      setLoading(true);

      // 1. Analyze symptoms using Gemini
      const analysis = await api.post('/symptoms/analyze', {
        symptoms,
        severity
      });

      // 2. Fetch doctors based on AI output
      const recommendation = await api.post('/recommend/from-symptoms', {
        condition: analysis.data.condition,
        recommended_specialist: analysis.data.recommended_specialist
      });

      // 3. Navigate to recommendation page
      navigate('/doctor-recommendations', {
        state: {
          condition: analysis.data.condition,
          explanation: analysis.data.explanation,
          specialist: analysis.data.recommended_specialist,
          doctors: recommendation.data.doctors
        }
      });

    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to recommend doctors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-10">
        <div className="container mx-auto max-w-3xl px-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Stethoscope className="h-7 w-7 text-primary" />
                <div>
                  <CardTitle>Describe Your Symptoms</CardTitle>
                  <CardDescription>
                    Tell us what you're experiencing so we can recommend the right doctor
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Symptoms</Label>
                <Textarea
                  placeholder="Example: fever, headache, sore throat..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-3">
                <Label>Severity</Label>
                <RadioGroup value={severity} onValueChange={setSeverity} className="flex gap-6">
                  {['mild', 'moderate', 'severe'].map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <RadioGroupItem value={level} id={level} />
                      <Label htmlFor={level}>{level}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Alert>
                <AlertDescription className="text-sm text-muted-foreground">
                  As an AI model, I can be wrong. Please consult a doctor before making medical decisions.
                </AlertDescription>
              </Alert>

              <Button onClick={submitSymptoms} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze & Recommend Doctors
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Symptoms;
