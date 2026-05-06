'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
interface Medlem {
  id: string;
  navn: string;
  godkjent: boolean;
  er_admin: boolean;
}
export default function Navigasjon({ medlem }: { medlem: Medlem }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const lenker = [
    { href: '/', label: 'Forside' },
    { href: '/klubbkvelder', label: 'Klubbkvelder' },
    { href: '/viner', label: 'Viner' },
    { href: '/legg-til-vin', label: 'Legg til vin' },
    { href: '/chat', label: 'Chat' },
    { href: '/statistikk', label: 'Statistikk' },
  ];
  if (medlem.er_admin) {
    lenker.push({ href: '/admin', label: 'Admin' });
  }
  async function loggUt() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return (
    <header className="border-b border-wine-900/10 bg-cream-50/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-2xl text-wine-800 tracking-tight">
          Vin<span className="italic font-light">Iverdagen</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 font-sans text-sm">
          {lenker.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded transition ${
                pathname === l.href
                  ? 'text-wine-800 font-medium'
                  : 'text-ink-700/70 hover:text-wine-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm font-sans text-ink-700/70">
            {medlem.navn}
          </span>
          <button
            onClick={loggUt}
            className="text-xs uppercase tracking-wider font-sans text-ink-700/60 hover:text-wine-800 transition"
          >
            Logg ut
          </button>
        </div>
      </div>
      {/* Mobil-nav */}
      <nav className="md:hidden border-t border-wine-900/5 px-6 py-2 flex gap-1 overflow-x-auto font-sans text-sm">
        {lenker.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded whitespace-nowrap transition ${
              pathname === l.href
                ? 'text-wine-800 font-medium'
                : 'text-ink-700/70'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
