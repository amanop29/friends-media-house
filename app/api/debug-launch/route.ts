import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      error: 'Missing env vars',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    });
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/settings?key=eq.site_config&select=value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    const data = await res.json();

    return NextResponse.json({
      status: res.status,
      data,
      launchPageEnabled: data?.[0]?.value?.launchPageEnabled ?? 'NOT SET',
      launchPagePassword: data?.[0]?.value?.launchPagePassword ? '***SET***' : 'NOT SET',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
