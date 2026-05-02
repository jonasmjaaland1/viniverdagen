'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function SignupSide() {
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [passord, setPassord] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [suksess, setSuksess] = useState(false);
  const [laster, setLaster] = useState(false);
  const supabase = createClient();

  async function registrer(e: React.FormEvent) {
    e.preventDefault();
    setFeil(null);
    setLaster(true);

    if (passord.length < 8) {
      setFeil('Passordet må være minst 8 tegn.');
      setLaster(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: epost,
      password: passord,
      options: { data: { navn } },
    });

    if (error) {
      setFeil(error.message);
      setLaster(false);
      return;
    }

    setSuksess(true);
    setLaster(false);
  }

  if (suksess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full kort p-10 text-center">
          <h2 className="font-display text-3xl text-wine-800 mb-4">Takk for registreringen!</h2>
          <div className="gold-line w-24 mx-auto my-4" />
          <p className="text-ink-700/80 mb-6">
            Kontoen din venter nå på godkjenning fra administrator. Du blir gitt tilgang så snart den er aktivert.
          </p>
          <Link href="/login" className="btn-secondary">Til innlogging</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-wine-800 mb-2">
            Vin<span className="italic font-light">Iverdagen</span>
          </h1>
          <div className="gold-line w-24 mx-auto my-4" />
        </div>

        <form onSubmit={registrer} className="space-y-4 kort p-8">
          <h2 className="font-display text-2xl text-wine-900 mb-6">Bli medlem</h2>

          <div>
            <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-1.5">
              Navn
            </label>
            <input
              type="text"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-1.5">
              E-post
            </label>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-1.5">
              Passord
            </label>
            <input
              type="password"
              value={passord}
              onChange={(e) => setPassord(e.target.value)}
              className="input-field"
              required
              minLength={8}
            />
            <p className="text-xs text-ink-700/50 mt-1 font-sans">Minst 8 tegn</p>
          </div>

          {feil && (
            <div className="text-sm text-wine-700 bg-wine-50 border border-wine-200 px-4 py-2 rounded">
              {feil}
            </div>
          )}

          <button type="submit" disabled={laster} className="btn-primary w-full disabled:opacity-50">
            {laster ? 'Registrerer …' : 'Registrer'}
          </button>

          <p className="text-center text-sm text-ink-700/60 pt-2">
            Allerede medlem?{' '}
            <Link href="/login" className="text-wine-700 hover:underline">
              Logg inn
            </Link>
          </p>

          <p className="text-center text-xs text-ink-700/50 font-sans pt-2">
            Nye kontoer godkjennes manuelt av administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
