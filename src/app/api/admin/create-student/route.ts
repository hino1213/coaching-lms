import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

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
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, email_verified: true }
    });
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }
    const user = userData.user;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: user.id, full_name, role: 'student' });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
    try {
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (gmailUser && gmailPass) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com', port: 587, secure: false,
          auth: { user: gmailUser, pass: gmailPass }
        });
        const siteUrl = 'https://coaching-lms-hazel.vercel.app';
        await transporter.sendMail({
          from: `"コーチング学習サイト" <${gmailUser}>`,
          to: email,
          subject: 'コーチング学習サイトへのご登録',
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#4f46e5;">コーチング学習サイトへようこそ！</h2>
            <p>${full_name} さん、アカウントが登録されました。</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0;">
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 12px;font-weight:bold;">サイトURL</td>
                <td style="padding:8px 12px;"><a href="${siteUrl}">${siteUrl}</a></td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:bold;">メールアドレス</td>
                <td style="padding:8px 12px;">${email}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 12px;font-weight:bold;">パスワード</td>
                <td style="padding:8px 12px;">${password}</td>
              </tr>
            </table>
            <p style="color:#6b7280;font-size:12px;">ログイン後はパスワードの変更をお勧めします。</p>
          </div>`
        });
      }
    } catch (_) {
      // メール送信失敗はアカウント作成の失敗とはしない
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
