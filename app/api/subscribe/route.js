import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// POST /api/subscribe - Subscribe or unsubscribe to push notifications
export async function POST(request) {
  try {
    const body = await request.json();
    const { classroom_id, subscription, action } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid push subscription is required' }, { status: 400 });
    }

    const endpoint = subscription.endpoint;
    const supabaseAdmin = getSupabaseAdmin();

    if (action === 'unsubscribe') {
      // Delete the subscription matching the endpoint
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .filter('subscription->>endpoint', 'eq', endpoint);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' }, { status: 200 });
    } else {
      // Subscribe action
      if (!classroom_id) {
        return NextResponse.json({ error: 'Classroom ID is required to subscribe' }, { status: 400 });
      }

      // Check if subscription endpoint already exists
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .filter('subscription->>endpoint', 'eq', endpoint);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        // Update classroom_id if already subscribed
        const { error: updateError } = await supabaseAdmin
          .from('push_subscriptions')
          .update({ classroom_id, subscription })
          .eq('id', existing[0].id);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: 'Subscription updated', id: existing[0].id }, { status: 200 });
      } else {
        // Insert new subscription
        const { data, error: insertError } = await supabaseAdmin
          .from('push_subscriptions')
          .insert([{ classroom_id, subscription }])
          .select();

        if (insertError) throw insertError;
        return NextResponse.json({ success: true, message: 'Subscribed successfully', id: data[0].id }, { status: 201 });
      }
    }
  } catch (error) {
    console.error('Error handling subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
