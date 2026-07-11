import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Helper to reconstruct UUID from a string without hyphens
function addHyphensToUUID(uuidStr) {
  if (uuidStr.length !== 32) return null;
  return `${uuidStr.substring(0, 8)}-${uuidStr.substring(8, 12)}-${uuidStr.substring(12, 16)}-${uuidStr.substring(16, 20)}-${uuidStr.substring(20)}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check if this is a message
    // AFTER
    if (body.message && body.message.text) {
      const { chat, from } = body.message;
      // In group chats Telegram appends the bot's username to commands
      // (e.g. "/start@YourBot payload" instead of "/start payload").
      // Strip that suffix so commands work in both private chats and groups.
      const text = body.message.text.replace(/^(\/\w+)@\S+/, '$1');

      // Look for the /start command with payload
      if (text.startsWith('/start ')) {
        const payload = text.split(' ')[1];

        if (payload) {
          const classroomId = addHyphensToUUID(payload);

          if (classroomId) {
            const supabaseAdmin = getSupabaseAdmin();

            // Check if classroom exists
            const { data: classroom, error: classroomError } = await supabaseAdmin
              .from('classrooms')
              .select('name')
              .eq('id', classroomId)
              .single();

            if (!classroomError && classroom) {
              const username = from.username || from.first_name || 'User';

              // Upsert the subscription
              const { error: upsertError } = await supabaseAdmin
                .from('telegram_subscriptions')
                .upsert({
                  classroom_id: classroomId,
                  chat_id: chat.id,
                  telegram_username: username
                }, { onConflict: 'classroom_id,chat_id' });

              if (!upsertError) {
                await sendTelegramMessage(chat.id, `✅ Successfully subscribed to notifications for *${classroom.name}*!\n\nYou will receive a message here 10 minutes before every class.`);
              } else {
                console.error('Error inserting telegram subscription:', upsertError);
                await sendTelegramMessage(chat.id, `❌ Error subscribing to notifications. Please try again.`);
              }
            } else {
              await sendTelegramMessage(chat.id, `❌ Classroom not found or invalid link.`);
            }
          } else {
            await sendTelegramMessage(chat.id, `❌ Invalid subscription link.`);
          }
        }
      } else if (text === '/start') {
        await sendTelegramMessage(chat.id, `Welcome to the Timetable Notifier Bot!\n\nPlease use the "Subscribe via Telegram" button on the website to link this bot to a classroom.`);
      } else if (text === '/stop') {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin.from('telegram_subscriptions').delete().eq('chat_id', chat.id);
        await sendTelegramMessage(chat.id, `You have been unsubscribed from all notifications.`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    // Always return 200 to Telegram so it doesn't retry
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}
