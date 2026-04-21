// ── Non-extractable AES-GCM key stored in IndexedDB ─────────────────────────
// Protects password fields against offline storage dumps. Does NOT protect
// against scripts running in this origin — they can call decrypt the same way.

const CRYPTO_DB_NAME = 'billpay-crypto';
const CRYPTO_STORE   = 'keys';
const CRYPTO_KEY_ID  = 'payee-aes-256';

let _payeeKeyPromise = null;

function openCryptoDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CRYPTO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(CRYPTO_STORE)) {
        req.result.createObjectStore(CRYPTO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readonly');
    const req = tx.objectStore(CRYPTO_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function idbPut(db, id, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CRYPTO_STORE, 'readwrite');
    tx.objectStore(CRYPTO_STORE).put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

function getPayeeCryptoKey() {
  if (_payeeKeyPromise) return _payeeKeyPromise;
  _payeeKeyPromise = (async () => {
    if (!window.crypto || !crypto.subtle || !window.indexedDB) {
      throw new Error('Browser does not support WebCrypto + IndexedDB');
    }
    const db = await openCryptoDb();
    try {
      const existing = await idbGet(db, CRYPTO_KEY_ID);
      if (existing) return existing;
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,                     // non-extractable
        ['encrypt', 'decrypt']
      );
      await idbPut(db, CRYPTO_KEY_ID, key);
      return key;
    } finally {
      db.close();
    }
  })();
  return _payeeKeyPromise;
}

function _b64Encode(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function _b64Decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptSecret(plaintext) {
  if (!plaintext) return null;
  const key = await getPayeeCryptoKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  );
  return { v: 1, iv: _b64Encode(iv), ct: _b64Encode(ct) };
}

async function decryptSecret(enc) {
  if (!enc || !enc.iv || !enc.ct) return '';
  const key = await getPayeeCryptoKey();
  const pt  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: _b64Decode(enc.iv) },
    key,
    _b64Decode(enc.ct)
  );
  return new TextDecoder().decode(pt);
}

// Warm the key on startup so the first edit is instant and we fail early
// if the environment does not support the required APIs.
window.addEventListener('DOMContentLoaded', () => {
  getPayeeCryptoKey().catch(err => {
    console.warn('Payee password encryption unavailable:', err);
  });
});
