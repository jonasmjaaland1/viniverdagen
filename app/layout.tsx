import type { Metadata } from 'next';
import './globals.css';
import Navigasjon from '@/components/Navigasjon';
import { createClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'VinIverdagen',
  description: 'Vinklubbens digitale stue',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let medlem = null;
  if (user) {
    const { data } = await supabase
      .from('medlemmer')
      .select('id, navn, godkjent, er_admin')
      .eq('id', user.id)
      .single();
    medlem = data;
  }

  return (
    <html lang="nb">
      <body>
        {medlem && <Navigasjon medlem={medlem} />}
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="mt-24 py-8 text-center text-sm text-ink-700/60 font-sans">
          <div className="gold-line w-32 mx-auto mb-4" />
          VinIverdagen · {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
