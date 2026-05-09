// frontend/src/pages/DoctorDashboard.tsx

import { useEffect, useState, Fragment } from "react";
import api from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Appointment = {
  appointment_id: number;
  patient_name: string;
  date: string;
  time: string;
  status: string;
};

type Slot = {
  slot_id: number;
  slot_start: string; // iso
  slot_end: string; // iso
  is_booked: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DoctorDashboard = () => {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    duration: 30,
  });
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({
    date: "",
    startTime: "",
    duration: 30,
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    // start with first day of month
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // ISO date string yyyy-mm-dd

  // ------------------- load data -------------------
  useEffect(() => {
    loadAppointments();
    loadSlots();
  }, []);

  const loadAppointments = async () => {
    try {
      const res = await api.get("/doctor/appointments");
      setAppointments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    }
  };

  const loadSlots = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/doctor/${user.user_id}/slots`);
      // ensure slot_start/slot_end present
      const out = (res.data || []).map((s: any) => ({
        slot_id: s.slot_id,
        slot_start: s.slot_start,
        slot_end: s.slot_end,
        is_booked: !!s.is_booked,
      }));
      setSlots(out);
    } catch (err) {
      console.error("Failed to load slots", err);
    }
  };

  // ------------------- appointments actions -------------------
  const accept = async (id: number) => {
    try {
      await api.post(`/appointments/${id}/accept`);
      toast.success("Appointment accepted");
      loadAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Accept failed");
    }
  };

  const cancel = async (id: number) => {
    try {
      await api.post(`/appointments/${id}/cancel`);
      toast.success("Appointment cancelled");
      loadAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    }
  };

  // ------------------- slot create -------------------
  const addSlot = async () => {
    if (!newSlot.date || !newSlot.startTime)
      return toast.error("Please fill all fields");
    try {
      await api.post("/doctor/add-slot", {
        date: newSlot.date,
        startTime: newSlot.startTime,
        duration: newSlot.duration,
      });
      toast.success("Slot added");
      setNewSlot({ date: "", startTime: "", duration: 30 });
      loadSlots();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Add slot failed");
    }
  };

  // ------------------- slot delete -------------------
  const deleteSlot = async (slotId: number) => {
    if (!confirm("Delete this slot? This cannot be undone.")) return;
    try {
      await api.delete(`/doctor/slot/${slotId}`);
      toast.success("Slot deleted");
      loadSlots();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  // ------------------- slot edit -------------------
  const openEdit = (s: Slot) => {
    setEditingSlotId(s.slot_id);
    const dt = new Date(s.slot_start);
    const isoDate = dt.toISOString().slice(0, 10); // yyyy-mm-dd
    const hhmm = dt.toTimeString().slice(0, 5); // HH:MM
    setEditValues({
      date: isoDate,
      startTime: hhmm,
      duration: Math.round(
        (new Date(s.slot_end).getTime() - dt.getTime()) / 60000
      ),
    });
  };

  const saveEdit = async () => {
    if (!editingSlotId) return;
    const payload = {
      date: editValues.date,
      startTime: editValues.startTime,
      duration: editValues.duration,
    };
    try {
      await api.put(`/doctor/slot/${editingSlotId}`, payload);
      toast.success("Slot updated");
      setEditingSlotId(null);
      loadSlots();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
  };

  // ------------------- calendar helpers -------------------
  // returns array of { day: 1..n, iso: 'YYYY-MM-DD', dateObj }
  const monthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { day: number; iso: string; dateObj: Date }[] = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      const iso = dateObj.toISOString().slice(0, 10);
      days.push({ day: d, iso, dateObj });
    }
    return days;
  };

  const slotsByDate = (isoDate: string) => {
    return slots.filter((s) => s.slot_start.slice(0, 10) === isoDate);
  };

  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // ------------------- UI format helpers -------------------
  const formatSlotTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatSlotDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Column 1: Appointments */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-muted-foreground">No appointments yet.</p>
                ) : (
                  appointments.map((a) => (
                    <div
                      key={a.appointment_id}
                      className="border p-3 rounded mb-3"
                    >
                      <p className="font-semibold">{a.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.date} at {a.time}
                      </p>
                      <p className="text-xs">
                        Status: <strong>{a.status}</strong>
                      </p>
                      {a.status === "pending" && (
                        <div className="mt-2 flex gap-2">
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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Add Slot */}
            <Card>
              <CardHeader>
                <CardTitle>Add Slot</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Date */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={newSlot.date}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, date: e.target.value })
                      }
                    />
                  </div>

                  {/* Start time */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={newSlot.startTime}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, startTime: e.target.value })
                      }
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      value={newSlot.duration}
                      onChange={(e) =>
                        setNewSlot({
                          ...newSlot,
                          duration: Number(e.target.value),
                        })
                      }
                      min={5}
                      step={5}
                    />
                  </div>

                  <Button className="w-full" onClick={addSlot}>
                    Add Slot
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* My Slots list with Edit/Delete */}
            <Card>
              <CardHeader>
                <CardTitle>My Slots</CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground">No slots created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {slots.map((s) => {
                      const isEditing = editingSlotId === s.slot_id;
                      return (
                        <div key={s.slot_id} className="border rounded p-3">
                          {!isEditing ? (
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  {formatSlotDateTime(s.slot_start)}
                                </p>
                                <p
                                  className={`text-sm ${
                                    s.is_booked
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {s.is_booked ? "Booked" : "Available"}
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => openEdit(s)}
                                    disabled={s.is_booked}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteSlot(s.slot_id)}
                                    disabled={s.is_booked}
                                  >
                                    Delete
                                  </Button>
                                </div>
                                {s.is_booked && (
                                  <p className="text-xs text-muted-foreground">
                                    Cannot modify booked slot
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Edit form
                            <div className="space-y-2">
                              <Input
                                type="date"
                                value={editValues.date}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    date: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                type="time"
                                value={editValues.startTime}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    startTime: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                type="number"
                                value={editValues.duration}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    duration: Number(e.target.value),
                                  }))
                                }
                              />
                              <div className="flex gap-2">
                                <Button onClick={saveEdit}>Save</Button>
                                <Button variant="ghost" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2 & 3: Calendar (spans two columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Slots Calendar</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click a day to see slots
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={prevMonth}>
                      Prev
                    </Button>
                    <div className="font-medium">
                      {currentMonth.toLocaleString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <Button variant="ghost" onClick={nextMonth}>
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* calendar header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {DAYS.map((d) => (
                    <div key={d} className="font-semibold">
                      {d}
                    </div>
                  ))}
                </div>

                {/* calculate blank cells offset */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const days = monthDays();
                    const firstWeekday = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      1
                    ).getDay();
                    const blanks = Array.from({ length: firstWeekday }).map(
                      (_, i) => <div key={`b-${i}`} className="h-20"></div>
                    );
                    return (
                      <>
                        {blanks}
                        {days.map((d) => {
                          const dailySlots = slotsByDate(d.iso);
                          return (
                            <div
                              key={d.iso}
                              className={`h-20 border rounded p-1 cursor-pointer flex flex-col justify-between ${
                                selectedDay === d.iso
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`}
                              onClick={() => setSelectedDay(d.iso)}
                            >
                              <div className="text-sm text-muted-foreground">
                                {d.day}
                              </div>
                              <div className="text-right text-xs">
                                {dailySlots.length > 0 ? (
                                  <div className="inline-flex items-center gap-2">
                                    <span className="rounded-full px-2 py-0.5 bg-primary/10 text-primary text-xs">
                                      {dailySlots.length}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    —
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                {/* Selected day slots */}
                <div className="mt-4">
                  <h3 className="font-semibold">
                    Slots on {selectedDay ?? "select a day"}
                  </h3>
                  {!selectedDay ? (
                    <p className="text-sm text-muted-foreground">
                      Click any day in the calendar above to manage slots.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {slotsByDate(selectedDay).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No slots that day.
                        </p>
                      ) : (
                        slotsByDate(selectedDay).map((s) => (
                          <div
                            key={s.slot_id}
                            className="border rounded p-3 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">
                                {formatSlotTime(s.slot_start)}
                              </div>
                              <div
                                className={`text-sm ${
                                  s.is_booked
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {s.is_booked ? "Booked" : "Available"}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => openEdit(s)}
                                disabled={s.is_booked}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSlot(s.slot_id)}
                                disabled={s.is_booked}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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

export default DoctorDashboard;
