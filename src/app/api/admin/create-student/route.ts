import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();

  // Verify the requester is an admin using the anon client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, full_name } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: 'email, password, full_name are required' },
      { status: 400 }
    );
  }

  // Use service role key to create user via Supabase Auth Admin API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to create user' },
      { status: response.status }
    );
  }

  // 登録完了メールをResendで送信
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: [email],
          subject: 'コーチング学習サイトへのご登録',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="color:#3b5bdb;">コーチング学習サイトへようこそ！</h2>
              <p>${full_name} さん、アカウントが登録されました。</p>
              <p>以下の情報でログインできます。</p>
              <table style="border-collapse:collapse;width:100%;">
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">サイトURL</td><td style="padding:8px;border:1px solid #ddd;"><a href="https://coaching-lms-hazel.vercel.app/login">https://coaching-lms-hazel.vercel.app/login</a></td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">メールアドレス</td><td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">パスワード</td><td style="padding:8px;border:1px solid #ddd;">${password}</td></tr>
              </table>
              <p style="margin-top:16px;color:#888;font-size:12px;">ログイン後はパスワードの変更をお勧めします。</p>
            </div>
          `,
        }),
      });
    }
  } catch (_) {
    // メール送信失敗はアカウント作成の失敗とはしない
  }

  return NextResponse.json({ user: data }, { status: 201 });
}
