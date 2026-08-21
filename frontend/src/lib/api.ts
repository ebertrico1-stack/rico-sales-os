export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  birthday?: string | null;
  lastContactAt?: string | null;
  nextActionAt?: string | null;
  nextActionType?: string | null;
  isCompleted: boolean;
  campaign: { id: string; name: string } | null;
  status: { id: string; name: string };
  priority: { id: string; name: string; weight: number };
}

export interface DashboardStats {
  totalContacts: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit, retriesLeft = 6): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (networkErr) {
    // Server schläft (Render Free Tier) oder ist kurz nicht erreichbar → mit Backoff erneut versuchen
    if (retriesLeft > 0) {
      await new Promise((r) => setTimeout(r, 4000));
      return request<T>(path, init, retriesLeft - 1);
    }
    throw new Error("Der Server ist gerade nicht erreichbar. Bitte versuche es in einer Minute erneut.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  today: () => request<Contact[]>("/contacts/today"),
  birthdaysToday: () => request<Contact[]>("/contacts/birthdays/today"),
  list: (params: Record<string, string>) =>
    request<Contact[]>(`/contacts?${new URLSearchParams(params).toString()}`),
  previewImport: (csv: string) =>
    request<{ columns: string[]; sampleRows: Record<string, string>[]; totalRows: number; targetFields: string[] }>(
      "/import/preview",
      { method: "POST", body: JSON.stringify({ csv }) }
    ),
  commitImport: (payload: {
    csv: string;
    campaignId: string;
    statusId: string;
    priorityId: string;
    mapping: Record<string, string>;
  }) =>
    request<{ created: number; skippedDuplicates: unknown[]; failed: unknown[]; totalRows: number }>(
      "/import/commit",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  campaigns: () => request<{ id: string; name: string }[]>("/campaigns"),
  statuses: () => request<{ id: string; name: string }[]>("/statuses"),
  priorities: () => request<{ id: string; name: string }[]>("/priorities"),
  complete: (id: string) => request<Contact>(`/contacts/${id}/complete`, { method: "POST" }),
  markContacted: (id: string) => request<Contact>(`/contacts/${id}/mark-contacted`, { method: "POST" }),
  reschedule: (id: string, payload: { dueAt: string; reason?: string }) =>
    request<Contact>(`/contacts/${id}/reschedule`, { method: "POST", body: JSON.stringify(payload) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: "DELETE" }),
  deleteActivity: (contactId: string, activityId: string) =>
    request<void>(`/contacts/${contactId}/activities/${activityId}`, { method: "DELETE" }),
};
