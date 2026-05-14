'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface Gjest {
  id: string;
  medlem_id: string;
  invitert_at: string;
  medlemmer?: { navn: string };
}

export default function InviterGjest({
  klubbkveldId,
  gjester,
}: {
  klubbkveldId: string;
  gjester: Gjest[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [vis, setVis] = useState(false);
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [laster, setLaster] = useState(false);
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil' | 'advarsel'; tekst: string } | null>(null);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    if (!navn.trim() || !epost.trim()) return;
    setLaster(true);
    setMelding(null);

    try {
      const res = await fetch(`/api/klubbkvelder/${klubbkveldId}/inviter-gjest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navn: navn.trim(), epost: epost.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMelding({ type: 'feil', tekst: data.feil || 'Noe gikk galt' });
      } else if (data.advarsel) {
        setMelding({ type: 'advarsel', tekst: data.advarsel });
        setNavn('');
        setEpost('');
        router.refresh();
      } else {
        setMelding({ type: 'ok', tekst: `Invitasjon sendt til ${epost}` });
        setNavn('');
        setEpost('');
        router.refresh();
      }
    } catch (e: any) {
      setMelding({ type: 'feil', tekst: e.message });
    } finally {
      setLaster(false);
    }
  }

  async function fjernGjest(gjestRelasjonsId: string, gjestNavn: string) {
    if (!confirm(`Fjerne ${gjestNavn} fra denne kvelden?`)) return;
    const { error } = await supabase
      .from('klubbkveld_gjester')
      .delete()
      .eq('id', gjestRelasjonsId);
    if (!error) {
      router.refresh();
    }
  }

  return (
    <div className="kort p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg text-wine-900">
            Gjester ({gjester.length})
          </h3>
          <p className="text-xs font-sans text-ink-700/60 italic mt-0.5">
            Inviter eksterne til å se denne kvelden
          </p>
        </div>
        <button
          onClick={() => setVis(!vis)}
          className="text-xs font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 transition"
        >
          {vis ? 'Skjul' : '+ Inviter gjest'}
        </button>
      </div>

      {/* Liste over eksisterende gjester */}
      {gjester.length > 0 && (
        <ul className="mt-4 space-y-1">
          {gjester.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 py-2 px-3 bg-cream-100 rounded"
            >
              <span className="text-sm font-sans text-ink-700">
                👤 {g.medlemmer?.navn || 'Ukjent'}
              </span>
              <button
                onClick={() => fjernGjest(g.id, g.medlemmer?.navn || 'denne gjesten')}
                className="text-xs font-sans text-ink-700/50 hover:text-wine-700 transition"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Inviter-skjema */}
      {vis && (
        <form onSubmit={inviter} className="mt-4 pt-4 border-t border-wine-900/10 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-1">
              Navn
            </label>
            <input
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              placeholder="F.eks. Per Hansen"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-1">
              E-post
            </label>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              placeholder="per@eksempel.no"
              className="input-field"
              required
            />
            <p className="text-xs font-sans text-ink-700/50 italic mt-1">
              Gjesten får magic link på e-post for å logge inn
            </p>
          </div>

          {melding && (
            <p
              className={`text-sm font-sans ${
                melding.type === 'ok'
                  ? 'text-green-700'
                  : melding.type === 'advarsel'
                  ? 'text-amber-700'
                  : 'text-wine-700'
              }`}
            >
              {melding.type === 'ok' && '✓ '}
              {melding.type === 'advarsel' && '⚠️ '}
              {melding.type === 'feil' && '✕ '}
              {melding.tekst}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={laster}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {laster ? 'Sender...' : 'Send invitasjon'}
            </button>
            <button
              type="button"
              onClick={() => {
                setVis(false);
                setNavn('');
                setEpost('');
                setMelding(null);
              }}
              className="btn-secondary text-sm"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
