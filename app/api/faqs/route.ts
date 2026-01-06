import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/faqs - Get all active FAQs
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FAQs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch FAQs' },
        { status: 500 }
      );
    }

    // Map to frontend format
    const faqs = data?.map((faq: { id: string; question: string; answer: string; category?: string; display_order?: number }) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general',
      order: faq.display_order || 0,
    })) || [];

    return NextResponse.json(faqs);
  } catch (error) {
    console.error('FAQs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/faqs - Add a new FAQ
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, question, answer, category, order } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('faqs')
      .insert({
        question,
        answer,
        category: category || 'general',
        display_order: order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding FAQ:', error);
      return NextResponse.json(
        { error: 'Failed to add FAQ' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      question: data.question,
      answer: data.answer,
      category: data.category,
      order: data.display_order,
    });
  } catch (error) {
    console.error('FAQs POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/faqs - Delete a FAQ
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'FAQ ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('faqs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting FAQ:', error);
      return NextResponse.json(
        { error: 'Failed to delete FAQ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FAQs DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
