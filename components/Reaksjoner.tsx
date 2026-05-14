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

export default function Reaksjoner({
  meldingId,
  brukerId,
  reaksjoner,
}: ReaksjonerProps) {
  const supabase = createClient();
  const [pickerApen, setPickerApen] = useState(false);
  const [Picker, setPicker] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pickerApen && !Picker) {
      Promise.all([
        import("@emoji-mart/react"),
        import("@emoji-mart/data"),
      ]).then(([pickerModule, dataModule]) => {
        setPicker(() => pickerModule.default);
        setData(dataModule.default);
      });
    }
  }, [pickerApen, Picker]);

  useEffect(() => {
    if (!pickerApen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerApen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  async function leggTil(emoji: string) {
    setPickerApen(false);
    await toggleReaksjon(emoji);
  }

  function handleEmojiSelect(e: any) {
    leggTil(e.native);
  }

  // Hvis ingen reaksjoner og picker ikke åpen, vis bare en liten "+"-knapp på hover
  const harReaksjoner = grupper.size > 0;

  return (
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

      <div className="relative">
        <button
          onClick={() => setPickerApen(!pickerApen)}
          aria-label="Legg til reaksjon"
          className={`inline-flex items-center justify-center w-7 h-6 rounded-full text-xs bg-cream-100 hover:bg-cream-200 text-ink-700/60 border border-wine-900/10 transition ${
            harReaksjoner ? "" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span className="text-sm">+</span>
        </button>

        {pickerApen && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden"
          >
            {Picker && data ? (
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="light"
                locale="en"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
              />
            ) : (
              <div className="bg-cream-50 p-4 text-xs font-sans text-ink-700/60">
                Laster...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
