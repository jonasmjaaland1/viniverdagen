'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function LoginSide() {
  const [epost, setEpost] = useState('');
  const [passord, setPassord] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [laster, setLaster] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function loggInn(e: React.FormEvent) {
    e.preventDefault();
    setFeil(null);
    setLaster(true);

    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: passord });
    if (error) {
      setFeil('Feil e-post eller passord.');
      setLaster(false);
      return;
    }

    // Sjekk om godkjent
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: medlem } = await supabase
        .from('medlemmer')
        .select('godkjent')
        .eq('id', user.id)
        .single();

      if (!medlem?.godkjent) {
        await supabase.auth.signOut();
        setFeil('Kontoen din er ikke godkjent ennå. Du blir kontaktet når den er aktivert.');
        setLaster(false);
        return;
      }
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl text-wine-800 mb-2">
            Vin<span className="italic font-light">Iverdagen</span>
          </h1>
          <div className="gold-line w-24 mx-auto my-4" />
          <p className="text-ink-700/70 italic">Vinklubbens digitale stue</p>
        </div>

        <form onSubmit={loggInn} className="space-y-4 kort p-8">
          <h2 className="font-display text-2xl text-wine-900 mb-6">Logg inn</h2>

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
            />
          </div>

          {feil && (
            <div className="text-sm text-wine-700 bg-wine-50 border border-wine-200 px-4 py-2 rounded">
              {feil}
            </div>
          )}

          <button type="submit" disabled={laster} className="btn-primary w-full disabled:opacity-50">
            {laster ? 'Logger inn …' : 'Logg inn'}
          </button>

          <p className="text-center text-sm text-ink-700/60 pt-2">
            Ikke medlem ennå?{' '}
            <Link href="/signup" className="text-wine-700 hover:underline">
              Registrer deg
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
