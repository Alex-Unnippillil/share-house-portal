export interface AccountProfile {
  fullName: string | null
  username: string | null
  website: string | null
  avatarUrl: string | null
  email: string | null
  phone: string | null
}

export interface AccountNotificationPreferences {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  smsPhoneNumber: string | null
  pushSubscription:
    | {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
    | null
}
