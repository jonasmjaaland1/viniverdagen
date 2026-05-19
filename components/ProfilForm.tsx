'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Avatar from './Avatar';

export default function ProfilForm({
  medlem,
  epost,
}: {
  medlem: any;
  epost: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const filInputRef = useRef<HTMLInputElement>(null);

  const [navn, setNavn] = useState(medlem.navn || '');
  const [bildeUrl, setBildeUrl] = useState<string | null>(medlem.bilde_url || null);
  const [valgtBilde, setValgtBilde] = useState<File | null>(null);
  const [bildeForhandsvisning, setBildeForhandsvisning] = useState<string | null>(null);

  const [nyttPassord, setNyttPassord] = useState('');
  const [bekreftPassord, setBekreftPassord] = useState('');

  const [lasterProfil, setLasterProfil] = useState(false);
  const [lasterPassord, setLasterPassord] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [suksess, setSuksess] = useState<string | null>(null);

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

  function fjernValgtBilde() {
    setValgtBilde(null);
    if (bildeForhandsvisning) URL.revokeObjectURL(bildeForhandsvisning);
    setBildeForhandsvisning(null);
    if (filInputRef.current) filInputRef.current.value = '';
  }

  async function slettProfilbilde() {
    if (!confirm('Slett profilbilde?')) return;
    setLasterProfil(true);
    setFeil(null);

    // Slett fra storage hvis url finnes
    if (bildeUrl) {
      const urlDeler = bildeUrl.split('/medlem-bilder/');
      if (urlDeler.length > 1) {
        await supabase.storage.from('medlem-bilder').remove([urlDeler[1]]);
      }
    }

    const { error } = await supabase
      .from('medlemmer')
      .update({ bilde_url: null })
      .eq('id', medlem.id);

    if (error) {
      setFeil('Kunne ikke slette bilde: ' + error.message);
    } else {
      setBildeUrl(null);
      setSuksess('Profilbilde slettet');
    }
    setLasterProfil(false);
  }

  async function lagreProfil(e: React.FormEvent) {
    e.preventDefault();
    setLasterProfil(true);
    setFeil(null);
    setSuksess(null);

    let nyBildeUrl = bildeUrl;

    // Last opp bilde hvis valgt
    if (valgtBilde) {
      const ext = valgtBilde.name.split('.').pop();
      const filnavn = `${medlem.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('medlem-bilder')
        .upload(filnavn, valgtBilde, { upsert: true });

      if (uploadErr) {
        setFeil('Kunne ikke laste opp bilde: ' + uploadErr.message);
        setLasterProfil(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('medlem-bilder')
        .getPublicUrl(filnavn);
      nyBildeUrl = urlData.publicUrl;

      // Slett gammelt bilde hvis det finnes
      if (bildeUrl && bildeUrl.includes('/medlem-bilder/')) {
        const gammeltFilnavn = bildeUrl.split('/medlem-bilder/')[1];
        if (gammeltFilnavn && !gammeltFilnavn.includes(filnavn.split('/').pop()!)) {
          await supabase.storage.from('medlem-bilder').remove([gammeltFilnavn]);
        }
      }
    }

    // Oppdater medlem
    const { error } = await supabase
      .from('medlemmer')
      .update({
        navn: navn.trim(),
        bilde_url: nyBildeUrl,
      })
      .eq('id', medlem.id);

    if (error) {
      setFeil('Kunne ikke lagre: ' + error.message);
      setLasterProfil(false);
      return;
    }

    setBildeUrl(nyBildeUrl);
    fjernValgtBilde();
    setSuksess('Profil oppdatert');
    setLasterProfil(false);
    router.refresh();
  }

  async function endrePassord(e: React.FormEvent) {
    e.preventDefault();
    setFeil(null);
    setSuksess(null);

    if (nyttPassord.length < 6) {
      setFeil('Passord må være minst 6 tegn');
      return;
    }
    if (nyttPassord !== bekreftPassord) {
      setFeil('Passordene matcher ikke');
      return;
    }

    setLasterPassord(true);
    const { error } = await supabase.auth.updateUser({ password: nyttPassord });

    if (error) {
      setFeil('Kunne ikke endre passord: ' + error.message);
    } else {
      setSuksess('Passord endret');
      setNyttPassord('');
      setBekreftPassord('');
    }
    setLasterPassord(false);
  }

  const visBilde = bildeForhandsvisning || bildeUrl;

  return (
    <div className="space-y-8">
      {/* Profilbilde og navn */}
      <form onSubmit={lagreProfil} className="kort p-6 md:p-8 space-y-5">
        <h2 className="font-display text-2xl text-wine-900">Profil</h2>

        {/* Bilde-seksjon */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <Avatar
              navn={navn}
              bildeUrl={visBilde}
              storrelse="xl"
            />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <input
              ref={filInputRef}
              type="file"
              accept="image/*"
              onChange={velgBilde}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => filInputRef.current?.click()}
              className="btn-secondary text-sm w-full sm:w-auto"
            >
              {valgtBilde ? 'Bytt valgt bilde' : 'Velg bilde'}
            </button>

            {valgtBilde && (
              <button
                type="button"
                onClick={fjernValgtBilde}
                className="text-xs font-sans text-ink-700/60 hover:text-wine-700"
              >
                Avbryt nytt bilde
              </button>
            )}

            {bildeUrl && !valgtBilde && (
              <button
                type="button"
                onClick={slettProfilbilde}
                disabled={lasterProfil}
                className="text-xs font-sans text-ink-700/60 hover:text-wine-700"
              >
                Slett profilbilde
              </button>
            )}

            <p className="text-xs font-sans text-ink-700/50 italic">
              Maks 5 MB. Bildet beskjæres til sirkel.
            </p>
          </div>
        </div>

        {/* Navn */}
        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            Navn
          </label>
          <input
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            required
            className="input-field"
            placeholder="Ditt navn"
          />
        </div>

        {/* E-post (vises bare) */}
        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            E-post
          </label>
          <input
            value={epost}
            readOnly
            className="input-field opacity-60 cursor-not-allowed"
          />
          <p className="text-xs font-sans text-ink-700/50 italic mt-1">
            E-post kan ikke endres
          </p>
        </div>

        <button
          type="submit"
          disabled={lasterProfil || !navn.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {lasterProfil ? 'Lagrer...' : 'Lagre profil'}
        </button>
      </form>

      {/* Passord */}
      <form onSubmit={endrePassord} className="kort p-6 md:p-8 space-y-5">
        <h2 className="font-display text-2xl text-wine-900">Endre passord</h2>

        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            Nytt passord
          </label>
          <input
            type="password"
            value={nyttPassord}
            onChange={(e) => setNyttPassord(e.target.value)}
            className="input-field"
            placeholder="Minst 6 tegn"
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
            Bekreft nytt passord
          </label>
          <input
            type="password"
            value={bekreftPassord}
            onChange={(e) => setBekreftPassord(e.target.value)}
            className="input-field"
            placeholder="Skriv passordet på nytt"
          />
        </div>

        <button
          type="submit"
          disabled={lasterPassord || !nyttPassord || nyttPassord !== bekreftPassord}
          className="btn-primary disabled:opacity-50"
        >
          {lasterPassord ? 'Endrer...' : 'Endre passord'}
        </button>
      </form>

      {/* Meldinger */}
      {feil && (
        <div className="kort p-4 bg-wine-50 border-l-4 border-wine-700">
          <p className="text-sm text-wine-700">⚠️ {feil}</p>
        </div>
      )}

      {suksess && (
        <div className="kort p-4 bg-green-50 border-l-4 border-green-600">
          <p className="text-sm text-green-700">✓ {suksess}</p>
        </div>
      )}
    </div>
  );
}
