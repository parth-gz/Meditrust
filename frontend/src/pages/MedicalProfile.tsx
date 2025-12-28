import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Allergy {
  allergy_id: number;
  name: string;
}

interface SelectedAllergy {
  id?: number;
  name: string;
}

export default function MedicalProfile() {
  const navigate = useNavigate();

  // Core profile
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [smoker, setSmoker] = useState(false);
  const [alcohol, setAlcohol] = useState(false);

  // Allergies
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [selected, setSelected] = useState<SelectedAllergy[]>([]);
  const [query, setQuery] = useState("");

  // Conditions
  const [conditions, setConditions] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/allergies").then(res => setAllergies(res.data));
  }, []);

  const suggestions = allergies.filter(
    a =>
      a.name.toLowerCase().includes(query.toLowerCase()) &&
      !selected.some(s => s.name.toLowerCase() === a.name.toLowerCase())
  );

  const saveProfile = async () => {
    if (!dob || !gender || !bloodGroup) {
      toast.error("Please complete required fields");
      return;
    }

    setSaving(true);
    try {
      await api.post("/me/medical-profile", {
        date_of_birth: dob,
        gender,
        blood_group: bloodGroup,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        is_smoker: smoker,
        alcohol_use: alcohol,
        allergies: selected.map(a => ({
          id: a.id,
          name: a.name,
        })),
        conditions: conditions
          .split(",")
          .map(c => c.trim())
          .filter(Boolean),
      });

      toast.success("Medical profile saved");
      navigate("/choose-action");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Medical Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            This information helps us validate prescriptions and recommend the right doctors.
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* BASIC INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>

            <div>
              <Label>Gender</Label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <Label>Blood Group</Label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
              >
                <option value="">Select</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Height (cm)</Label>
              <Input value={height} onChange={e => setHeight(e.target.value)} />
            </div>

            <div>
              <Label>Weight (kg)</Label>
              <Input value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          </div>

          {/* LIFESTYLE */}
          <div className="flex gap-10">
            <div className="flex items-center gap-3">
              <Switch checked={smoker} onCheckedChange={setSmoker} />
              <Label>Smoker</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={alcohol} onCheckedChange={setAlcohol} />
              <Label>Alcohol use</Label>
            </div>
          </div>

          {/* ALLERGIES */}
          <div>
            <Label>Known Allergies</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selected.map((a, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelected(selected.filter((_, idx) => idx !== i))
                  }
                >
                  {a.name} ✕
                </Badge>
              ))}
            </div>

            <Input
              className="mt-3"
              placeholder="Search or add allergy"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            {query && (
              <div className="mt-2 border rounded-md bg-background max-h-40 overflow-y-auto">
                {suggestions.map(a => (
                  <div
                    key={a.allergy_id}
                    className="px-3 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelected([...selected, { id: a.allergy_id, name: a.name }]);
                      setQuery("");
                    }}
                  >
                    {a.name}
                  </div>
                ))}

                {suggestions.length === 0 && (
                  <div
                    className="px-3 py-2 text-sm text-primary cursor-pointer"
                    onClick={() => {
                      setSelected([...selected, { name: query }]);
                      setQuery("");
                    }}
                  >
                    Add “{query}”
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONDITIONS */}
          <div>
            <Label>Existing Conditions</Label>
            <textarea
              className="w-full mt-2 rounded-md border px-3 py-2"
              rows={3}
              placeholder="Diabetes, Asthma"
              value={conditions}
              onChange={e => setConditions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple conditions with commas
            </p>
          </div>

          <div className="pt-4">
            <Button className="w-full md:w-auto" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
