import { useState, useEffect } from 'react';
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
  const [files, setFiles] = useState<File[]>([]);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  /** --------------------------------
   * Fetch upload history on page load
   * -------------------------------- */
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await api.get('/uploads/my');
        setUploadHistory(res.data);
      } catch (err) {
        console.error('Failed to load uploads', err);
      }
    };

    fetchUploads();
  }, []);

  /** --------------------------------
   * Handle multiple file selection
   * -------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    } else {
      setFiles([]);
    }
  };

  /** --------------------------------
   * Upload multiple files
   * -------------------------------- */
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
      if (uploads.length > 0) {
        navigate(`/summary/${uploads[0]}`);
      }

      // Refresh upload list
      const historyRes = await api.get('/uploads/my');
      setUploadHistory(historyRes.data);

    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              Upload your prescriptions and medical reports
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* ------------------ UPLOAD SECTION ------------------ */}
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
                    multiple
                    onChange={handleFileChange}
                    className="mb-2"
                  />

                  {files.length > 0 ? (
                    <div className="mt-2 w-full text-sm text-muted-foreground">
                      <p className="font-medium">Selected files:</p>
                      <ul className="list-disc ml-5">
                        {files.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No files selected</p>
                  )}
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Uploading…' : 'Upload & Analyze'}
                </Button>
              </CardContent>
            </Card>

            {/* ------------------ RECENT UPLOADS ------------------ */}
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
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/summary/${item.upload_id}`)}
                    >
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {item.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.status === "Processed"
                              ? "bg-success/10 text-success"
                              : "bg-yellow-100 text-yellow-700"
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
