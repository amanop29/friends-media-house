import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * API endpoint to refresh Open Graph metadata and homepage settings
 * Call this after updating the home banner or settings in admin panel
 * 
 * Usage: POST /api/revalidate-og
 */
export async function POST() {
  try {
    // Revalidate the homepage to refresh OG image and settings immediately
    revalidatePath('/(main)', 'page');
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
