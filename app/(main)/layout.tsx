import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if visitor has bypass cookie
  const cookieStore = await cookies();
  const hasBypass = cookieStore.get('fmh_launch_bypass')?.value === '1';

  if (!hasBypass) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/settings?key=eq.site_config&select=value`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            next: { revalidate: 30 },
          }
        );
        const data = await res.json();
        if (data?.[0]?.value?.launchPageEnabled === true) {
          redirect('/launch');
        }
      } catch {
        // Supabase not configured or unreachable — allow through
      }
    }
  }

  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}

