import { useEffect, useState } from "react";
import { api } from "../lib/api";

const fieldLabels: Record<string, string> = {
  firstName: "Vorname",
  lastName: "Nachname",
  company: "Unternehmen",
  phone: "Telefon",
  email: "E-Mail",
  city: "Stadt",
  country: "Land",
  source: "Quelle",
};

interface Preview {
  columns: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  targetFields: string[];
}

interface Lookup { id: string; name: string }

export function ImportExportPage() {
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<Lookup[]>([]);
  const [statuses, setStatuses] = useState<Lookup[]>([]);
  const [priorities, setPriorities] = useState<Lookup[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [result, setResult] = useState<{ created: number; skippedDuplicates: unknown[]; failed: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.campaigns().then((c) => { setCampaigns(c); if (c[0]) setCampaignId(c[0].id); });
    api.statuses().then((s) => { setStatuses(s); const neu = s.find((x) => x.name === "Neu") ?? s[0]; if (neu) setStatusId(neu.id); });
    api.priorities().then((p) => { setPriorities(p); const normal = p.find((x) => x.name === "Normal") ?? p[0]; if (normal) setPriorityId(normal.id); });
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setError(null);
    setResult(null);
    try {
      const p = await api.previewImport(text);
      setPreview(p);
      // sinnvolle Vorbelegung: Spalten mit gleichem Namen automatisch mappen
      const auto: Record<string, string> = {};
      for (const col of p.columns) {
        const guess = p.targetFields.find(
          (f) => fieldLabels[f].toLowerCase() === col.toLowerCase() || f.toLowerCase() === col.toLowerCase()
        );
        if (guess) auto[col] = guess;
      }
      setMapping(auto);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCommit() {
    if (!csv || !campaignId || !statusId || !priorityId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.commitImport({ csv, campaignId, statusId, priorityId, mapping });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-ink">Import & Export</h1>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 font-display text-base font-semibold text-ink">Export</p>
        <p className="mb-3 text-sm text-muted">Alle Kontakte als CSV herunterladen.</p>
        <a
          href="/api/export"
          className="inline-block rounded-xl border border-border bg-base px-4 py-2 text-sm font-medium text-ink"
        >
          CSV exportieren
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 font-display text-base font-semibold text-ink">Import</p>

        {!preview && (
          <label className="block cursor-pointer rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            CSV-Datei auswählen
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        )}

        {preview && !result && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{preview.totalRows} Zeilen erkannt. Spalten zuordnen:</p>

            <div className="space-y-2">
              {preview.columns.map((col) => (
                <div key={col} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-ink">{col}</span>
                  <select
                    value={mapping[col] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}
                    className="rounded-lg border border-border bg-base px-2 py-1.5 text-sm"
                  >
                    <option value="">— ignorieren —</option>
                    {preview.targetFields.map((f) => (
                      <option key={f} value={f}>{fieldLabels[f] ?? f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <LookupSelect label="Kampagne" value={campaignId} onChange={setCampaignId} options={campaigns} />
              <LookupSelect label="Status" value={statusId} onChange={setStatusId} options={statuses} />
              <LookupSelect label="Priorität" value={priorityId} onChange={setPriorityId} options={priorities} />
            </div>

            {error && <p className="text-sm text-overdue">{error}</p>}

            <button
              onClick={handleCommit}
              disabled={busy}
              className="w-full rounded-xl bg-brand py-3 font-display font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Importiere …" : `${preview.totalRows} Kontakte importieren`}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-1 text-sm">
            <p className="text-later">{result.created} Kontakte importiert</p>
            {result.skippedDuplicates.length > 0 && (
              <p className="text-today">{result.skippedDuplicates.length} Duplikate übersprungen</p>
            )}
            {result.failed.length > 0 && <p className="text-overdue">{result.failed.length} Zeilen fehlgeschlagen</p>}
            <button
              onClick={() => { setPreview(null); setResult(null); setCsv(null); }}
              className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink"
            >
              Weiteren Import starten
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LookupSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[] }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-border bg-base px-2 py-1.5">
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}
