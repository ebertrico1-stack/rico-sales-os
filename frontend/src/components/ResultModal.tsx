import { useState } from "react";

const resultOptions = [
  { key: "interesse", label: "Interesse" },
  { key: "kein_interesse", label: "Kein Interesse" },
  { key: "rueckruf", label: "Rückruf" },
  { key: "termin_vereinbart", label: "Termin vereinbart" },
  { key: "spaeter_entscheiden", label: "Später entscheiden" },
  { key: "falscher_ansprechpartner", label: "Falscher Ansprechpartner" },
  { key: "nicht_erreicht", label: "Nicht erreicht" },
  { key: "sonstiges", label: "Sonstiges" },
];

export interface CallLogPayload {
  result: string;
  note?: string;
  dueAt?: string;
  appointment?: { scheduledAt: string; location?: string };
}

export function ResultModal({
  presetResult,
  contactName,
  onClose,
  onSubmit,
}: {
  presetResult?: string;
  contactName: string;
  onClose: () => void;
  onSubmit: (payload: CallLogPayload) => Promise<void>;
}) {
  const [result, setResult] = useState<string | undefined>(presetResult);
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAppointment = result === "termin_vereinbart";
  const canSubmit = result && (!needsAppointment || appointmentDate);

  async function handleSubmit() {
    if (!canSubmit || !result) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        result,
        note: note.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        appointment: needsAppointment ? { scheduledAt: new Date(appointmentDate).toISOString() } : undefined,
      });
    } catch (e: any) {
      setError(e.message ?? "Der Kontakt konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pb-8 pt-4 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="font-display text-lg font-semibold text-ink">{contactName}</h2>

        {!presetResult && (
          <Section title="Ergebnis des Gesprächs">
            <ChipGroup options={resultOptions} value={result} onChange={setResult} />
          </Section>
        )}

        <Section title="Notiz (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Was wurde besprochen?"
            className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </Section>

        {needsAppointment && (
          <Section title="Termin">
            <input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Section>
        )}

        <Section title="Nächster Termin (leer lassen = keine weitere Aktion)">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </Section>

        {error && <p className="mb-3 text-sm text-overdue">{error}</p>}

        <button
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-brand py-4 font-display text-base font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Speichern …" : "Speichern & weiter"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value?: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.key ? "border-brand bg-brand text-white" : "border-border bg-base text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
