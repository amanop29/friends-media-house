import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendContactEmail, sendWelcomeEmail } from '@/lib/email';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().optional().default(''),
  eventInterest: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = contactSchema.parse(body);

    // Save lead to database
    const { data: lead, error: dbError } = await supabaseAdmin
      .from('leads')
      .insert({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        message: validatedData.message || 'No message provided',
        // Preserve the user's selected event type casing
        event_type: validatedData.eventInterest || 'other',
        source: 'contact_form',
        status: 'new',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      console.error('Event type sent:', validatedData.eventInterest);
      return NextResponse.json(
        { error: `Failed to save contact information: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Send email to admin
    const emailResult = await sendContactEmail(validatedData);
    
    // Send welcome email to user (non-blocking)
    sendWelcomeEmail(validatedData.email, validatedData.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      // Still return success since the lead was saved
      return NextResponse.json({
        success: true,
        message: 'Your message has been received. We will contact you soon!',
        leadId: lead.id,
        emailSent: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      leadId: lead.id,
      emailSent: true,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('Validation errors:', errorMessages);
      return NextResponse.json(
        { error: `Validation error: ${errorMessages}` },
        { status: 400 }
      );
    }

    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
