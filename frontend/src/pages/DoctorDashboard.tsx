// frontend/src/pages/DoctorDashboard.tsx

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Slot {
  slot_id: number;
  slot_start: string;
  slot_end: string;
  is_booked: boolean;
}

interface Appointment {
  appointment_id: number;
  patient_name: string;
  date: string;
  time: string;
  status: string;
}

const DoctorDashboard = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    duration: 30,
  });

  useEffect(() => {
    loadSlots();
    loadAppointments();
  }, []);

  const loadSlots = async () => {
    const res = await api.get("/doctor/slots");
    setSlots(res.data);
  };

  const loadAppointments = async () => {
    const res = await api.get("/doctor/appointments");
    setAppointments(res.data);
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
    loadSlots();
  };

  const deleteSlot = async (slotId: number) => {
    await api.delete(`/doctor/slots/${slotId}`);
    toast.success("Slot deleted");
    loadSlots();
  };

  const acceptAppointment = async (id: number) => {
    await api.post(`/appointments/${id}/accept`);
    toast.success("Appointment accepted");
    loadAppointments();
  };

  const cancelAppointment = async (id: number) => {
    await api.post(`/appointments/${id}/cancel`);
    toast.success("Appointment cancelled");
    loadAppointments();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Your Slots</CardTitle>
            </CardHeader>
            <CardContent>
              {slots.map((s) => (
                <Card key={s.slot_id} className="p-3 mb-3">
                  <p>{new Date(s.slot_start).toLocaleString()}</p>
                  <p>Status: {s.is_booked ? "Booked" : "Available"}</p>

                  {!s.is_booked && (
                    <Button
                      variant="destructive"
                      className="mt-2"
                      onClick={() => deleteSlot(s.slot_id)}
                    >
                      Delete Slot
                    </Button>
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

          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.map((a) => (
                <Card key={a.appointment_id} className="p-3 mb-3">
                  <p className="font-semibold">{a.patient_name}</p>
                  <p>{a.date} at {a.time}</p>
                  <p>Status: {a.status}</p>

                  {a.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => acceptAppointment(a.appointment_id)}>
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => cancelAppointment(a.appointment_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorDashboard;
