import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Contact } from "../lib/api";
import { CallLogPayload, ResultModal } from "../components/ResultModal";

const quickActions: { label: string; result?: string; variant: "primary" | "neutral" | "negative" }[] = [
  { label: "Angerufen", variant: "primary" },
  { label: "Nicht erreicht", result: "nicht_erreicht", variant: "neutral" },
  { label: "Rückruf", result: "rueckruf", variant: "neutral" },
  { label: "Termin", result: "termin_vereinbart", variant: "primary" },
  { label: "Kein Interesse", result: "kein_interesse", variant: "negative" },
  { label: "Falscher Kontakt", result: "falscher_ansprechpartner", variant: "negative" },
];

const variantClass: Record<string, string> = {
  primary: "bg-brand text-white",
  neutral: "border border-border bg-surface text-ink",
  negative: "border border-overdue/30 bg-overdue/5 text-overdue",
};

export function CallModePage() {
  const [contact, setContact] = useState<Contact | null | undefined>(undefined); // undefined = lädt
  const [error, setError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<string | undefined | "open">(undefined);
  const [paused, setPaused] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const navigate = useNavigate();

  const loadNext = useCallback((excludeId?: string) => {
    api
      .nextForCall(excludeId)
      .then((c) => setContact(c))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function handleSubmit(payload: CallLogPayload) {
    if (!contact) return;
    await api.logCall(contact.id, payload);
    setModalResult(undefined);
    setSessionDone((n) => n + 1);
    loadNext(contact.id);
  }

  if (paused) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 pb-24 text-center">
        <p className="font-display text-xl font-bold text-ink">Pausiert</p>
        <p className="mt-2 text-sm text-muted">{sessionDone} Kontakte in dieser Session erledigt.</p>
        <button
          onClick={() => setPaused(false)}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-display font-semibold text-white"
        >
          Weitermachen
        </button>
        <button onClick={() => navigate("/")} className="mt-3 text-sm text-muted underline">
          Zurück zu Heute
        </button>
      </div>
    );
  }

  if (error) return <p className="p-4 text-sm text-overdue">{error}</p>;

  if (contact === undefined) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-6 pt-6 safe-bottom">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-border" />
        <div className="flex-1 animate-pulse rounded-2xl border border-border bg-surface p-5">
          <div className="h-7 w-40 rounded bg-base" />
          <div className="mt-2 h-4 w-24 rounded bg-base" />
        </div>
      </div>
    );
  }

  if (contact === null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 pb-24 text-center">
        <p className="font-display text-xl font-bold text-ink">Alles erledigt 🎉</p>
        <p className="mt-2 text-sm text-muted">{sessionDone} Kontakte in dieser Session erledigt.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-display font-semibold text-white"
        >
          Zurück zu Heute
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-6 pt-6 safe-bottom">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">{sessionDone} erledigt · {contact.campaign?.name ?? "Keine Kampagne"}</span>
        <button onClick={() => setPaused(true)} className="font-mono text-xs text-muted underline">
          Pause
        </button>
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-surface p-5">
        <h1 className="font-display text-2xl font-bold text-ink">
          {contact.firstName} {contact.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted">{contact.company}</p>

        <div className="mt-4 space-y-1 font-mono text-sm text-ink">
          {contact.phone && <p>{contact.phone}</p>}
          {contact.email && <p>{contact.email}</p>}
        </div>

        <div className="mt-4 rounded-xl bg-base p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Letzter Kontakt</p>
          <p className="text-sm text-ink">
            {contact.lastContactAt
              ? new Date(contact.lastContactAt).toLocaleDateString("de-DE")
              : "Noch kein Kontakt"}
          </p>
        </div>

        {contact.notes && (
          <div className="mt-3 rounded-xl bg-base p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Notiz</p>
            <p className="text-sm text-ink">{contact.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => setModalResult(a.result ?? "open")}
            className={`rounded-xl py-4 font-display text-sm font-semibold active:scale-[0.98] transition-transform ${variantClass[a.variant]}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {modalResult !== undefined && (
        <ResultModal
          presetResult={modalResult === "open" ? undefined : modalResult}
          contactName={`${contact.firstName} ${contact.lastName}`}
          onClose={() => setModalResult(undefined)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
