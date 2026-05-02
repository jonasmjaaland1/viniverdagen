'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

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
  const supabase = createClient();

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
                />
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between gap-3">
                <Link href={`/klubbkvelder/${k.id}`} className="flex-1">
                  <p className="font-display text-lg text-wine-900">{k.tittel}</p>
                  <p className="text-sm font-sans text-ink-700/60">
                    {new Date(k.dato).toLocaleDateString('nb-NO')}
                    {k.sted && ` · ${k.sted}`}
                  </p>
                </Link>
                <button
                  onClick={() => setRedigerer(k.id)}
                  className="text-xs font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
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
}: {
  medlemmer: any[];
  eksisterende?: any;
  onLagret: () => void;
  onAvbryt: () => void;
}) {
  const [dato, setDato] = useState(eksisterende?.dato || '');
  const [tittel, setTittel] = useState(eksisterende?.tittel || '');
  const [sted, setSted] = useState(eksisterende?.sted || '');
  const [kommentar, setKommentar] = useState(eksisterende?.kommentar || '');
  const [valgteMedlemmer, setValgteMedlemmer] = useState<string[]>([]);
  const [bilde, setBilde] = useState<File | null>(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const supabase = createClient();

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setLaster(true);
    setFeil(null);

    let bilde_url = eksisterende?.bilde_url || null;

    if (bilde) {
      const ext = bilde.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { error: oppErr } = await supabase.storage
        .from('klubbkveld-bilder')
        .upload(path, bilde);
      if (oppErr) {
        setFeil('Kunne ikke laste opp bilde: ' + oppErr.message);
        setLaster(false);
        return;
      }
      const { data } = supabase.storage.from('klubbkveld-bilder').getPublicUrl(path);
      bilde_url = data.publicUrl;
    }

    let kveldId = eksisterende?.id;

    if (eksisterende) {
      const { error } = await supabase
        .from('klubbkvelder')
        .update({ dato, tittel, sted, kommentar, bilde_url })
        .eq('id', eksisterende.id);
      if (error) {
        setFeil(error.message);
        setLaster(false);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('klubbkvelder')
        .insert({ dato, tittel, sted, kommentar, bilde_url, opprettet_av: user?.id })
        .select()
        .single();
      if (error) {
        setFeil(error.message);
        setLaster(false);
        return;
      }
      kveldId = data.id;
    }

    // Oppdater oppmøte
    if (valgteMedlemmer.length > 0 && kveldId) {
      await supabase.from('oppmote').delete().eq('klubbkveld_id', kveldId);
      await supabase.from('oppmote').insert(
        valgteMedlemmer.map((medlem_id) => ({ klubbkveld_id: kveldId, medlem_id }))
      );
    }

    setLaster(false);
    onLagret();
  }

  function toggleMedlem(id: string) {
    setValgteMedlemmer((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={lagre} className="space-y-4 kort p-6">
      <h3 className="font-display text-xl text-wine-900">
        {eksisterende ? 'Rediger klubbkveld' : 'Ny klubbkveld'}
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
          Kommentar
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
          Bilde (valgfritt)
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
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-2">
            Til stede
          </label>
          <div className="flex flex-wrap gap-1.5">
            {medlemmer.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMedlem(m.id)}
                className={`text-xs uppercase tracking-wider font-sans px-3 py-1.5 rounded transition ${
                  valgteMedlemmer.includes(m.id)
                    ? 'bg-wine-700 text-cream-50'
                    : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                }`}
              >
                {m.navn}
              </button>
            ))}
          </div>
        </div>
      )}

      {feil && (
        <p className="text-sm text-wine-700 bg-wine-50 px-3 py-2 rounded">{feil}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={laster} className="btn-primary disabled:opacity-50">
          {laster ? 'Lagrer …' : 'Lagre'}
        </button>
        <button type="button" onClick={onAvbryt} className="btn-secondary">
          Avbryt
        </button>
      </div>
    </form>
  );
}
