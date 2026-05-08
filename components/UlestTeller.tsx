"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function UlestTeller({ brukerId }: { brukerId: string }) {
  const supabase = createClient();
  const [ulest, setUlest] = useState(0);
  const kanalIdRef = useRef<string>(
    `ulest-teller-${Math.random().toString(36).substring(2, 11)}`,
  );

  useEffect(() => {
    let aktiv = true;
    const kanalId = kanalIdRef.current;

    async function hentUlest() {
      const { data: aktivitet } = await supabase
        .from("chat_aktivitet")
        .select("sist_sett")
        .eq("medlem_id", brukerId)
        .maybeSingle();

      const sistSett = aktivitet?.sist_sett || "1970-01-01";

      const { count } = await supabase
        .from("meldinger")
        .select("*", { count: "exact", head: true })
        .gt("opprettet_at", sistSett)
        .neq("medlem_id", brukerId);

      if (aktiv) setUlest(count || 0);
    }

    hentUlest();

    const channel = supabase
      .channel(kanalId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meldinger" },
        () => hentUlest(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "meldinger" },
        () => hentUlest(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_aktivitet",
          filter: `medlem_id=eq.${brukerId}`,
        },
        () => hentUlest(),
      )
      .subscribe();

    return () => {
      aktiv = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, brukerId]);

  if (ulest === 0) return null;

  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-wine-700 text-cream-50 text-[10px] font-medium">
      {ulest > 99 ? "99+" : ulest}
    </span>
  );
}
