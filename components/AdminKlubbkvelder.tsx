"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function AdminKlubbkvelder({
  kvelder,
  medlemmer,
}: {
  kvelder: any[];
  medlemmer: any[];
}) {
  const [skjemaApent, setSkjemaApent] = useState(false);
  const [redigerer, setRedigerer] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-6">
      {!skjemaApent && !redigerer && (
        <button onClick={() => setSkjemaApent(true)} className="btn-primary">
          + Ny klubbkveld
        </button>
      )}

      {skjemaApent && (
        <KlubbkveldSkjema
          medlemmer={medlemmer.filter((m) => m.godkjent)}
          onLagret={() => {
            setSkjemaApent(false);
            router.refresh();
          }}
          onAvbryt={() => setSkjemaApent(false)}
        />
      )}

      <ul className="kort divide-y divide-wine-900/10">
        {kvelder.map((k) => (
          <li key={k.id}>
            {redigerer === k.id ? (
              <div className="p-4">
                <KlubbkveldSkjema
                  medlemmer={medlemmer.filter((m) => m.godkjent)}
                  eksisterende={k}
                  onLagret={() => {
                    setRedigerer(null);
                    router.refresh();
                  }}
                  onAvbryt={() => setRedigerer(null)}
                  onSlettet={() => {
                    setRedigerer(null);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between gap-3">
                <Link href={`/klubbkvelder/${k.id}`} className="flex-1 min-w-0">
                  <p className="font-display text-lg text-wine-900 truncate">
                    {k.tittel}
                  </p>
                  <p className="text-sm font-sans text-ink-700/60">
                    {new Date(k.dato).toLocaleDateString("nb-NO")}
                    {k.sted && ` · ${k.sted}`}
                  </p>
                </Link>
                <button
                  onClick={() => setRedigerer(k.id)}
                  className="text-xs font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700 flex-shrink-0"
                >
                  Rediger
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KlubbkveldSkjema({
  medlemmer,
  eksisterende,
  onLagret,
  onAvbryt,
  onSlettet,
}: {
  medlemmer: any[];
  eksisterende?: any;
  onLagret: () => void;
  onAvbryt: () => void;
  onSlettet?: () => void;
}) {
  const [dato, setDato] = useState(eksisterende?.dato || "");
  const [tittel, setTittel] = useState(eksisterende?.tittel || "");
  const [sted, setSted] = useState(eksisterende?.sted || "");
  const [kommentar, setKommentar] = useState(eksisterende?.kommentar || "");
  const [valgteMedlemmer, setValgteMedlemmer] = useState<string[]>([]);
  const [bilde, setBilde] = useState<File | null>(null);
  const [laster, setLaster] = useState(false);
  const [sletter, setSletter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const supabase = createClient();

  // Last inn eksisterende oppmøtte ved redigering
  useEffect(() => {
    async function hentOppmote() {
      if (!eksisterende?.id) return;
      const { data } = await supabase
        .from("oppmote")
        .select("medlem_id")
        .eq("klubbkveld_id", eksisterende.id);
      if (data) {
        setValgteMedlemmer(data.map((o) => o.medlem_id));
      }
    }
    hentOppmote();
  }, [eksisterende?.id, supabase]);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setLaster(true);
    setFeil(null);

    let bilde_url = eksisterende?.bilde_url || null;

    if (bilde) {
      const ext = bilde.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: oppErr } = await supabase.storage
        .from("klubbkveld-bilder")
        .upload(path, bilde);
      if (oppErr) {
        setFeil("Kunne ikke laste opp bilde: " + oppErr.message);
        setLaster(false);
        return;
      }
      const { data } = supabase.storage
        .from("klubbkveld-bilder")
        .getPublicUrl(path);
      bilde_url = data.publicUrl;
    }

    let kveldId = eksisterende?.id;

    if (eksisterende) {
      const { error } = await supabase
        .from("klubbkvelder")
        .update({ dato, tittel, sted, kommentar, bilde_url })
        .eq("id", eksisterende.id);
      if (error) {
        setFeil(error.message);
        setLaster(false);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("klubbkvelder")
        .insert({
          dato,
          tittel,
          sted,
          kommentar,
          bilde_url,
          opprettet_av: user?.id,
        })
        .select()
        .single();
      if (error) {
        setFeil(error.message);
        setLaster(false);
        return;
      }
      kveldId = data.id;
    }

    // Oppdater oppmøte - slett alle eksisterende og legg inn de valgte
    if (kveldId) {
      await supabase.from("oppmote").delete().eq("klubbkveld_id", kveldId);
      if (valgteMedlemmer.length > 0) {
        await supabase
          .from("oppmote")
          .insert(
            valgteMedlemmer.map((medlem_id) => ({
              klubbkveld_id: kveldId,
              medlem_id,
            })),
          );
      }
    }

    setLaster(false);
    onLagret();
  }

  async function slett() {
    if (!eksisterende?.id) return;
    if (
      !confirm(
        `Slette klubbkvelden "${eksisterende.tittel}"?\n\nDette vil også slette alle smakinger, scorer og kommentarer på denne kvelden.`,
      )
    ) {
      return;
    }
    setSletter(true);
    setFeil(null);

    const { error } = await supabase
      .from("klubbkvelder")
      .delete()
      .eq("id", eksisterende.id);

    if (error) {
      setFeil("Kunne ikke slette: " + error.message);
      setSletter(false);
      return;
    }

    setSletter(false);
    onSlettet?.();
  }

  function toggleMedlem(id: string) {
    setValgteMedlemmer((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  return (
    <form onSubmit={lagre} className="space-y-4 kort p-6">
      <h3 className="font-display text-xl text-wine-900">
        {eksisterende ? "Rediger klubbkveld" : "Ny klubbkveld"}
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            Dato
          </label>
          <input
            type="date"
            value={dato}
            onChange={(e) => setDato(e.target.value)}
            required
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            Tittel/tema
          </label>
          <input
            type="text"
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            required
            className="input-field"
            placeholder="f.eks. Italienske rødviner"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
          Sted
        </label>
        <input
          type="text"
          value={sted}
          onChange={(e) => setSted(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
          Kommentar/beskrivelse
        </label>
        <textarea
          value={kommentar}
          onChange={(e) => setKommentar(e.target.value)}
          rows={3}
          className="input-field resize-none"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
          Bilde{" "}
          {eksisterende?.bilde_url &&
            "(la stå tomt for å beholde eksisterende)"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setBilde(e.target.files?.[0] || null)}
          className="text-sm font-sans"
        />
      </div>

      {medlemmer.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60">
              Til stede ({valgteMedlemmer.length} valgt)
            </label>
            {valgteMedlemmer.length > 0 && (
              <button
                type="button"
                onClick={() => setValgteMedlemmer([])}
                className="text-xs font-sans text-ink-700/50 hover:text-wine-700"
              >
                Fjern alle
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {medlemmer.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMedlem(m.id)}
                className={`text-xs uppercase tracking-wider font-sans px-3 py-1.5 rounded transition ${
                  valgteMedlemmer.includes(m.id)
                    ? "bg-wine-700 text-cream-50"
                    : "bg-cream-100 text-wine-800 hover:bg-cream-200"
                }`}
              >
                {m.navn}
              </button>
            ))}
          </div>
        </div>
      )}

      {feil && (
        <p className="text-sm text-wine-700 bg-wine-50 px-3 py-2 rounded">
          {feil}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-wine-900/10">
        <button
          type="submit"
          disabled={laster || sletter}
          className="btn-primary disabled:opacity-50"
        >
          {laster ? "Lagrer …" : "Lagre"}
        </button>
        <button
          type="button"
          onClick={onAvbryt}
          disabled={laster || sletter}
          className="btn-secondary"
        >
          Avbryt
        </button>
        {eksisterende && onSlettet && (
          <button
            type="button"
            onClick={slett}
            disabled={laster || sletter}
            className="ml-auto text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 disabled:opacity-50 px-3"
          >
            {sletter ? "Sletter..." : "Slett klubbkveld"}
          </button>
        )}
      </div>
    </form>
  );
}
