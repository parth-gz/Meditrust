import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Allergy {
  allergy_id: number;
  name: string;
}

interface SelectedAllergy {
  allergy_id?: number; // undefined = newly added
  name: string;
}

const MedicalProfile = () => {
  const navigate = useNavigate();

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [selected, setSelected] = useState<SelectedAllergy[]>([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [conditions, setConditions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ----------------------------
  // Load allergies from backend
  // ----------------------------
  useEffect(() => {
    const fetchAllergies = async () => {
      try {
        const res = await api.get("/allergies");
        setAllergies(res.data);
      } catch {
        toast.error("Failed to load allergies");
      }
    };

    fetchAllergies();
  }, []);

  // ----------------------------
  // Filter suggestions
  // ----------------------------
  const filtered = allergies.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) &&
      !selected.some((s) => s.name.toLowerCase() === a.name.toLowerCase())
  );

  // ----------------------------
  // Save medical profile
  // ----------------------------
  const handleSave = async () => {
    if (selected.length === 0 && !conditions.trim()) {
      toast.error("Please add at least one allergy or condition");
      return;
    }

    setIsSaving(true);

    try {
      const existingIds = selected
        .filter((a) => a.allergy_id)
        .map((a) => a.allergy_id);

      const newAllergies = selected
        .filter((a) => !a.allergy_id)
        .map((a) => a.name);

      const conditionList = conditions
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      await api.post("/medical-profile", {
        allergies: existingIds,
        new_allergies: newAllergies,
        conditions: conditionList,
      });

      toast.success("Medical profile saved");
      navigate("/choose-action");
    } catch {
      toast.error("Failed to save medical profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Medical Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            This information helps us keep you safe and recommend the right
            doctors.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ---------------- Allergies ---------------- */}
          <div>
            <label className="block font-medium mb-2">Known Allergies</label>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {selected.map((a, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {a.name}
                  <button
                    onClick={() =>
                      setSelected(selected.filter((_, i) => i !== idx))
                    }
                    className="text-xs font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* Search input */}
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="Search or add allergy"
              className="w-full rounded border px-3 py-2"
            />

            {/* Dropdown */}
            {showDropdown && query && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded border bg-white">
                {filtered.map((a) => (
                  <div
                    key={a.allergy_id}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                    onClick={() => {
                      setSelected([...selected, a]);
                      setQuery("");
                      setShowDropdown(false);
                    }}
                  >
                    {a.name}
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div
                    className="cursor-pointer px-3 py-2 text-blue-600 hover:bg-gray-100"
                    onClick={() => {
                      setSelected([...selected, { name: query }]);
                      setQuery("");
                      setShowDropdown(false);
                    }}
                  >
                    ➕ Add “{query}”
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- Conditions ---------------- */}
          <div>
            <label className="block font-medium mb-2">
              Existing Conditions
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Example: Diabetes, Hypertension, Asthma"
              className="w-full rounded border px-3 py-2"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple conditions with commas
            </p>
          </div>

          {/* ---------------- Save ---------------- */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Medical Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalProfile;
