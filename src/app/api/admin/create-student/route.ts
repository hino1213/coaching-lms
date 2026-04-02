import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { full_name, email, password } = await request.json();
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
    }

    // Create auth user
    // Note: on_auth_user_created trigger will automatically insert into profiles
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, email_verified: true }
    });
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }
    const user = userData.user;

    // Update the profile created by the trigger: set role to 'student'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'student', full_name, email })
      .eq('id', user.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Send welcome email via Resend API
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const siteUrl = 'https://coaching-lms-hazel.vercel.app';
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'コーチング学習サイト <onboarding@resend.dev>',
            to: [email],
            subject: 'コーチング学習サイトへのご登録',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">コーチング学習サイトへようこそ！</h2>
                <p>${full_name} 様</p>
                <p>アカウントが作成されました。以下の情報でログインしてください。</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>メールアドレス：</strong> ${email}</p>
                  <p><strong>パスワード：</strong> ${password}</p>
                </div>
                <p>
                  <a href="${siteUrl}/login"
                     style="background: #4CAF50; color: white; padding: 12px 24px;
                            text-decoration: none; border-radius: 4px; display: inline-block;">
                    ログインする
                  </a>
                </p>
                <p style="color: #666; font-size: 12px;">
                  このメールに心当たりがない場合は無視してください。
                </p>
              </div>
            `
          })
        });
        const emailData = await emailRes.json();
        console.log('Resend response:', JSON.stringify(emailData));
      }
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // email failure does not fail account creation
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
