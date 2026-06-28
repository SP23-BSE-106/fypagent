import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { cookie: cookieHeader } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    
    const body = await request.json();
    const { provider, key } = body;
    console.log('Saving:', user.id, provider);
    
    // Insert with onConflict
    const { error } = await supabase.from('api_keys').upsert({
      user_id: user.id,
      provider,
      encrypted_key: key
    }, { onConflict: 'user_id,provider' });
    
    if (error) console.log('DB error:', error);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.log('Error:', e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
