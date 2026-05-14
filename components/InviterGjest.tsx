"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Gjest {
  id: string;
  medlem_id: string;
  invitert_at: string;
  medlemmer?: { navn: string };
}

interface InvitasjonsResultat {
  navn: string;
  epost: string;
  lenke: string;
  epost_sendt: boolean;
  epost_feil: string | null;
}

export default function InviterGjest({
  klubbkveldId,
  gjester,
  kveldTittel,
}: {
  klubbkveldId: string;
  gjester: Gjest[];
  kveldTittel?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [vis, setVis] = useState(false);
  const [navn, setNavn] = useState("");
  const [epost, setEpost] = useState("");
  const [sendEpost, setSendEpost] = useState(true);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [resultat, setResultat] = useState<InvitasjonsResultat | null>(null);
  const [kopiert, setKopiert] = useState(false);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    if (!navn.trim() || !epost.trim()) return;
    setLaster(true);
    setFeil(null);
    setResultat(null);

    try {
      const res = await fetch(
        `/api/klubbkvelder/${klubbkveldId}/inviter-gjest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            navn: navn.trim(),
            epost: epost.trim(),
            sendEpost,
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setFeil(data.feil || "Noe gikk galt");
      } else {
        setResultat({
          navn: navn.trim(),
          epost: epost.trim(),
          lenke: data.lenke || "",
          epost_sendt: data.epost_sendt || false,
          epost_feil: data.epost_feil || null,
        });
        setNavn("");
        setEpost("");
        router.refresh();
      }
    } catch (e: any) {
      setFeil(e.message);
    } finally {
      setLaster(false);
    }
  }

  async function fjernGjest(gjestRelasjonsId: string, gjestNavn: string) {
    if (!confirm(`Fjerne ${gjestNavn} fra denne kvelden?`)) return;
    const { error } = await supabase
      .from("klubbkveld_gjester")
      .delete()
      .eq("id", gjestRelasjonsId);
    if (!error) {
      router.refresh();
    }
  }

  async function kopierLenke() {
    if (!resultat?.lenke) return;
    try {
      await navigator.clipboard.writeText(resultat.lenke);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch (e) {
      alert("Kunne ikke kopiere. Marker lenken og kopier manuelt.");
    }
  }

  function smsLink(lenke: string): string {
    const tekst = `Hei ${resultat?.navn || ""}! Du er invitert til ${kveldTittel || "klubbkveld"} hos VinIverdagen. Trykk her for å logge inn: ${lenke}`;
    return `sms:?body=${encodeURIComponent(tekst)}`;
  }

  function whatsappLink(lenke: string): string {
    const tekst = `Hei${resultat?.navn ? " " + resultat.navn : ""}! 🍷\n\nDu er invitert til ${kveldTittel ? `*${kveldTittel}*` : "en klubbkveld"} hos VinIverdagen.\n\nTrykk her for å logge inn:\n${lenke}`;
    return `https://wa.me/?text=${encodeURIComponent(tekst)}`;
  }

  function lukkResultat() {
    setResultat(null);
    setKopiert(false);
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
          {vis ? "Skjul" : "+ Inviter gjest"}
        </button>
      </div>

      {gjester.length > 0 && (
        <ul className="mt-4 space-y-1">
          {gjester.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 py-2 px-3 bg-cream-100 rounded"
            >
              <span className="text-sm font-sans text-ink-700">
                👤 {g.medlemmer?.navn || "Ukjent"}
              </span>
              <button
                onClick={() =>
                  fjernGjest(g.id, g.medlemmer?.navn || "denne gjesten")
                }
                className="text-xs font-sans text-ink-700/50 hover:text-wine-700 transition"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Resultat etter invitasjon - viser lenke med delings-knapper */}
      {resultat && (
        <div className="mt-4 pt-4 border-t border-wine-900/10 space-y-3 bg-cream-100/50 -mx-2 p-4 rounded">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-base text-wine-900">
                ✓ {resultat.navn} er invitert
              </p>
              {resultat.epost_sendt ? (
                <p className="text-xs font-sans text-green-700 mt-1">
                  E-post sendt til {resultat.epost}
                </p>
              ) : resultat.epost_feil ? (
                <p className="text-xs font-sans text-amber-700 mt-1">
                  ⚠️ E-post feilet: {resultat.epost_feil} - bruk lenken under
                </p>
              ) : null}
            </div>
            <button
              onClick={lukkResultat}
              className="text-ink-700/50 hover:text-wine-700 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {resultat.lenke && (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-1">
                  Innloggingslenke (engangs)
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={resultat.lenke}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="input-field flex-1 text-xs font-mono"
                  />
                  <button
                    onClick={kopierLenke}
                    className="btn-secondary text-xs whitespace-nowrap"
                  >
                    {kopiert ? "✓ Kopiert" : "Kopier"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsappLink(resultat.lenke)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-sans uppercase tracking-wider rounded hover:bg-green-700 transition"
                >
                  <span>📱</span>
                  <span>WhatsApp</span>
                </a>
                <a
                  href={smsLink(resultat.lenke)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-wine-700 text-cream-50 text-xs font-sans uppercase tracking-wider rounded hover:bg-wine-800 transition"
                >
                  <span>💬</span>
                  <span>SMS</span>
                </a>
                <a
                  href={`mailto:${resultat.epost}?subject=${encodeURIComponent("Invitasjon til " + (kveldTittel || "klubbkveld"))}&body=${encodeURIComponent(`Hei ${resultat.navn}!\n\nDu er invitert til ${kveldTittel || "klubbkveld"} hos VinIverdagen.\n\nTrykk på lenken for å logge inn:\n${resultat.lenke}`)}`}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-cream-200 text-wine-800 text-xs font-sans uppercase tracking-wider rounded hover:bg-cream-300 transition"
                >
                  <span>✉️</span>
                  <span>E-post</span>
                </a>
              </div>

              <p className="text-xs font-sans text-ink-700/60 italic">
                💡 Lenken er engangsbruk og varer i 1 time. Hvis den utløper kan
                gjesten logge inn på /login med sin e-post.
              </p>
            </>
          )}
        </div>
      )}

      {/* Inviter-skjema */}
      {vis && !resultat && (
        <form
          onSubmit={inviter}
          className="mt-4 pt-4 border-t border-wine-900/10 space-y-3"
        >
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
          </div>
          <label className="flex items-center gap-2 text-sm font-sans text-ink-700 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEpost}
              onChange={(e) => setSendEpost(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Send e-post med magic link</span>
          </label>
          <p className="text-xs font-sans text-ink-700/50 italic">
            Hak av om Supabase skal sende e-post automatisk. Uansett får du
            tilbake en lenke du kan dele på WhatsApp, SMS eller på annen måte.
          </p>

          {feil && <p className="text-sm font-sans text-wine-700">⚠️ {feil}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={laster}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {laster ? "Sender..." : "Inviter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setVis(false);
                setNavn("");
                setEpost("");
                setFeil(null);
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
