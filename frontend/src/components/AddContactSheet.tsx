import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Lookup { id: string; name: string }

export function AddContactSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [campaigns, setCampaigns] = useState<Lookup[]>([]);
  const [statuses, setStatuses] = useState<Lookup[]>([]);
  const [priorities, setPriorities] = useState<Lookup[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priorityId, setPriorityId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/campaigns`).then((r) => r.json()),
      fetch(`${API_BASE}/api/statuses`).then((r) => r.json()),
      fetch(`${API_BASE}/api/priorities`).then((r) => r.json()),
    ]).then(([c, s, p]: [Lookup[], Lookup[], Lookup[]]) => {
      setCampaigns(c);
      setStatuses(s);
      setPriorities(p);
      if (c[0]) setCampaignId(c[0].id);
      const neu = s.find((x) => x.name === "Neu") ?? s[0];
      if (neu) setStatusId(neu.id);
      const normal = p.find((x) => x.name === "Normal") ?? p[0];
      if (normal) setPriorityId(normal.id);
    });
  }, []);

  const canSubmit = firstName.trim() && lastName.trim() && campaignId && statusId && priorityId;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          campaignId, statusId, priorityId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Der Kontakt konnte nicht gespeichert werden.");
      }
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Der Kontakt konnte nicht gespeichert werden.");
    } finally {
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
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Neuer Kontakt</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Vorname *">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
            </Field>
            <Field label="Nachname *">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
            </Field>
          </div>

          <Field label="Unternehmen">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Telefon">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" inputMode="tel" />
            </Field>
            <Field label="E-Mail">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" inputMode="email" />
            </Field>
          </div>

          <Field label="Stadt">
            <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
          </Field>

          <Field label="Kampagne *">
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input">
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className="input">
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Priorität">
              <select value={priorityId} onChange={(e) => setPriorityId(e.target.value)} className="input">
                {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-overdue">{error}</p>}

        <button
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="mt-5 w-full rounded-xl bg-brand py-4 font-display text-base font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Speichern …" : "Kontakt speichern"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
