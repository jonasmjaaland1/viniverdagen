"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Reaksjon {
  id: string;
  melding_id: string;
  medlem_id: string;
  emoji: string;
  medlemmer?: { navn: string };
}

interface ReaksjonerProps {
  meldingId: string;
  brukerId: string;
  reaksjoner: Reaksjon[];
}

// Hurtigvalg som vises som rad på toppen av bottom-sheet
const HURTIG = ["👍", "❤️", "😂", "🍷", "🎉", "🥂", "🔥", "🙌"];

export default function Reaksjoner({
  meldingId,
  brukerId,
  reaksjoner,
}: ReaksjonerProps) {
  const supabase = createClient();
  const [pickerApen, setPickerApen] = useState(false);
  const [visFullPicker, setVisFullPicker] = useState(false);
  const [Picker, setPicker] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  // Last picker dynamisk
  useEffect(() => {
    if (visFullPicker && !Picker) {
      Promise.all([
        import("@emoji-mart/react"),
        import("@emoji-mart/data"),
      ]).then(([pickerModule, dataModule]) => {
        setPicker(() => pickerModule.default);
        setData(dataModule.default);
      });
    }
  }, [visFullPicker, Picker]);

  // Lukk picker ved Escape-tast
  useEffect(() => {
    if (!pickerApen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPickerApen(false);
        setVisFullPicker(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerApen]);

  // Forhindre scrolling av bakgrunn når picker er åpen på mobil
  useEffect(() => {
    if (pickerApen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pickerApen]);

  const grupper = new Map<string, Reaksjon[]>();
  for (const r of reaksjoner) {
    if (!grupper.has(r.emoji)) grupper.set(r.emoji, []);
    grupper.get(r.emoji)!.push(r);
  }

  async function toggleReaksjon(emoji: string) {
    const mine = reaksjoner.find(
      (r) => r.emoji === emoji && r.medlem_id === brukerId,
    );
    if (mine) {
      await supabase.from("melding_reaksjoner").delete().eq("id", mine.id);
    } else {
      await supabase.from("melding_reaksjoner").insert({
        melding_id: meldingId,
        medlem_id: brukerId,
        emoji,
      });
    }
  }

  async function velgEmoji(emoji: string) {
    setPickerApen(false);
    setVisFullPicker(false);
    await toggleReaksjon(emoji);
  }

  function handleEmojiSelect(e: any) {
    velgEmoji(e.native);
  }

  function lukkPicker() {
    setPickerApen(false);
    setVisFullPicker(false);
  }

  const harReaksjoner = grupper.size > 0;

  return (
    <>
      <div className="flex flex-wrap gap-1 items-center mt-1">
        {Array.from(grupper.entries()).map(([emoji, rs]) => {
          const harMin = rs.some((r) => r.medlem_id === brukerId);
          const navn = rs.map((r) => r.medlemmer?.navn || "Ukjent").join(", ");
          return (
            <button
              key={emoji}
              onClick={() => toggleReaksjon(emoji)}
              title={navn}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border ${
                harMin
                  ? "bg-wine-700/15 border-wine-700/40 text-wine-800"
                  : "bg-cream-100 border-wine-900/10 text-ink-700 hover:bg-cream-200"
              }`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="font-sans font-medium">{rs.length}</span>
            </button>
          );
        })}

        <button
          onClick={() => setPickerApen(true)}
          aria-label="Legg til reaksjon"
          className={`inline-flex items-center justify-center w-7 h-6 rounded-full text-xs bg-cream-100 hover:bg-cream-200 text-ink-700/60 border border-wine-900/10 transition ${
            harReaksjoner ? "" : "opacity-60"
          }`}
        >
          <span className="text-sm">😊+</span>
        </button>
      </div>

      {/* Bottom sheet / modal */}
      {pickerApen && (
        <div
          className="fixed inset-0 z-[60] bg-ink-900/50 flex items-end sm:items-center justify-center"
          onClick={lukkPicker}
        >
          <div
            className="bg-cream-50 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: "85vh",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-wine-900/10">
              <p className="font-display text-lg text-wine-900">
                Velg reaksjon
              </p>
              <button
                onClick={lukkPicker}
                aria-label="Lukk"
                className="text-ink-700/50 hover:text-wine-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-cream-100"
              >
                ×
              </button>
            </div>

            {/* Hurtigvalg */}
            <div className="p-4">
              <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-3">
                Populære
              </p>
              <div className="grid grid-cols-8 gap-2">
                {HURTIG.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => velgEmoji(emoji)}
                    className="aspect-square flex items-center justify-center text-2xl bg-cream-100 hover:bg-cream-200 active:bg-cream-200 rounded-lg transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Full picker eller "vis flere" knapp */}
            {!visFullPicker ? (
              <div className="px-4 pb-4">
                <button
                  onClick={() => setVisFullPicker(true)}
                  className="w-full py-3 text-sm font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 bg-wine-700/5 hover:bg-wine-700/10 rounded-lg transition border border-wine-700/20"
                >
                  Vis flere emojis ↓
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4">
                {Picker && data ? (
                  <div className="flex justify-center">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      locale="en"
                      previewPosition="none"
                      skinTonePosition="none"
                      maxFrequentRows={2}
                      perLine={8}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm font-sans text-ink-700/60">
                    Laster emojis...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
