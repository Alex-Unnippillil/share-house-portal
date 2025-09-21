import type { NotificationServiceConfig } from './types';
import type { SendGridConfig } from './channels/email';
import type { TwilioConfig } from './channels/sms';
import type { PushProviderConfig } from './channels/push';

const cleanPrivateKey = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  return value.replace(/\\n/g, '\n');
};

export const notificationProviderConfig = {
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.NOTIFICATIONS_EMAIL_FROM ?? 'no-reply@example.com',
    fromName: process.env.NOTIFICATIONS_EMAIL_NAME,
    replyTo: process.env.NOTIFICATIONS_EMAIL_REPLY_TO,
  } satisfies SendGridConfig,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    voiceFromNumber: process.env.TWILIO_VOICE_FROM_NUMBER ?? process.env.TWILIO_FROM_NUMBER,
    statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL,
  } satisfies TwilioConfig,
  push: {
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY,
      defaultTitle: process.env.FCM_DEFAULT_TITLE,
    },
    apns: {
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
      privateKey: cleanPrivateKey(process.env.APNS_PRIVATE_KEY),
      bundleId: process.env.APNS_BUNDLE_ID,
      topic: process.env.APNS_TOPIC,
    },
  } satisfies PushProviderConfig,
};

export const notificationServiceConfig: NotificationServiceConfig = {
  dryRun: process.env.NOTIFICATIONS_DRY_RUN === 'true',
};
