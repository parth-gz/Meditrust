import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, User, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Appointment {
  id: string;
  patientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '1', patientName: 'John Doe', date: '2024-01-20', time: '10:00 AM', status: 'pending' },
    { id: '2', patientName: 'Jane Smith', date: '2024-01-20', time: '11:00 AM', status: 'pending' },
  ]);

  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    duration: 30,
  });

  const handleAccept = async (id: string) => {
    try {
      await api.post(`/appointments/${id}/accept`);
      setAppointments(apps => apps.map(app => 
        app.id === id ? { ...app, status: 'confirmed' as const } : app
      ));
      toast.success('Appointment accepted');
    } catch (error) {
      toast.error('Failed to accept appointment');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/appointments/${id}/cancel`);
      setAppointments(apps => apps.map(app => 
        app.id === id ? { ...app, status: 'cancelled' as const } : app
      ));
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.startTime) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await api.post('/doctor/add-slot', newSlot);
      toast.success('Slot added successfully');
      setNewSlot({ date: '', startTime: '', duration: 30 });
    } catch (error) {
      toast.error('Failed to add slot');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
            <p className="text-muted-foreground">Manage your appointments and availability</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appointments */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <p className="font-medium text-foreground">
                              {appointment.patientName}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {appointment.date} at {appointment.time}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            appointment.status === 'confirmed'
                              ? 'bg-success/10 text-success'
                              : appointment.status === 'cancelled'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>

                      {appointment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={() => handleAccept(appointment.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleCancel(appointment.id)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add Availability */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Manage Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSlot.date}
                    onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newSlot.duration}
                    onChange={(e) => setNewSlot({ ...newSlot, duration: parseInt(e.target.value) })}
                  />
                </div>

                <Button onClick={handleAddSlot} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Slot
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

export default DoctorDashboard;
