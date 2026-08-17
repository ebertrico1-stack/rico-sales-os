import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Detail {
  firstName: string; lastName: string; company?: string; phone?: string; email?: string;
  city?: string; notes?: string; campaign: { name: string }; status: { name: string }; priority: { name: string };
  activities: { id: string; type: string; result?: string; note?: string; createdAt: string }[];
}

export function ContactDetailPage() {
  const { id } = useParams();
  const [contact, setContact] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/contacts/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Kontakt nicht gefunden."))))
      .then(setContact)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="p-4 text-sm text-overdue">{error}</p>;
  if (!contact) return <p className="p-4 text-sm text-muted">Lade …</p>;

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <h1 className="font-display text-2xl font-bold text-ink">{contact.firstName} {contact.lastName}</h1>
      <p className="mt-1 text-sm text-muted">{contact.campaign.name} · {contact.status.name} · {contact.priority.name}</p>

      <div className="mt-4 space-y-1 rounded-xl border border-border bg-surface p-4 font-mono text-sm">
        {contact.company && <p>{contact.company}</p>}
        {contact.phone && <p>{contact.phone}</p>}
        {contact.email && <p>{contact.email}</p>}
        {contact.city && <p>{contact.city}</p>}
      </div>

      {contact.notes && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Notiz</p>
          <p className="text-sm text-ink">{contact.notes}</p>
        </div>
      )}

      <h2 className="mb-2 mt-6 font-display text-lg font-semibold text-ink">Verlauf</h2>
      <div className="space-y-2">
        {contact.activities.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{a.type}{a.result ? ` — ${a.result}` : ""}</span>
              <span className="font-mono text-xs text-muted">
                {new Date(a.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {a.note && <p className="mt-1 text-sm text-muted">{a.note}</p>}
          </div>
        ))}
        {contact.activities.length === 0 && (
          <p className="text-sm text-muted">Noch keine Aktivitäten erfasst.</p>
        )}
      </div>
    </div>
  );
}
