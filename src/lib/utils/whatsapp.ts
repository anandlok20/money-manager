const WA_API_VERSION = 'v25.0';

function getCredentials() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set');
  }
  return { phoneId, token };
}

async function waPost(phoneId: string, token: string, payload: object): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${WA_API_VERSION}/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
}

/** Send a free-form text message (works within 24h session window or to test numbers) */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
  const { phoneId, token } = getCredentials();
  await waPost(phoneId, token, {
    messaging_product: 'whatsapp',
    to: toPhone, // E.164 without '+', e.g. "919876543210"
    type: 'text',
    text: { body },
  });
}

/** Send the hello_world template (always works even without 24h session) */
export async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  languageCode: string = 'en_US'
): Promise<void> {
  const { phoneId, token } = getCredentials();
  await waPost(phoneId, token, {
    messaging_product: 'whatsapp',
    to: toPhone,
    type: 'template',
    template: { name: templateName, language: { code: languageCode } },
  });
}

/** Convert a stored HH:MM string to total minutes since midnight */
export function hhmToMinutes(hhm: string): number {
  const [h, m] = hhm.split(':').map(Number);
  return h * 60 + m;
}

/** Get the current HH:MM in a given IANA timezone */
export function currentTimeInZone(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** Today's date string (YYYY-MM-DD) in a given IANA timezone */
export function todayInZone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
