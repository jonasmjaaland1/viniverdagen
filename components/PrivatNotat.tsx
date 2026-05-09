'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function PrivatNotat({
  varenummer,
  brukerId,
}: {
  varenummer: string;
  brukerId: string;
}) {
  const supabase = createClient();
  const [notat, setNotat] = useState<string>('');
  const [opprinneligNotat, setOpprinneligNotat] = useState<string>('');
  const [oppdatertAt, setOppdatertAt] = useState<string | null>(null);
  const [laster, setLaster] = useState(true);
  const [redigerer, setRedigerer] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    async function hent() {
      const { data } = await supabase
        .from('private_notater')
        .select('tekst, oppdatert_at')
        .eq('medlem_id', brukerId)
        .eq('varenummer', varenummer)
        .maybeSingle();

      if (data) {
        setNotat(data.tekst);
        setOpprinneligNotat(data.tekst);
        setOppdatertAt(data.oppdatert_at);
      }
      setLaster(false);
    }
    hent();
  }, [supabase, brukerId, varenummer]);

  async function lagre() {
    if (!notat.trim()) {
      setFeil('Notatet kan ikke være tomt.');
      return;
    }

    setLagrer(true);
    setFeil(null);

    const { error } = await supabase
      .from('private_notater')
      .upsert({
        medlem_id: brukerId,
        varenummer,
        tekst: notat.trim(),
      }, { onConflict: 'medlem_id,varenummer' });

    if (error) {
      setFeil('Kunne ikke lagre: ' + error.message);
      setLagrer(false);
      return;
    }

    setOpprinneligNotat(notat.trim());
    setOppdatertAt(new Date().toISOString());
    setRedigerer(false);
    setLagrer(false);
  }

  async function slett() {
    if (!confirm('Slette notatet ditt?')) return;

    setLagrer(true);
    await supabase
      .from('private_notater')
      .delete()
      .eq('medlem_id', brukerId)
      .eq('varenummer', varenummer);

    setNotat('');
    setOpprinneligNotat('');
    setOppdatertAt(null);
    setRedigerer(false);
    setLagrer(false);
  }

  function avbryt() {
    setNotat(opprinneligNotat);
    setRedigerer(false);
    setFeil(null);
  }

  if (laster) {
    return (
      <div className="kort p-5 animate-pulse">
        <div className="h-4 bg-cream-100 rounded w-1/3 mb-3" />
        <div className="h-16 bg-cream-100 rounded" />
      </div>
    );
  }

  // Ingen notat enda - vis "Legg til"-knapp
  if (!opprinneligNotat && !redigerer) {
    return (
      <div className="kort p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div className="flex-1">
            <h3 className="font-display text-lg text-wine-900">Privat notat</h3>
            <p className="text-sm font-sans text-ink-700/60 mt-1">
              Skriv et personlig notat om denne vinen - kun du kan lese det.
            </p>
            <button
              onClick={() => setRedigerer(true)}
              className="btn-secondary text-xs mt-3"
            >
              + Legg til notat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redigeringsmodus
  if (redigerer) {
    return (
      <div className="kort p-5 border-l-4 border-amber-700">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div className="flex-1">
            <h3 className="font-display text-lg text-wine-900 mb-2">
              Mitt private notat
            </h3>
            <textarea
              value={notat}
              onChange={(e) => setNotat(e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="Skriv ditt notat her ..."
              autoFocus
            />
            {feil && (
              <p className="text-sm text-wine-700 mt-2">{feil}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={lagre}
                disabled={lagrer || !notat.trim()}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {lagrer ? 'Lagrer …' : 'Lagre'}
              </button>
              <button
                onClick={avbryt}
                disabled={lagrer}
                className="btn-secondary text-xs"
              >
                Avbryt
              </button>
              {opprinneligNotat && (
                <button
                  onClick={slett}
                  disabled={lagrer}
                  className="text-xs font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  Slett
                </button>
              )}
            </div>
            <p className="text-xs text-ink-700/50 italic mt-3">
              🔒 Kun du kan se dette notatet
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Vis-modus - har notat
  return (
    <div className="kort p-5 border-l-4 border-amber-700 bg-cream-100/30">
      <div className="flex items-start gap-3">
        <span className="text-xl">🔒</span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg text-wine-900">
              Mitt private notat
            </h3>
            <button
              onClick={() => setRedigerer(true)}
              className="text-xs font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
            >
              Rediger
            </button>
          </div>
          <p className="text-base font-sans text-ink-700/85 leading-relaxed mt-2 whitespace-pre-wrap">
            {opprinneligNotat}
          </p>
          {oppdatertAt && (
            <p className="text-xs text-ink-700/50 italic mt-3">
              🔒 Kun du kan se dette · oppdatert{' '}
              {new Date(oppdatertAt).toLocaleDateString('nb-NO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
