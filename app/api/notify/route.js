import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import webpush from 'web-push';

// Configure Web Push with VAPID credentials
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@timetable-notifier.local',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys are missing. Web Push notifications will fail.');
}

// Handler that supports GET and POST (for Cron triggers and manual test invokes)
export async function GET(request) {
  return handleNotify(request);
}

export async function POST(request) {
  return handleNotify(request);
}

async function handleNotify(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('Authorization')?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    // Secure the cron endpoint if CRON_SECRET is configured in environment variables
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    const timezone = searchParams.get('tz') || 'Asia/Kolkata';

    // 1. Get current day and time in local timezone
    const now = new Date();
    
    // Get full English weekday name, e.g., "Monday"
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { 
      weekday: 'long', 
      timeZone: timezone 
    }).format(now);

    // Get 24-hour time format, e.g., "09:30"
    const timeString = new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false, 
      timeZone: timezone 
    }).format(now);

    const [nowHr, nowMin] = timeString.split(':').map(Number);
    const nowMinutes = nowHr * 60 + nowMin;

    console.log(`[Cron Notify] Triggered at ${timeString} on ${dayOfWeek} (${timezone})`);

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Fetch all classes for today, joining classroom info
    const { data: classes, error: fetchError } = await supabaseAdmin
      .from('timetable')
      .select('*, classrooms(name)')
      .eq('day_of_week', dayOfWeek);

    if (fetchError) throw fetchError;
    if (!classes || classes.length === 0) {
      return NextResponse.json({ message: 'No classes scheduled for today', time: timeString, day: dayOfWeek }, { status: 200 });
    }

    // 3. Filter classes starting or ending in the next 10 minutes
    const upcomingEvents = [];

    for (const c of classes) {
      if (c.start_time) {
        const [startHr, startMin] = c.start_time.split(':').map(Number);
        const startMinutes = startHr * 60 + startMin;
        const startDiff = startMinutes - nowMinutes;
        
        if (startDiff > 0 && startDiff <= 10) {
          upcomingEvents.push({ ...c, eventType: 'start' });
        }
      }
      
      if (c.end_time) {
        const [endHr, endMin] = c.end_time.split(':').map(Number);
        const endMinutes = endHr * 60 + endMin;
        const endDiff = endMinutes - nowMinutes;
        
        if (endDiff > 0 && endDiff <= 10) {
          upcomingEvents.push({ ...c, eventType: 'end' });
        }
      }
    }

    if (upcomingEvents.length === 0) {
      return NextResponse.json({ 
        message: 'No classes starting or ending in the next 10 minutes', 
        time: timeString, 
        day: dayOfWeek,
        totalToday: classes.length 
      }, { status: 200 });
    }

    console.log(`[Cron Notify] Found ${upcomingEvents.length} upcoming events (start/end).`);
    const notificationSummary = [];

    // 4. Send notifications for each upcoming event
    for (const classItem of upcomingEvents) {
      const classroomName = classItem.classrooms?.name || 'Classroom';
      
      // Fetch subscriptions for this classroom
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('classroom_id', classItem.classroom_id);

      // Fetch telegram subscriptions for this classroom
      const { data: tgSubscriptions, error: tgError } = await supabaseAdmin
        .from('telegram_subscriptions')
        .select('*')
        .eq('classroom_id', classItem.classroom_id);

      if (subsError) {
        console.error(`Error fetching push subscriptions for class ${classroomName}:`, subsError);
      }
      if (tgError) {
        console.error(`Error fetching telegram subscriptions for class ${classroomName}:`, tgError);
      }

      if ((!subscriptions || subscriptions.length === 0) && (!tgSubscriptions || tgSubscriptions.length === 0)) {
        notificationSummary.push({
          subject: classItem.subject,
          classroom: classroomName,
          sentCount: 0,
          reason: 'No subscribers'
        });
        continue;
      }

      // Prepare Web Push payload
      const title = classItem.eventType === 'start' 
        ? `Class Starting Soon: ${classItem.subject}`
        : `Class Ending Soon: ${classItem.subject}`;
      
      const body = classItem.eventType === 'start'
        ? `Your class starts at ${classItem.start_time.substring(0, 5)} in ${classItem.room || 'TBD'} with ${classItem.teacher || 'TBD'}.`
        : `Your class ends at ${classItem.end_time.substring(0, 5)} in ${classItem.room || 'TBD'} with ${classItem.teacher || 'TBD'}.`;

      const payload = JSON.stringify({
        title,
        body,
        classroomName: classroomName,
        subject: classItem.subject,
        start_time: classItem.start_time,
        end_time: classItem.end_time,
        eventType: classItem.eventType,
        room: classItem.room,
        teacher: classItem.teacher,
        url: '/'
      });

      let sentCount = 0;
      let failedCount = 0;

      // Dispatch push messages asynchronously
      const pushPromises = (subscriptions || []).map((sub) => {
        return webpush
          .sendNotification(sub.subscription, payload)
          .then(() => {
            sentCount++;
          })
          .catch(async (err) => {
            failedCount++;
            // Clean up subscription from DB if expired or unsubscribed on browser side
            if (err.statusCode === 404 || err.statusCode === 410) {
              console.log(`[Cron Notify] Deleting expired subscription ID: ${sub.id}`);
              await supabaseAdmin
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
            } else {
              console.error(`[Cron Notify] Failed to send to subscription ID ${sub.id}:`, err);
            }
          });
      });

      // Dispatch Telegram messages asynchronously
      let tgSentCount = 0;
      let tgFailedCount = 0;
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      
      const tgPromises = tgToken ? (tgSubscriptions || []).map(async (sub) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: sub.chat_id,
              text: `🔔 *${title}*\n\n${body}`,
              parse_mode: 'Markdown'
            })
          });
          
          if (res.ok) {
            tgSentCount++;
          } else {
            const result = await res.json();
            tgFailedCount++;
            if (result.error_code === 403) {
              // Bot was blocked by the user, remove subscription
              console.log(`[Cron Notify] Deleting blocked Telegram subscription ID: ${sub.id}`);
              await supabaseAdmin.from('telegram_subscriptions').delete().eq('id', sub.id);
            } else {
              console.error(`[Cron Notify] Telegram API error for chat ${sub.chat_id}:`, result);
            }
          }
        } catch (err) {
          tgFailedCount++;
          console.error(`[Cron Notify] Failed to send to Telegram chat ${sub.chat_id}:`, err);
        }
      }) : [];

      await Promise.all([...pushPromises, ...tgPromises]);

      notificationSummary.push({
        subject: classItem.subject,
        classroom: classroomName,
        sentCount: sentCount + tgSentCount,
        failedCount: failedCount + tgFailedCount,
        details: { webPush: { sent: sentCount, failed: failedCount }, telegram: { sent: tgSentCount, failed: tgFailedCount } }
      });
    }

    return NextResponse.json({
      success: true,
      time: timeString,
      day: dayOfWeek,
      notifications: notificationSummary
    }, { status: 200 });

  } catch (error) {
    console.error('[Cron Notify Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
