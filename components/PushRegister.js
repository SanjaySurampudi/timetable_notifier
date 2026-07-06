'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushRegister({ classroomId, classroomName }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [classroomId]);

  const checkSubscription = async () => {
    try {
      // IMPORTANT: navigator.serviceWorker.ready never resolves (and never
      // rejects) if no service worker has been registered yet for this
      // origin/browser. Register it here first (idempotent - registering an
      // already-registered SW just returns the existing registration) so
      // `.ready` always has something to resolve against.
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!supported || !classroomId) return;
    setLoading(true);

    try {
      // 1. Request permission
      const reqPermission = await Notification.requestPermission();
      setPermission(reqPermission);

      if (reqPermission !== 'granted') {
        alert('Notification permission denied. Please enable notifications in your browser settings.');
        setLoading(false);
        return;
      }

      // 2. Register Service Worker and wait until ready
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Subscribe to Push Manager
      if (!vapidPublicKey) {
        throw new Error('VAPID public key is missing in environment variables.');
      }
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      // 4. Send subscription data to database
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          subscription: sub,
          action: 'subscribe',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setSubscribed(true);
    } catch (err) {
      console.error('Subscription error:', err);
      alert(`Could not enable notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!supported) return;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        // Send unsubscribe trigger to server to clean up DB
        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub,
            action: 'unsubscribe',
          }),
        });

        // Unsubscribe in browser
        await sub.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscription error:', err);
      alert(`Could not disable notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="push-info text-muted">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="push-container glass-card">
      <div className="push-header">
        <div className="push-title-block">
          <div className={`push-icon-badge ${subscribed ? 'pulse-notify active' : ''}`}>
            {subscribed ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div>
            <h3>Notifications</h3>
            <p className="text-secondary">
              {subscribed 
                ? `Active for ${classroomName}` 
                : `Get alerts before classes start in ${classroomName}`
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={subscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading || !classroomId}
          className={`btn ${subscribed ? 'btn-secondary' : 'btn-primary'} ${!classroomId ? 'btn-disabled' : ''}`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : subscribed ? (
            <>
              <BellOff size={16} />
              Disable
            </>
          ) : (
            <>
              <Bell size={16} />
              Enable Alerts
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .push-container {
          margin-bottom: 30px;
          padding: 20px;
        }

        .push-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .push-title-block {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .push-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          transition: all var(--transition-normal);
        }

        .push-icon-badge.active {
          background: var(--accent-secondary-glow);
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .push-info {
          font-size: 0.85rem;
          text-align: center;
          padding: 10px;
        }

        h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        p {
          font-size: 0.85rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}