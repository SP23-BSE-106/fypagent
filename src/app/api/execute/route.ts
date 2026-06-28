import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const cookieList = cookies();
    const cook = cookieList.getAll().map(c => c.name + '=' + c.value).join(';');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { cookie: cook } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { workflowId, input } = body;
    
    return NextResponse.json({ success: true, message: 'Workflow executed' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
