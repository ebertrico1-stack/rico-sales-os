// Wandelt die UX-Optionen ("heute", "morgen", "in 3 Tagen", ...) in ein konkretes Datum um.
// customDate hat Vorrang, falls gesetzt.

export type FollowUpOption =
  | "spaeter_heute"
  | "morgen"
  | "in_3_tagen"
  | "naechste_woche"
  | "custom"
  | "keine_weitere_aktion";

interface ResolveInput {
  option: FollowUpOption;
  customDate?: string; // ISO-String, nur bei option === "custom"
  now?: Date;
}

export function resolveFollowUpDate({ option, customDate, now = new Date() }: ResolveInput): Date | null {
  const base = new Date(now);

  switch (option) {
    case "spaeter_heute": {
      const d = new Date(base);
      d.setHours(d.getHours() + 3); // 3h später als Standard, im UI überschreibbar
      return d;
    }
    case "morgen": {
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    case "in_3_tagen": {
      const d = new Date(base);
      d.setDate(d.getDate() + 3);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    case "naechste_woche": {
      const d = new Date(base);
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    case "custom": {
      if (!customDate) throw new Error("customDate erforderlich bei option 'custom'");
      return new Date(customDate);
    }
    case "keine_weitere_aktion":
      return null;
    default:
      throw new Error(`Unbekannte Follow-up-Option: ${option}`);
  }
}
