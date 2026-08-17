import { useState } from "react";
import { api } from "../lib/api";

const options = [
  { key: "spaeter_heute", label: "Später heute" },
  { key: "morgen", label: "Morgen" },
  { key: "in_3_tagen", label: "In 3 Tagen" },
  { key: "naechste_woche", label: "Nächste Woche" },
  { key: "custom", label: "Eigenes Datum" },
];

export function RescheduleSheet({
  contactId,
  contactName,
  onClose,
  onDone,
}: {
  contactId: string;
  contactName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(key: string) {
    if (key === "custom" && !customDate) return;
    setSaving(key);
    setError(null);
    try {
      await api.reschedule(contactId, { followUpOption: key, customDate: key === "custom" ? customDate : undefined });
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Der Termin konnte nicht verschoben werden.");
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-surface px-4 pb-8 pt-4 safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">{contactName} verschieben</h2>

        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => handlePick(o.key)}
              disabled={saving !== null}
              className="rounded-xl border border-border bg-base px-4 py-3 text-left text-sm font-medium text-ink disabled:opacity-50"
            >
              {saving === o.key ? "Speichern …" : o.label}
            </button>
          ))}
          {options.some((o) => o.key === "custom") && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="rounded-xl border border-border bg-base px-3 py-2 text-sm outline-none focus:border-brand"
            />
          )}
        </div>

        {error && <p className="mt-3 text-sm text-overdue">{error}</p>}
      </div>
    </div>
  );
}
