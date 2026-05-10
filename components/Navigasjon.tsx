"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import UlestTeller from "./UlestTeller";

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
  const [menyApen, setMenyApen] = useState(false);

  useEffect(() => {
    setMenyApen(false);
  }, [pathname]);

  useEffect(() => {
    if (menyApen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menyApen]);

  const hovedLenker = [
    { href: "/", label: "Forside" },
    { href: "/viner", label: "Viner" },
    { href: "/legg-til-vin", label: "Legg til vin" },
    { href: "/chat", label: "Chat", visUlest: true },
  ];

  const menyLenker = [
    { href: "/", label: "Forside", ikon: "🏠" },
    { href: "/klubbkvelder", label: "Klubbkvelder", ikon: "🍷" },
    { href: "/datoer", label: "Dato-forslag", ikon: "📅" },
    { href: "/viner", label: "Viner", ikon: "🍇" },
    { href: "/legg-til-vin", label: "Legg til vin", ikon: "➕" },
    { href: "/chat", label: "Chat", ikon: "💬", visUlest: true },
    { href: "/sporr-claude", label: "Spør KI", ikon: "🤖" },
    { href: "/mine-viner", label: "Mine viner", ikon: "📦" },
    { href: "/statistikk", label: "Statistikk", ikon: "📊" },
    { href: "/innstillinger", label: "Innstillinger", ikon: "🔔" },
  ];

  if (medlem.er_admin) {
    menyLenker.push({ href: "/admin", label: "Admin", ikon: "⚙️" });
  }

  async function loggUt() {
    setMenyApen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-wine-900/10 bg-cream-50/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-2xl text-wine-800 tracking-tight flex-shrink-0"
          >
            Vin<span className="italic font-light">Iverdagen</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 font-sans text-sm flex-1 justify-end mr-2">
            {hovedLenker.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded transition flex items-center ${
                  pathname === l.href
                    ? "text-wine-800 font-medium"
                    : "text-ink-700/70 hover:text-wine-800"
                }`}
              >
                {l.label}
                {l.visUlest && pathname !== l.href && (
                  <UlestTeller brukerId={medlem.id} />
                )}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setMenyApen(true)}
            aria-label="Åpne meny"
            className="flex flex-col items-center justify-center w-10 h-10 rounded hover:bg-cream-100 transition group"
          >
            <span className="block w-5 h-0.5 bg-wine-800 mb-1 transition-all"></span>
            <span className="block w-5 h-0.5 bg-wine-800 mb-1 transition-all"></span>
            <span className="block w-5 h-0.5 bg-wine-800 transition-all"></span>
          </button>
        </div>

        <nav className="sm:hidden border-t border-wine-900/5 px-4 py-2 flex gap-1 overflow-x-auto font-sans text-sm">
          {hovedLenker.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded whitespace-nowrap transition flex items-center ${
                pathname === l.href
                  ? "text-wine-800 font-medium"
                  : "text-ink-700/70"
              }`}
            >
              {l.label}
              {l.visUlest && pathname !== l.href && (
                <UlestTeller brukerId={medlem.id} />
              )}
            </Link>
          ))}
        </nav>
      </header>

      <div
        className={`fixed inset-0 bg-ink-900/40 z-50 transition-opacity duration-300 ${
          menyApen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenyApen(false)}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-sm bg-cream-50 z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          menyApen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-wine-900/10">
          <p className="font-display text-xl text-wine-800">Meny</p>
          <button
            onClick={() => setMenyApen(false)}
            aria-label="Lukk meny"
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-cream-100 transition text-ink-700/70 hover:text-wine-800 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 border-b border-wine-900/10 bg-cream-100/50">
          <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50">
            Logget inn som
          </p>
          <p className="font-display text-lg text-wine-900 mt-0.5">
            {medlem.navn}
          </p>
          {medlem.er_admin && (
            <span className="inline-block mt-1 text-xs uppercase tracking-wider font-sans bg-wine-700 text-cream-50 px-2 py-0.5 rounded">
              Admin
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {menyLenker.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-5 py-3 transition ${
                pathname === l.href
                  ? "bg-wine-50 text-wine-800 font-medium border-l-4 border-wine-700"
                  : "text-ink-700 hover:bg-cream-100 border-l-4 border-transparent"
              }`}
            >
              <span className="text-xl">{l.ikon}</span>
              <span className="font-sans flex-1">{l.label}</span>
              {l.visUlest && pathname !== l.href && (
                <UlestTeller brukerId={medlem.id} />
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-wine-900/10 p-5">
          <button
            onClick={loggUt}
            className="w-full text-sm uppercase tracking-wider font-sans text-ink-700/70 hover:text-wine-800 py-2 transition flex items-center justify-center gap-2"
          >
            <span>↩</span>
            <span>Logg ut</span>
          </button>
        </div>
      </aside>
    </>
  );
}
