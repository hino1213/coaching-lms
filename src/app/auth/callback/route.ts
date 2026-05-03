import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
      const { searchParams, origin } = new URL(request.url);
      const next = searchParams.get('next') ?? '/dashboard';
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const code = searchParams.get('code');

  const supabaseResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
                cookies: {
                            getAll() {
                                          return request.cookies.getAll();
                            },
                            setAll(cookiesToSet) {
                                          cookiesToSet.forEach(({ name, value, options }) => {
                                                          supabaseResponse.cookies.set(name, value, options);
                                          });
                            },
                },
      }
        );

  if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as 'recovery' });
          if (!error) {
                    return supabaseResponse;
          }
  }

  if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
                    return supabaseResponse;
          }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
