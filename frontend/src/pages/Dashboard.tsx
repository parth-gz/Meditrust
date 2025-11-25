import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // temporary dummy history (backend integration later)
  const [uploadHistory] = useState([
    { id: '1', type: 'Prescription', date: '2024-01-15', status: 'Processed' },
    { id: '2', type: 'Medical Report', date: '2024-01-10', status: 'Processed' },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  /** -----------------------------
   *  Upload file -> hits /api/upload
   *  The axios interceptor attaches:
   *  Authorization: Bearer <token>
   *  ----------------------------- */
  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_type', 'prescription');
    formData.append("consent_cloud_ocr", "true");


    try {
      const response = await api.post('/upload', formData); // no headers needed
      toast.success('File uploaded successfully!');

      const uploadId = response.data.uploadId;
      navigate(`/summary/${uploadId}`);

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              Upload your prescriptions and medical reports
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Section */}
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
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="mb-2"
                  />

                  {file && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Selected: {file.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Uploading…' : 'Upload & Analyze'}
                </Button>
              </CardContent>
            </Card>

            {/* Upload History */}
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
                  {uploadHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.type}</p>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
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
