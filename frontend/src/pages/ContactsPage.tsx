import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Contact } from "../lib/api";
import { ContactCard } from "../components/ContactCard";
import { RescheduleSheet } from "../components/RescheduleSheet";
import { AddContactSheet } from "../components/AddContactSheet";

const filters = [
  { key: "alle", label: "Alle" },
  { key: "ueberfaellig", label: "Überfällig" },
  { key: "heute", label: "Heute" },
  { key: "morgen", label: "Morgen" },
  { key: "diese_woche", label: "Diese Woche" },
];

const noContactFilters = [
  { key: "", label: "Alle" },
  { key: "30", label: "30+ Tage" },
  { key: "90", label: "90+ Tage" },
  { key: "180", label: "180+ Tage" },
];

export function ContactsPage() {
  const [activeFilter, setActiveFilter] = useState("alle");
  const [noContactDays, setNoContactDays] = useState("");
  const [sortLongest, setSortLongest] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  function reload() {
    const params: Record<string, string> = {};
    if (activeFilter !== "alle") params.filter = activeFilter;
    if (search.trim()) params.search = search.trim();
    if (noContactDays) params.noContactDays = noContactDays;
    if (sortLongest) params.sort = "laengster_kein_kontakt";
    api.list(params).then(setContacts).catch((e) => setError(e.message));
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250); // kleines Debounce für die Suche
    return () => clearTimeout(handle);
  }, [activeFilter, search, noContactDays, sortLongest]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Kontakte</h1>
        <button
          onClick={() => setAdding(true)}
          aria-label="Neuen Kontakt anlegen"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white"
        >
          +
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Name, Firma, Telefon, E-Mail …"
        className="mb-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === f.key
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Kein Kontakt seit</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {noContactFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setNoContactDays(f.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                noContactDays === f.key
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setSortLongest((v) => !v)}
        className={`mb-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          sortLongest ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted"
        }`}
      >
        ↕ Sortierung: {sortLongest ? "Am längsten kein Kontakt zuerst" : "Neueste zuerst"}
      </button>

      {error && <p className="rounded-lg bg-overdue/10 px-4 py-3 text-sm text-overdue">{error}</p>}

      <div className="flex flex-col gap-2">
        {contacts.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onClick={() => navigate(`/kontakte/${c.id}`)}
            onReschedule={() => setRescheduling(c)}
            onComplete={() => api.complete(c.id).then(reload)}
            onMarkContacted={() => api.markContacted(c.id).then(reload)}
          />
        ))}
        {contacts.length === 0 && !error && (
          <p className="py-8 text-center text-sm text-muted">Keine Kontakte gefunden.</p>
        )}
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

      {adding && (
        <AddContactSheet
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
