'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Melding from './Melding';
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

interface SistSettType {
  medlem_id: string;
  sist_sett: string;
  medlemmer?: { navn: string };
}

export default function Chat({
  brukerId,
  brukernavn,
  startMeldinger,
  erAdmin = false,
}: {
  brukerId: string;
  brukernavn: string;
  startMeldinger: MeldingType[];
  erAdmin?: boolean;
}) {
  const supabase = createClient();
  const [meldinger, setMeldinger] = useState<MeldingType[]>(startMeldinger);
  const [tekst, setTekst] = useState('');
  const [svarerTil, setSvarerTil] = useState<MeldingType | null>(null);
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [valgtBilde, setValgtBilde] = useState<File | null>(null);
  const [bildeForhandsvisning, setBildeForhandsvisning] = useState<string | null>(null);
  const [aktivitet, setAktivitet] = useState<SistSettType[]>([]);
  const meldingsListeRef = useRef<HTMLDivElement>(null);
  const filInputRef = useRef<HTMLInputElement>(null);

  const scrollTilBunnen = useCallback(() => {
    if (meldingsListeRef.current) {
      meldingsListeRef.current.scrollTop = meldingsListeRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollTilBunnen();
  }, [meldinger.length, scrollTilBunnen]);

  // Oppdater "sist sett" for denne brukeren
  const oppdaterSistSett = useCallback(async () => {
    await supabase
      .from('chat_aktivitet')
      .upsert({
        medlem_id: brukerId,
        sist_sett: new Date().toISOString(),
      });
  }, [supabase, brukerId]);

  // Oppdater sist sett når man kommer inn, og hvert 30. sek
  useEffect(() => {
    oppdaterSistSett();
    const interval = setInterval(oppdaterSistSett, 30000);
    return () => clearInterval(interval);
  }, [oppdaterSistSett]);

  // Også når ny melding kommer eller bruker scroller
  useEffect(() => {
    if (meldinger.length > 0) {
      oppdaterSistSett();
    }
  }, [meldinger.length, oppdaterSistSett]);

  // Hent aktivitet ved oppstart
  useEffect(() => {
    async function hentAktivitet() {
      const { data } = await supabase
        .from('chat_aktivitet')
        .select('medlem_id, sist_sett, medlemmer(navn)')
        .neq('medlem_id', brukerId);
      if (data) setAktivitet(data as any);
    }
    hentAktivitet();
  }, [supabase, brukerId]);

  // Realtime: meldinger
  useEffect(() => {
    const channel = supabase
      .channel('meldinger-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meldinger' },
        async (payload) => {
          const { data } = await supabase
            .from('meldinger')
            .select(`
              *,
              medlemmer (id, navn),
              svar_til:svar_til_id (
                id, tekst, bilde_url,
                medlemmer (navn)
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMeldinger((prev) => {
              if (prev.find((m) => m.id === data.id)) return prev;
              return [...prev, data as MeldingType];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meldinger' },
        async (payload) => {
          const { data } = await supabase
            .from('meldinger')
            .select(`
              *,
              medlemmer (id, navn),
              svar_til:svar_til_id (
                id, tekst, bilde_url,
                medlemmer (navn)
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMeldinger((prev) =>
              prev.map((m) => (m.id === data.id ? (data as MeldingType) : m))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'meldinger' },
        (payload) => {
          setMeldinger((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Realtime: chat_aktivitet
  useEffect(() => {
    const channel = supabase
      .channel('aktivitet-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_aktivitet' },
        async (payload) => {
          const nyMedlemId = (payload.new as any)?.medlem_id;
          if (!nyMedlemId || nyMedlemId === brukerId) return;

          const { data } = await supabase
            .from('chat_aktivitet')
            .select('medlem_id, sist_sett, medlemmer(navn)')
            .eq('medlem_id', nyMedlemId)
            .single();

          if (data) {
            setAktivitet((prev) => {
              const filtrert = prev.filter((a) => a.medlem_id !== nyMedlemId);
              return [...filtrert, data as any];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, brukerId]);

  function velgBilde(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    if (!fil) return;
    if (fil.size > 5 * 1024 * 1024) {
      setFeil('Bilde må være under 5 MB.');
      return;
    }
    if (!fil.type.startsWith('image/')) {
      setFeil('Bare bildefiler er tillatt.');
      return;
    }
    setValgtBilde(fil);
    setBildeForhandsvisning(URL.createObjectURL(fil));
    setFeil(null);
  }

  function fjernBilde() {
    setValgtBilde(null);
    if (bildeForhandsvisning) URL.revokeObjectURL(bildeForhandsvisning);
    setBildeForhandsvisning(null);
    if (filInputRef.current) filInputRef.current.value = '';
  }

  async function sendMelding() {
    if (!tekst.trim() && !valgtBilde) return;
    setSender(true);
    setFeil(null);

    let bilde_url: string | null = null;

    if (valgtBilde) {
      const filendelse = valgtBilde.name.split('.').pop();
      const filnavn = `${brukerId}/${Date.now()}.${filendelse}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-bilder')
        .upload(filnavn, valgtBilde);

      if (uploadError) {
        setFeil('Kunne ikke laste opp bilde: ' + uploadError.message);
        setSender(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-bilder')
        .getPublicUrl(filnavn);
      bilde_url = urlData.publicUrl;
    }

    const { error } = await supabase.from('meldinger').insert({
      medlem_id: brukerId,
      tekst: tekst.trim() || null,
      bilde_url,
      svar_til_id: svarerTil?.id || null,
    });

    if (error) {
      setFeil(error.message);
      setSender(false);
      return;
    }

    setTekst('');
    setSvarerTil(null);
    fjernBilde();
    setSender(false);
    oppdaterSistSett();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMelding();
    }
  }

  // Beregn hvem som har sett siste melding fra meg
  const minSisteMelding = [...meldinger]
    .reverse()
    .find((m) => m.medlem_id === brukerId);

  const sett_av = minSisteMelding
    ? aktivitet.filter((a) => {
        return new Date(a.sist_sett) >= new Date(minSisteMelding.opprettet_at);
      })
    : [];

  return (
    <div className="kort flex flex-col h-[calc(100vh-220px)] min-h-[500px] max-h-[800px] overflow-hidden">
      <div
        ref={meldingsListeRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {meldinger.length === 0 ? (
          <p className="text-center text-ink-700/60 italic py-8">
            Ingen meldinger ennå. Vær den første!
          </p>
        ) : (
          <>
            {meldinger.map((m, i) => {
              const forrige = i > 0 ? meldinger[i - 1] : null;
              const visAvsender =
                !forrige ||
                forrige.medlem_id !== m.medlem_id ||
                new Date(m.opprettet_at).getTime() -
                  new Date(forrige.opprettet_at).getTime() >
                  5 * 60 * 1000;

              return (
                <Melding
                  key={m.id}
                  melding={m}
                  erMin={m.medlem_id === brukerId}
                  visAvsender={visAvsender}
                  paSvar={() => setSvarerTil(m)}
                  erAdmin={erAdmin}
                />
              );
            })}

            {/* "Lest av"-indikator under siste melding fra meg */}
            {sett_av.length > 0 && minSisteMelding && (
              <div className="flex justify-end items-center gap-2 mt-1 mr-1 pb-1">
                <span className="text-[10px] text-ink-700/50 font-sans">Sett av</span>
                <div className="flex -space-x-1">
                  {sett_av.slice(0, 5).map((a) => (
                    <Avatar
                      key={a.medlem_id}
                      navn={a.medlemmer?.navn}
                      storrelse="liten"
                      tittel={`${a.medlemmer?.navn} (${new Date(a.sist_sett).toLocaleString('nb-NO')})`}
                    />
                  ))}
                  {sett_av.length > 5 && (
                    <span className="text-[10px] text-ink-700/50 ml-2 self-center">
                      +{sett_av.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-wine-900/10 p-3 bg-cream-50/50">
        {svarerTil && (
          <div className="bg-cream-100 border-l-4 border-wine-700 px-3 py-2 mb-2 rounded text-sm flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs text-wine-700">
                Svarer på {svarerTil.medlemmer?.navn}
              </p>
              <p className="text-ink-700/70 truncate">
                {svarerTil.tekst || (svarerTil.bilde_url ? '📷 Bilde' : '')}
              </p>
            </div>
            <button
              onClick={() => setSvarerTil(null)}
              className="text-ink-700/50 hover:text-wine-700 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {bildeForhandsvisning && (
          <div className="mb-2 relative inline-block">
            <img
              src={bildeForhandsvisning}
              alt=""
              className="max-h-32 rounded border border-wine-900/10"
            />
            <button
              onClick={fjernBilde}
              className="absolute -top-2 -right-2 bg-wine-700 text-cream-50 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-wine-800"
            >
              ×
            </button>
          </div>
        )}

        {feil && (
          <p className="text-xs text-wine-700 mb-2">{feil}</p>
        )}

        <div className="flex gap-2 items-end">
          <button
            onClick={() => filInputRef.current?.click()}
            disabled={sender}
            className="text-xl px-2 py-2 hover:bg-cream-100 rounded transition disabled:opacity-50"
            title="Legg ved bilde"
          >
            📷
          </button>
          <input
            ref={filInputRef}
            type="file"
            accept="image/*"
            onChange={velgBilde}
            className="hidden"
          />
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv en melding …"
            rows={1}
            className="flex-1 input-field resize-none min-h-[44px] max-h-32"
            disabled={sender}
          />
          <button
            onClick={sendMelding}
            disabled={sender || (!tekst.trim() && !valgtBilde)}
            className="btn-primary disabled:opacity-50"
          >
            {sender ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
