import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * API endpoint to refresh Open Graph metadata
 * Call this after updating the home banner in admin panel
 * 
 * Usage: POST /api/revalidate-og
 */
export async function POST() {
  try {
    // Revalidate the homepage to refresh OG image
    revalidatePath('/', 'page');
    
    return NextResponse.json({
      success: true,
      message: 'Open Graph metadata refreshed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revalidating OG metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh metadata',
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for easy testing
export async function GET() {
  return POST();
}
