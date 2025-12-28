import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

const PrescriptionSummary = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/upload/${uploadId}/summary`);
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  const validatePrescription = async () => {
    setIsValidating(true);
    try {
      const res = await api.post(`/prescription/${uploadId}/validate`);
      setValidation(res.data.validation);
    } catch (err) {
      console.error("Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const proceedToDoctors = () => {
    navigate("/doctor-recommendations", {
      state: {
        condition: summary.condition,
        explanation: validation.patient_advice,
        specialist: validation.recommended_specialist
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto max-w-3xl px-4 space-y-6">

          {/* SUMMARY */}
          <Card>
            <CardHeader>
              <CardTitle>Prescription Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold mb-2">Condition</p>
              <p>{summary.condition}</p>

              <p className="font-semibold mt-4 mb-2">Medicines</p>
              <ul className="list-disc pl-5">
                {summary.medicines?.map((m: any, idx: number) => (
                  <li key={idx}>
                    {m.name} — {m.dosage} ({m.frequency})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* VALIDATE BUTTON */}
          {!validation && (
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={validatePrescription}
              disabled={isValidating}
            >
              {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isValidating ? "Validating prescription..." : "Validate Prescription"}
            </Button>
          )}

          {/* VALIDATION RESULT */}
          {validation && (
            <>
              <Alert
                variant={validation.is_safe ? "default" : "destructive"}
                className="flex gap-3 items-start"
              >
                {validation.is_safe ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <AlertDescription>
                  <strong>
                    {validation.is_safe
                      ? "Prescription appears safe"
                      : "Potential safety issues detected"}
                  </strong>
                  <p className="mt-2">{validation.patient_advice}</p>
                </AlertDescription>
              </Alert>

              {validation.warnings?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5">
                      {validation.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button
                className="w-full mt-4"
                onClick={proceedToDoctors}
              >
                Find Recommended Doctors
              </Button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrescriptionSummary;
