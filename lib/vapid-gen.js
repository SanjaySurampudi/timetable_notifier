const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('==================================================');
console.log('GENERATE VAPID KEYS FOR PUSH NOTIFICATIONS');
console.log('==================================================\n');
console.log('Add the following to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"\n`);
console.log('==================================================');
