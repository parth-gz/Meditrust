import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';

type UploadItem = {
  upload_id: number;
  type: string;
  created_at: string;
  status: string;
};

type Appointment = {
  appointment_id: number;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization: string;
  slot_start: string;
  status: string;
  slot_id: number;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadItem[]>([]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [canceling, setCanceling] = useState<number | null>(null);

  /** Fetch uploads */
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await api.get('/uploads/my');
        setUploadHistory(res.data || []);
      } catch (err) {
        console.error('Failed to load uploads', err);
      }
    };

    fetchUploads();
  }, []);

  /** Fetch appointments */
  useEffect(() => {
    const fetchAppointments = async () => {
      setAppointmentsLoading(true);

      try {
        const res = await api.get('/appointments/my'); // Your backend route
        if (Array.isArray(res.data)) {
          const mapped = res.data.map((a: any) => ({
            appointment_id: a.appointment_id,
            doctor_id: a.doctor_id,
            doctor_name: a.doctor_name,
            doctor_specialization: a.doctor_specialization,
            slot_start: a.slot_start, // ISO time from backend
            status: a.status,
            slot_id: a.slot_id
          }));
          setAppointments(mapped);
        }
      } catch (err) {
        console.error("Couldn't load appointments", err);
      }

      setAppointmentsLoading(false);
    };

    fetchAppointments();
  }, []);

  /** Upload handler */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files ? Array.from(e.target.files) : []);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('upload_type', 'prescription');
    formData.append('consent_cloud_ocr', 'true');

    try {
      const response = await api.post('/upload-multiple', formData);

      toast.success('Files uploaded successfully!');
      const uploads = response.data.uploads || [];
      if (uploads.length > 0) navigate(`/summary/${uploads[0]}`);

      const historyRes = await api.get('/uploads/my');
      setUploadHistory(historyRes.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  /** Cancel appointment */
  const handleCancelAppointment = async (appointmentId: number) => {
    setCanceling(appointmentId);

    try {
      await api.post(`/appointments/${appointmentId}/cancel`);
      toast.success('Appointment cancelled');

      setAppointments((prev) =>
        prev.map((a) =>
          a.appointment_id === appointmentId ? { ...a, status: 'cancelled' } : a
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel');
    } finally {
      setCanceling(null);
    }
  };

  /** Format time */
  const formatSlot = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString() +
      ' • ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">
              Upload your prescriptions and medical reports
            </p>
          </div>

          {/* GRID */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* LEFT COLUMN — Upload + Appointments */}
            <div className="space-y-6">

              {/* UPLOAD CARD */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Document
                  </CardTitle>
                  <CardDescription>
                    Upload your prescription or medical report for analysis
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8">
                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />

                    <Input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="mb-2"
                    />

                    {files.length > 0 ? (
                      <div className="mt-2 w-full text-sm text-muted-foreground">
                        <p className="font-medium">Selected files:</p>
                        <ul className="list-disc ml-5">
                          {files.map((f, i) => (
                            <li key={i}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No files selected
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                    className="w-full"
                  >
                    {isUploading ? 'Uploading…' : 'Upload & Analyze'}
                  </Button>
                </CardContent>
              </Card>

              {/* APPOINTMENTS CARD */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Your Appointments</CardTitle>
                  <CardDescription>
                    Pending, confirmed, and cancelled appointments
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {appointmentsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading appointments…
                    </p>
                  ) : appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No appointments booked yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((a) => (
                        <div
                          key={a.appointment_id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                        >
                          {/* LEFT INFO */}
                          <div>
                            <p className="font-medium text-lg">{a.doctor_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {a.doctor_specialization}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {formatSlot(a.slot_start)}
                            </p>
                          </div>

                          {/* RIGHT ACTIONS */}
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                a.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : a.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {a.status}
                            </span>

                            {(a.status === 'pending' ||
                              a.status === 'confirmed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCancelAppointment(a.appointment_id)
                                }
                                disabled={canceling === a.appointment_id}
                              >
                                {canceling === a.appointment_id
                                  ? 'Cancelling…'
                                  : 'Cancel'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN — Recent uploads */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Uploads
                </CardTitle>
                <CardDescription>Your document upload history</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {uploadHistory.length === 0 && (
                    <p className="text-muted-foreground text-sm">No uploads yet</p>
                  )}

                  {uploadHistory.map((item) => (
                    <div
                      key={item.upload_id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/summary/${item.upload_id}`)}
                    >
                      <div>
                        <p className="font-medium capitalize">{item.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.status === 'Processed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.status}
                        </span>

                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
