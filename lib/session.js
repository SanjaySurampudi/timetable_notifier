// lib/session.js
// Secure session handling using the native Web Crypto API (fully compatible with Node.js and Next.js Edge runtimes)

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-jwt-secret-key-fallback-32-chars-long';

// Helper to base64 encode/decode in a web-compatible way
function base64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
}

// Generate a signed token
export async function signSession(payload) {
  try {
    const dataStr = JSON.stringify({
      ...payload,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days expiration
    });
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const encodedPayload = base64UrlEncode(dataStr);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    return `${encodedPayload}.${signatureHex}`;
  } catch (err) {
    console.error('Error signing session:', err);
    return null;
  }
}

// Verify signature and return payload
export async function verifySession(token) {
  try {
    if (!token) return null;
    
    const [encodedPayload, signatureHex] = token.split('.');
    if (!encodedPayload || !signatureHex) return null;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Reconstruct signature bytes from hex
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(encodedPayload)
    );
    
    if (!isValid) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      console.warn('Session token expired');
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('Error verifying session:', err);
    return null;
  }
}

// Get session helper for route handlers
export async function getSession(request) {
  try {
    // 1. Check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return await verifySession(token);
    }
    
    // 2. Check cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const parts = cookie.split('=');
        return [parts[0].trim(), parts.slice(1).join('=').trim()];
      })
    );
    
    const token = cookies['session_token'];
    if (token) {
      return await verifySession(token);
    }
    
    return null;
  } catch (err) {
    console.error('Error getting session:', err);
    return null;
  }
}
