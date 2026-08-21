import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Contact } from "../lib/api";
import { ContactCard } from "../components/ContactCard";
import { RescheduleSheet } from "../components/RescheduleSheet";

function groupCounts(contacts: Contact[]) {
  const now = new Date();
  let overdue = 0, dueToday = 0, later = 0;
  for (const c of contacts) {
    if (!c.nextActionAt) continue;
    const due = new Date(c.nextActionAt);
    if (due < now) overdue++;
    else if (due.toDateString() === now.toDateString()) dueToday++;
    else later++;
  }
  return { overdue, dueToday, later };
}

export function TodayPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [birthdays, setBirthdays] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Contact | null>(null);
  const navigate = useNavigate();

  function reload() {
    api.today().then(setContacts).catch((e) => setError(e.message));
    api.birthdaysToday().then(setBirthdays).catch(() => {});
  }

  useEffect(reload, []);

  const counts = useMemo(() => (contacts ? groupCounts(contacts) : null), [contacts]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <header className="mb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Heute</h1>
      </header>

      {birthdays.length > 0 && (
        <div className="mb-5 rounded-xl border border-today/30 bg-today/10 p-4">
          <p className="mb-2 font-display text-sm font-semibold text-ink">🎂 Heute Geburtstag</p>
          <div className="flex flex-col gap-2">
            {birthdays.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/kontakte/${b.id}`)}
                className="text-left text-sm text-ink underline decoration-today/50"
              >
                {b.firstName} {b.lastName}{b.company ? ` — ${b.company}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {counts && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatChip label="Überfällig" value={counts.overdue} color="text-overdue" />
          <StatChip label="Heute fällig" value={counts.dueToday} color="text-today" />
          <StatChip label="Später" value={counts.later} color="text-later" />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-overdue/10 px-4 py-3 text-sm text-overdue">{error}</p>
      )}

      {!contacts && !error && (
        <p className="text-sm text-muted">Lade Kontakte … (kann beim ersten Öffnen bis zu 1 Minute dauern)</p>
      )}

      {contacts && contacts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="font-display text-base font-semibold text-ink">Nichts fällig</p>
          <p className="mt-1 text-sm text-muted">Für heute stehen keine Follow-ups an.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {contacts?.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onClick={() => navigate(`/kontakte/${c.id}`)}
            onReschedule={() => setRescheduling(c)}
            onComplete={() => api.complete(c.id).then(reload)}
            onMarkContacted={() => api.markContacted(c.id).then(reload)}
          />
        ))}
      </div>

      {rescheduling && (
        <RescheduleSheet
          contactId={rescheduling.id}
          contactName={`${rescheduling.firstName} ${rescheduling.lastName}`}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center">
      <div className={`font-display text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
