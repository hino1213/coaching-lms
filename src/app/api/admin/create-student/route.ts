import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
          from: '"\u30b3\u30fc\u30c1\u30f3\u30b0\u5b66\u7fd2\u30b5\u30a4\u30c8" <' + gmailUser + '>',
          to: email,
          subject: '\u30b3\u30fc\u30c1\u30f3\u30b0\u5b66\u7fd2\u30b5\u30a4\u30c8\u3078\u306e\u3054\u767b\u9332',
          html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;"><h2 style="color:#4f46e5;">\u30b3\u30fc\u30c1\u30f3\u30b0\u5b66\u7fd2\u30b5\u30a4\u30c8\u3078\u3088\u3046\u3053\u305d\uff01</h2><p>' + full_name + ' \u3055\u3093\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u304c\u767b\u9332\u3055\u308c\u307e\u3057\u305f\u3002</p><table style="border-collapse:collapse;width:100%;margin:16px 0;"><tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">\u30b5\u30a4\u30c8URL</td><td style="padding:8px 12px;"><a href="' + siteUrl + '">' + siteUrl + '</a></td></tr><tr><td style="padding:8px 12px;font-weight:bold;">\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9</td><td style="padding:8px 12px;">' + email + '</td></tr><tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">\u30d1\u30b9\u30ef\u30fc\u30c9</td><td style="padding:8px 12px;">' + password + '</td></tr></table><p style="color:#6b7280;font-size:12px;">\u30ed\u30b0\u30a4\u30f3\u5f8c\u306f\u30d1\u30b9\u30ef\u30fc\u30c9\u306e\u5909\u66f4\u3092\u304a\u52e7\u3081\u3057\u307e\u3059\u3002</p></div>'
        });
      }
    } catch (_) {
      // email failure does not fail account creation
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: '\u30b5\u30fc\u30d0\u30fc\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f' }, { status: 500 });
  }
}
