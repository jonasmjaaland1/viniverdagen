'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface Medlem {
  id: string;
  navn: string;
}

export default function NyttDatoForslag({ medlemmer }: { medlemmer: Medlem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [ansvarligId, setAnsvarligId] = useState('');
  const [datoer, setDatoer] = useState<string[]>(['']);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  function leggTilDato() {
    setDatoer([...datoer, '']);
  }

  function fjernDato(i: number) {
    if (datoer.length === 1) return;
    setDatoer(datoer.filter((_, j) => j !== i));
  }

  function settDato(i: number, verdi: string) {
    const ny = [...datoer];
    ny[i] = verdi;
    setDatoer(ny);
  }

  async function lagre() {
    setFeil(null);
    const gyldigeDatoer = datoer.map((d) => d.trim()).filter(Boolean);
    if (gyldigeDatoer.length === 0) {
      setFeil('Legg til minst én dato');
      return;
    }

    setLaster(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFeil('Ikke innlogget');
      setLaster(false);
      return;
    }

    const { data: forslag, error: e1 } = await supabase
      .from('dato_forslag')
      .insert({
        opprettet_av: user.id,
        ansvarlig_id: ansvarligId || null,
        tittel: tittel.trim() || null,
        beskrivelse: beskrivelse.trim() || null,
      })
      .select()
      .single();

    if (e1 || !forslag) {
      setFeil('Kunne ikke opprette forslag: ' + (e1?.message || 'Ukjent feil'));
      setLaster(false);
      return;
    }

    const altRows = gyldigeDatoer.map((d) => ({
      forslag_id: forslag.id,
      dato: d,
    }));

    const { error: e2 } = await supabase.from('dato_alternativer').insert(altRows);
    if (e2) {
      setFeil('Kunne ikke lagre datoer: ' + e2.message);
      setLaster(false);
      return;
    }

    setLaster(false);
    router.push('/datoer');
    router.refresh();
  }

  return (
    <div className="kort p-6 md:p-8 space-y-5">
      <div>
        <h2 className="font-display text-2xl text-wine-900">Nytt dato-forslag</h2>
        <p className="text-sm font-sans text-ink-700/70 mt-1">
          Foreslå en eller flere datoer. Medlemmer kan svare om de kan eller ikke.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-2">
          Tittel (valgfri)
        </label>
        <input
          value={tittel}
          onChange={(e) => setTittel(e.target.value)}
          placeholder="F.eks. Vår-vinkveld"
          className="input-field"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-2">
          Beskrivelse (valgfri)
        </label>
        <textarea
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          placeholder="Tema, sted, forventninger..."
          rows={3}
          className="input-field resize-none"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-2">
          Ansvarlig medlem (valgfri)
        </label>
        <select
          value={ansvarligId}
          onChange={(e) => setAnsvarligId(e.target.value)}
          className="input-field"
        >
          <option value="">— ingen ansvarlig valgt —</option>
          {medlemmer.map((m) => (
            <option key={m.id} value={m.id}>{m.navn}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60">
            Datoer
          </label>
          <button
            onClick={leggTilDato}
            type="button"
            className="text-xs font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 transition"
          >
            + Legg til dato
          </button>
        </div>
        <div className="space-y-2">
          {datoer.map((d, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="date"
                value={d}
                onChange={(e) => settDato(i, e.target.value)}
                className="input-field flex-1"
              />
              {datoer.length > 1 && (
                <button
                  onClick={() => fjernDato(i)}
                  type="button"
                  aria-label="Fjern dato"
                  className="px-3 text-ink-700/50 hover:text-wine-700 transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {feil && (
        <p className="text-sm text-wine-700 italic">{feil}</p>
      )}

      <div className="pt-4 border-t border-wine-900/10 flex gap-3">
        <button
          onClick={lagre}
          disabled={laster}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {laster ? 'Lagrer...' : 'Send forslag'}
        </button>
        <button
          onClick={() => router.back()}
          disabled={laster}
          className="btn-secondary text-sm"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
