import { useState } from "react";
import { api } from "../lib/api";

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
  const [dueAt, setDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = dueAt.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await api.reschedule(contactId, { dueAt: new Date(dueAt).toISOString(), reason: reason.trim() || undefined });
      setSuccess(true);
      setTimeout(onDone, 700);
    } catch (e: any) {
      setError(e.message ?? "Der Termin konnte nicht verschoben werden.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-surface px-4 pb-8 pt-4 safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">{contactName} verschieben</h2>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Datum & Uhrzeit</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Grund (optional)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z. B. Call Allgemein, Termin für Vertragsgespräch …"
              className="input"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-overdue">{error}</p>}
        {success && <p className="mt-3 text-sm text-later">✓ Gespeichert</p>}

        <button
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="mt-5 w-full rounded-xl bg-brand py-4 font-display text-base font-semibold text-white disabled:opacity-40"
        >
          {success ? "✓ Gespeichert" : saving ? "Speichern …" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
