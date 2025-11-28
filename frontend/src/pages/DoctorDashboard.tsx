// frontend/src/pages/DoctorDashboard.tsx

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Appointment {
  appointment_id: number;
  patient_name: string;
  date: string;
  time: string;
  status: string;
}

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    duration: 30,
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const res = await api.get("/doctor/appointments");
    setAppointments(res.data);
  };

  const accept = async (id: number) => {
    await api.post(`/appointments/${id}/accept`);
    toast.success("Appointment accepted");
    loadAppointments();
  };

  const cancel = async (id: number) => {
    await api.post(`/appointments/${id}/cancel`);
    toast.success("Appointment cancelled");
    loadAppointments();
  };

  const addSlot = async () => {
    if (!newSlot.date || !newSlot.startTime)
      return toast.error("Please fill all fields");

    await api.post("/doctor/add-slot", {
      date: newSlot.date,
      startTime: newSlot.startTime,
      duration: newSlot.duration,
    });

    toast.success("Slot added");
    setNewSlot({ date: "", startTime: "", duration: 30 });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.map((a) => (
                <Card key={a.appointment_id} className="p-4 mb-4">
                  <p className="font-semibold">{a.patient_name}</p>
                  <p>{a.date} at {a.time}</p>
                  <p>Status: {a.status}</p>

                  {a.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => accept(a.appointment_id)}>
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => cancel(a.appointment_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Add Slot */}
          <Card>
            <CardHeader>
              <CardTitle>Add Slot</CardTitle>
            </CardHeader>

            <CardContent>
              <Input
                type="date"
                className="mb-3"
                value={newSlot.date}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, date: e.target.value })
                }
              />
              <Input
                type="time"
                className="mb-3"
                value={newSlot.startTime}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, startTime: e.target.value })
                }
              />
              <Input
                type="number"
                className="mb-3"
                value={newSlot.duration}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, duration: Number(e.target.value) })
                }
              />

              <Button className="w-full" onClick={addSlot}>
                Add Slot
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorDashboard;
