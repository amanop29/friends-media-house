import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      // Fallback to localStorage-based auth for development
      console.warn('Supabase not configured, using fallback auth');
      
      // This will be handled by the client-side AuthContext
      return NextResponse.json(
        { success: false, error: 'Database not configured. Using local authentication.' },
        { status: 503 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Query admin user by email
    const { data: admin, error: queryError } = await supabase
      .from('admins')
      .select('id, email, name, role, password_hash, is_active, login_count')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (queryError || !admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is disabled. Contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password using Supabase's crypt function
    const { data: passwordMatch, error: verifyError } = await supabase
      .rpc('verify_admin_password', {
        admin_email: email.toLowerCase().trim(),
        password_attempt: password
      });

    if (verifyError || !passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await supabase
      .from('admins')
      .update({
        last_login: new Date().toISOString(),
        login_count: admin.login_count ? admin.login_count + 1 : 1
      })
      .eq('id', admin.id);

    // Return success with admin info (excluding password hash)
    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
