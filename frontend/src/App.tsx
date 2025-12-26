import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import MedicalProfile from "./pages/MedicalProfile";
import Login from "./pages/Login";
import ChooseAction from './pages/ChooseAction';
import Symptoms from './pages/Symptoms';
import Dashboard from "./pages/Dashboard";
import PrescriptionSummary from "./pages/PrescriptionSummary";
import DoctorRecommendation from "./pages/DoctorRecommendation";
import DoctorProfile from "./pages/DoctorProfile";
import BookAppointment from "./pages/BookAppointment";
import AppointmentSuccess from "./pages/AppointmentSuccess";
import DoctorDashboard from "./pages/DoctorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/choose-action" element={<ChooseAction />} />
            <Route path="/symptoms" element={<ProtectedRoute><Symptoms /></ProtectedRoute>}/>
            <Route path="/doctor-recommendations" element={<ProtectedRoute><DoctorRecommendation /></ProtectedRoute>}/>

            
            {/* Patient Routes */}
            <Route
              path="/medical-profile"
              element={
                <ProtectedRoute>
                  <MedicalProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary/:uploadId"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PrescriptionSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recommend/:condition"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <DoctorRecommendation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/:doctorId"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/:slotId"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <BookAppointment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointment-success"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <AppointmentSuccess />
                </ProtectedRoute>
              }
            />

            {/* Doctor Routes */}
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
