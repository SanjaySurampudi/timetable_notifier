// Service Worker for Timetable Notifier Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[Service Worker] Push event received with no data.');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push received:', data);

    const title = data.title || 'Class Notification';
    const options = {
      body: data.body || 'You have an upcoming class!',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico', // smaller icon for notification drawer
      vibrate: [200, 100, 200],
      tag: 'class-reminder', // groups notifications
      renotify: true, // vibrates for new notifications even if tag matches
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error parsing push notification data:', error);
    
    // Fallback notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Class Reminder', {
        body: 'You have a class starting soon!',
        icon: '/favicon.ico',
        tag: 'class-reminder'
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (windowClients) {
      // Check if there is already a window open with this app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
