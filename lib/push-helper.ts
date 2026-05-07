// Hjelper for å sende push-varsler fra serverkoden
// Brukes av API-ruter etter at en hendelse skjer

interface SendVarselArgs {
  tittel: string;
  tekst: string;
  url?: string;
  ekskluderMedlem?: string;
}

export async function sendPushVarsel(args: SendVarselArgs): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  try {
    const res = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('Push-varsel feilet:', data);
    }
  } catch (e) {
    console.error('Kunne ikke sende push-varsel:', e);
  }
}
