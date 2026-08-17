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
  { key: "abgeschlossen", label: "Abgeschlossen" },
];

export function ContactsPage() {
  const [activeFilter, setActiveFilter] = useState("alle");
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
    api.list(params).then(setContacts).catch((e) => setError(e.message));
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250); // kleines Debounce für die Suche
    return () => clearTimeout(handle);
  }, [activeFilter, search]);

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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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

      {error && <p className="rounded-lg bg-overdue/10 px-4 py-3 text-sm text-overdue">{error}</p>}

      <div className="flex flex-col gap-2">
        {contacts.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onClick={() => navigate(`/kontakte/${c.id}`)}
            onReschedule={() => setRescheduling(c)}
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
