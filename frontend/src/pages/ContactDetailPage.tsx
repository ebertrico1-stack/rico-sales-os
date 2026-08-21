import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Detail {
  id: string;
  firstName: string; lastName: string; company?: string; phone?: string; email?: string;
  city?: string; notes?: string; birthday?: string | null; isCompleted: boolean; lastContactAt?: string | null;
  campaign: { name: string } | null; status: { name: string }; priority: { name: string };
  activities: { id: string; type: string; result?: string; note?: string; createdAt: string }[];
}

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState(false);
  const [markingContacted, setMarkingContacted] = useState(false);

  function reload() {
    fetch(`${API_BASE}/api/contacts/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Kontakt nicht gefunden."))))
      .then(setContact)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function handleAddNote() {
    if (!newNote.trim() || !contact) return;
    setAddingNote(true);
    const timestamp = new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const combined = contact.notes
      ? `${contact.notes}\n[${timestamp}] ${newNote.trim()}`
      : `[${timestamp}] ${newNote.trim()}`;
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: combined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Die Notiz konnte nicht gespeichert werden.");
      }
      setNewNote("");
      reload();
    } catch (e: any) {
      setError(e.message ?? "Die Notiz konnte nicht gespeichert werden.");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!contact) return;
    if (!window.confirm("Diesen Verlaufseintrag wirklich löschen?")) return;
    setDeletingId(activityId);
    try {
      await api.deleteActivity(contact.id, activityId);
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveBirthday() {
    setSavingBirthday(true);
    setBirthdayError(null);
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: birthdayInput || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Der Geburtstag konnte nicht gespeichert werden.");
      }
      setEditingBirthday(false);
      reload();
    } catch (e: any) {
      setBirthdayError(e.message ?? "Der Geburtstag konnte nicht gespeichert werden.");
    } finally {
      setSavingBirthday(false);
    }
  }

  async function handleDeleteContact() {
    if (!contact) return;
    const fullName = `${contact.firstName} ${contact.lastName}`;
    if (!window.confirm(`${fullName} inkl. gesamtem Verlauf endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    setDeletingContact(true);
    try {
      await api.deleteContact(contact.id);
      navigate("/kontakte");
    } catch (e: any) {
      setError(e.message ?? "Der Kontakt konnte nicht gelöscht werden.");
      setDeletingContact(false);
    }
  }

  async function handleMarkContacted() {
    if (!contact) return;
    setMarkingContacted(true);
    try {
      await api.markContacted(contact.id);
      reload();
    } finally {
      setMarkingContacted(false);
    }
  }

  function daysSinceContact(): string {
    if (!contact?.lastContactAt) return "Noch nie kontaktiert";
    const days = Math.floor((Date.now() - new Date(contact.lastContactAt).getTime()) / 86400000);
    if (days === 0) return "Heute kontaktiert";
    if (days === 1) return "Vor 1 Tag kontaktiert";
    return `Vor ${days} Tagen kontaktiert`;
  }

  if (error) return <p className="p-4 text-sm text-overdue">{error}</p>;
  if (!contact) return <p className="p-4 text-sm text-muted">Lade …</p>;

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <h1 className="font-display text-2xl font-bold text-ink">{contact.firstName} {contact.lastName}</h1>
      <p className="mt-1 text-sm text-muted">{contact.campaign?.name ?? "Keine Kampagne"} · {contact.status.name} · {contact.priority.name}</p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="text-sm text-ink">{daysSinceContact()}</span>
        <button
          onClick={handleMarkContacted}
          disabled={markingContacted}
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {markingContacted ? "…" : "📞 Jetzt kontaktiert"}
        </button>
      </div>

      <div className="mt-4 space-y-1 rounded-xl border border-border bg-surface p-4 font-mono text-sm">
        {contact.company && <p>{contact.company}</p>}
        {contact.phone && <p>{contact.phone}</p>}
        {contact.email && <p>{contact.email}</p>}
        {contact.city && <p>{contact.city}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">🎂 Geburtstag</p>
        {!editingBirthday ? (
          <button
            onClick={() => {
              setBirthdayInput(contact.birthday ? contact.birthday.slice(0, 10) : "");
              setEditingBirthday(true);
            }}
            className="text-sm text-ink"
          >
            {contact.birthday
              ? new Date(contact.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
              : <span className="text-muted">Noch kein Geburtstag hinterlegt — antippen zum Hinzufügen</span>}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="date"
                value={birthdayInput}
                onChange={(e) => setBirthdayInput(e.target.value)}
                className="input flex-1"
              />
              <button
                onClick={handleSaveBirthday}
                disabled={savingBirthday}
                className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {savingBirthday ? "…" : "Speichern"}
              </button>
            </div>
            {birthdayError && <p className="text-sm text-overdue">{birthdayError}</p>}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Notiz</p>
        {contact.notes && <p className="mb-3 whitespace-pre-line text-sm text-ink">{contact.notes}</p>}
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Notiz hinzufügen …"
            className="input flex-1"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {addingNote ? "…" : "Hinzufügen"}
          </button>
        </div>
      </div>

      <h2 className="mb-2 mt-6 font-display text-lg font-semibold text-ink">Verlauf</h2>
      <div className="space-y-2">
        {contact.activities.map((a) => {
          const isReschedule = a.type === "Follow-up verschoben";
          return (
            <div key={a.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {!isReschedule && (
                    <span className="font-medium text-ink">{a.type}{a.result ? ` — ${a.result}` : ""}</span>
                  )}
                  {isReschedule && a.note && (
                    <span className="font-medium text-ink">{a.note}</span>
                  )}
                  {!isReschedule && a.note && <p className="mt-1 text-sm text-muted">{a.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-muted">
                    {new Date(a.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => handleDeleteActivity(a.id)}
                    disabled={deletingId === a.id}
                    aria-label="Eintrag löschen"
                    className="text-lg leading-none text-overdue disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {contact.activities.length === 0 && (
          <p className="text-sm text-muted">Noch keine Aktivitäten erfasst.</p>
        )}
      </div>

      <button
        onClick={handleDeleteContact}
        disabled={deletingContact}
        className="mt-8 w-full rounded-xl border border-overdue/30 py-3 text-sm font-medium text-overdue disabled:opacity-40"
      >
        {deletingContact ? "Wird gelöscht …" : "Kontakt endgültig löschen"}
      </button>
    </div>
  );
}
