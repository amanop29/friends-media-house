import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check all required tables
    const tables = [
      'admins', 'categories', 'events', 'photos', 'videos', 
      'reviews', 'leads', 'comments', 'faqs', 'settings'
    ];

    const tableStatus: any = {};
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      tableStatus[table] = {
        exists: !error,
        error: error?.message,
        hasData: data && data.length > 0
      };
    }

    // Check if default admin exists
    const { data: adminData } = await supabase
      .from('admins')
      .select('email, name, role')
      .eq('email', 'admin@friendsmediahouse.com');

    // Check if password verification function exists
    let funcData;
    try {
      await supabase.rpc('verify_admin_password', {
        admin_email: 'test@test.com',
        password_attempt: 'test'
      });
      funcData = { exists: true };
    } catch (err: any) {
      funcData = { exists: err.message?.includes('function') ? false : true };
    }

    return NextResponse.json({
      success: true,
      supabaseUrl,
      tables: tableStatus,
      defaultAdmin: {
        exists: adminData && adminData.length > 0,
        email: adminData?.[0]?.email,
        role: adminData?.[0]?.role
      },
      functions: {
        verify_admin_password: funcData
      },
      summary: {
        allTablesExist: Object.values(tableStatus).every((t: any) => t.exists),
        adminExists: adminData && adminData.length > 0,
        readyToUse: Object.values(tableStatus).every((t: any) => t.exists) && adminData && adminData.length > 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
