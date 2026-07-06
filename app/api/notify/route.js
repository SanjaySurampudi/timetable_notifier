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

    // 3. Filter classes starting in the next 10 minutes
    const upcomingClasses = classes.filter((c) => {
      if (!c.start_time) return false;
      const [classHr, classMin] = c.start_time.split(':').map(Number);
      const classMinutes = classHr * 60 + classMin;

      // Time difference in minutes
      const diffMinutes = classMinutes - nowMinutes;

      // Notify if starting in [1, 10] minutes (to avoid sending after class has started)
      return diffMinutes > 0 && diffMinutes <= 10;
    });

    if (upcomingClasses.length === 0) {
      return NextResponse.json({ 
        message: 'No classes starting in the next 10 minutes', 
        time: timeString, 
        day: dayOfWeek,
        totalToday: classes.length 
      }, { status: 200 });
    }

    console.log(`[Cron Notify] Found ${upcomingClasses.length} upcoming classes starting soon.`);
    const notificationSummary = [];

    // 4. Send notifications for each upcoming class
    for (const classItem of upcomingClasses) {
      const classroomName = classItem.classrooms?.name || 'Classroom';
      
      // Fetch subscriptions for this classroom
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('classroom_id', classItem.classroom_id);

      if (subsError) {
        console.error(`Error fetching subscriptions for class ${classroomName}:`, subsError);
        continue;
      }

      if (!subscriptions || subscriptions.length === 0) {
        notificationSummary.push({
          subject: classItem.subject,
          classroom: classroomName,
          sentCount: 0,
          reason: 'No subscribers'
        });
        continue;
      }

      // Prepare Web Push payload
      const payload = JSON.stringify({
        title: `Class Starting Soon: ${classItem.subject}`,
        body: `Your class starts at ${classItem.start_time.substring(0, 5)} in ${classItem.room || 'TBD'} with ${classItem.teacher || 'TBD'}.`,
        classroomName: classroomName,
        subject: classItem.subject,
        start_time: classItem.start_time,
        room: classItem.room,
        teacher: classItem.teacher,
        url: '/'
      });

      let sentCount = 0;
      let failedCount = 0;

      // Dispatch push messages asynchronously
      const pushPromises = subscriptions.map((sub) => {
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

      await Promise.all(pushPromises);

      notificationSummary.push({
        subject: classItem.subject,
        classroom: classroomName,
        sentCount,
        failedCount
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
