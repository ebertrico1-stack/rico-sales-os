import { Contact } from "../lib/api";

function urgency(contact: Contact): { key: "overdue" | "today" | "later"; label: string } {
  if (!contact.nextActionAt) return { key: "later", label: "Ohne Termin" };
  const due = new Date(contact.nextActionAt);
  const now = new Date();
  if (due < now) return { key: "overdue", label: "Überfällig" };
  const isToday = due.toDateString() === now.toDateString();
  if (isToday) return { key: "today", label: "Heute" };
  return { key: "later", label: "Später" };
}

const railColor: Record<string, string> = {
  overdue: "bg-overdue",
  today: "bg-today",
  later: "bg-later",
};

const badgeColor: Record<string, string> = {
  overdue: "text-overdue bg-overdue/10",
  today: "text-today bg-today/10",
  later: "text-later bg-later/10",
};

function formatTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function daysSince(iso?: string | null): string {
  if (!iso) return "Noch nie kontaktiert";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Heute kontaktiert";
  if (days === 1) return "Vor 1 Tag kontaktiert";
  return `Vor ${days} Tagen kontaktiert`;
}

export function ContactCard({
  contact,
  onClick,
  onReschedule,
  onComplete,
  onMarkContacted,
}: {
  contact: Contact;
  onClick?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onMarkContacted?: () => void;
}) {
  const u = urgency(contact);
  return (
    <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <span className={`w-1.5 shrink-0 ${railColor[u.key]}`} aria-hidden />
      <button onClick={onClick} className="flex flex-1 flex-col gap-1 px-4 py-3 text-left active:bg-base">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-base font-semibold text-ink">
            {contact.firstName} {contact.lastName}
          </span>
          {!contact.isCompleted && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor[u.key]}`}>
              {u.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{contact.campaign?.name ?? "Keine Kampagne"}</span>
          {contact.company && <span>· {contact.company}</span>}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          {contact.nextActionAt && <span>Follow-up: {formatTime(contact.nextActionAt)} Uhr</span>}
          {contact.phone && <span>{contact.phone}</span>}
        </div>
        <div className="font-mono text-xs text-muted">{daysSince(contact.lastContactAt)}</div>
      </button>
      {(onComplete || onReschedule || onMarkContacted) && (
        <div className="flex shrink-0 divide-x divide-border border-l border-border">
          {onMarkContacted && (
            <button
              onClick={onMarkContacted}
              aria-label="Als kontaktiert markieren"
              className="px-3 text-lg active:bg-base"
            >
              📞
            </button>
          )}
          {onComplete && !contact.isCompleted && (
            <button
              onClick={onComplete}
              aria-label="Als erledigt markieren"
              className="px-3 text-lg text-later active:bg-base"
            >
              ✓
            </button>
          )}
          {onReschedule && (
            <button
              onClick={onReschedule}
              aria-label={contact.isCompleted ? "Wieder aktivieren" : "Follow-up verschieben"}
              className="px-3 text-lg text-muted active:bg-base"
            >
              ⋯
            </button>
          )}
        </div>
      )}
    </div>
  );
}
