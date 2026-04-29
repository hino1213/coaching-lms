import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Supabaseスリープ防止用ヘルスチェックエンドポイント
// Vercel Cronから5分おきに呼び出される
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db_connected: true,
      profiles_count: count,
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
