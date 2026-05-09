'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Avatar from './Avatar';

interface MeldingType {
  id: string;
  medlem_id: string;
  tekst: string | null;
  bilde_url: string | null;
  svar_til_id: string | null;
  redigert: boolean;
  opprettet_at: string;
  oppdatert_at: string;
  medlemmer?: { id: string; navn: string };
  svar_til?: {
    id: string;
    tekst: string | null;
    bilde_url: string | null;
    medlemmer?: { navn: string };
  } | null;
}

export default function Melding({
  melding,
  erMin,
  visAvsender,
  paSvar,
  erAdmin = false,
}: {
  melding: MeldingType;
  erMin: boolean;
  visAvsender: boolean;
  paSvar: () => void;
  erAdmin?: boolean;
}) {
  const supabase = createClient();
  const [redigerer, setRedigerer] = useState(false);
  const [redigertTekst, setRedigertTekst] = useState(melding.tekst || '');
  const [meny, setMeny] = useState(false);

  const kanSlette = erMin || erAdmin;

  async function lagreRedigering() {
    const ny = redigertTekst.trim();
    if (!ny || ny === melding.tekst) {
      setRedigerer(false);
      return;
    }
    await supabase
      .from('meldinger')
      .update({ tekst: ny })
      .eq('id', melding.id);
    setRedigerer(false);
  }

  async function slett() {
    if (!confirm('Slett meldingen?')) return;
    await supabase.from('meldinger').delete().eq('id', melding.id);
    setMeny(false);
  }

  function formatTid(iso: string): string {
    const d = new Date(iso);
    const naa = new Date();
    const erIDag =
      d.getDate() === naa.getDate() &&
      d.getMonth() === naa.getMonth() &&
      d.getFullYear() === naa.getFullYear();
    if (erIDag) {
      return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className={`flex items-end gap-2 ${erMin ? 'justify-end' : 'justify-start'} group`}>
      {/* Avatar venstre side (for andres meldinger) */}
      {!erMin && (
        <div className={visAvsender ? 'opacity-100' : 'opacity-0'}>
          <Avatar navn={melding.medlemmer?.navn} storrelse="medium" />
        </div>
      )}

      <div className={`max-w-[78%] ${erMin ? 'order-2' : 'order-1'}`}>
        {visAvsender && !erMin && (
          <p className="text-xs font-display text-wine-700 mb-1 ml-1">
            {melding.medlemmer?.navn || 'Ukjent'}
          </p>
        )}

        <div className="relative">
          <div
            className={`rounded-2xl px-4 py-2 ${
              erMin
                ? 'bg-wine-700 text-cream-50 rounded-br-md'
                : 'bg-cream-100 text-ink-700 rounded-bl-md'
            }`}
          >
            {/* Svar-referanse */}
            {melding.svar_til && (
              <div
                className={`mb-2 px-3 py-1.5 rounded text-xs border-l-2 ${
                  erMin
                    ? 'bg-wine-800/40 border-cream-50/50'
                    : 'bg-cream-50 border-wine-700/50'
                }`}
              >
                <p className={`font-display ${erMin ? 'text-cream-50/90' : 'text-wine-700'}`}>
                  {melding.svar_til.medlemmer?.navn || 'Ukjent'}
                </p>
                <p className={`truncate ${erMin ? 'text-cream-50/70' : 'text-ink-700/70'}`}>
                  {melding.svar_til.tekst || (melding.svar_til.bilde_url ? '📷 Bilde' : '')}
                </p>
              </div>
            )}

            {/* Bilde */}
            {melding.bilde_url && (
              <a href={melding.bilde_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={melding.bilde_url}
                  alt=""
                  className="rounded mb-1 max-h-64 object-contain"
                />
              </a>
            )}

            {/* Tekst (eller redigering) */}
            {redigerer ? (
              <div className="space-y-2">
                <textarea
                  value={redigertTekst}
                  onChange={(e) => setRedigertTekst(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded text-ink-700 border border-cream-50/30 resize-none"
                  autoFocus
                />
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={lagreRedigering}
                    className="bg-cream-50 text-wine-700 px-3 py-1 rounded hover:bg-cream-100"
                  >
                    Lagre
                  </button>
                  <button
                    onClick={() => {
                      setRedigerer(false);
                      setRedigertTekst(melding.tekst || '');
                    }}
                    className={erMin ? 'text-cream-50/80' : 'text-ink-700/70'}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              melding.tekst && (
                <p className="whitespace-pre-wrap break-words">{melding.tekst}</p>
              )
            )}

            {/* Tidsstempel */}
            <div
              className={`text-[10px] mt-1 ${
                erMin ? 'text-cream-50/60' : 'text-ink-700/50'
              }`}
            >
              {formatTid(melding.opprettet_at)}
              {melding.redigert && ' · redigert'}
            </div>
          </div>

          {/* Handlingsmeny */}
          {!redigerer && (
            <div
              className={`absolute top-1 ${erMin ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              <button
                onClick={() => setMeny(!meny)}
                className="px-2 py-1 text-xs bg-cream-50 border border-wine-900/10 rounded shadow-sm hover:bg-cream-100"
              >
                ⋯
              </button>
              {meny && (
                <div
                  className={`absolute top-8 ${erMin ? 'left-0' : 'right-0'} bg-cream-50 border border-wine-900/10 rounded shadow-lg z-50 min-w-[120px]`}
                >
                  <button
                    onClick={() => { paSvar(); setMeny(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-cream-100 text-ink-700"
                  >
                    ↩ Svar
                  </button>
                  {erMin && melding.tekst && (
                    <button
                      onClick={() => { setRedigerer(true); setMeny(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cream-100 text-ink-700"
                    >
                      ✏ Rediger
                    </button>
                  )}
                  {kanSlette && (
                    <button
                      onClick={slett}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cream-100 text-wine-700"
                    >
                      🗑 Slett{!erMin && erAdmin ? ' (admin)' : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
