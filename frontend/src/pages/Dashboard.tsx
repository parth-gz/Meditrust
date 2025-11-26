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

  const [isUploading, setIsUploading] = useState(false);

  // temporary dummy history (backend integration later)
  const [uploadHistory] = useState([
    { id: '1', type: 'Prescription', date: '2024-01-15', status: 'Processed' },
    { id: '2', type: 'Medical Report', date: '2024-01-10', status: 'Processed' },
  ]);

  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files)); // store all selected files
    } else {
      setFiles([]);
    }
  };

  /** -----------------------------
   *  Upload multiple files -> hits /api/upload-multiple
   *  The axios interceptor attaches:
   *  Authorization: Bearer <token>
   *  ----------------------------- */
  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast.error('Please select at least one file first');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f)); // backend expects "files"
    formData.append('upload_type', 'prescription');
    formData.append('consent_cloud_ocr', 'true');

    try {
      const response = await api.post('/upload-multiple', formData);
      toast.success('Files uploaded successfully!');

      // backend returns { uploads: [id1, id2, ...] }
      const uploads: number[] = response.data.uploads || [];
      if (uploads.length > 0) {
        // navigate to first summary
        navigate(`/summary/${uploads[0]}`);
      } else {
        // fallback - show dashboard or history
        toast.success('Uploaded but no IDs returned');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      // optionally clear selection
      // setFiles([]);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">Upload your prescriptions and medical reports</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Document
                </CardTitle>
                <CardDescription>Upload your prescription or medical report for analysis</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground" />

                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="mb-2"
                  />

                  {files.length > 0 ? (
                    <div className="mt-2 w-full text-sm text-muted-foreground">
                      <p className="font-medium">Selected files:</p>
                      <ul className="list-disc ml-5">
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`}>{f.name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No files selected</p>
                  )}
                </div>

                <Button onClick={handleUpload} disabled={files.length === 0 || isUploading} className="w-full">
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
