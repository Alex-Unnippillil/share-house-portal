import { delayedValue } from '@/lib/utils/delay'

interface RentSummary {
  amount: string
  dueOn: string
  autopayEnabled: boolean
}

interface DashboardDocumentPreview {
  id: string
  title: string
  fileName: string
}

interface RoommateMessage {
  id: string
  author: string
  body: string
  timestamp: string
}

export async function getNextRentSummary(): Promise<RentSummary> {
  return delayedValue(
    {
      amount: '$1,260.00',
      dueOn: 'Due on the 1st',
      autopayEnabled: true,
    },
    40,
  )
}

export async function getRecentDocumentsPreview(): Promise<DashboardDocumentPreview[]> {
  return delayedValue(
    [
      {
        id: 'lease-v2',
        title: 'Lease agreement v2.pdf',
        fileName: 'lease-agreement-v2.pdf',
      },
      {
        id: 'house-rules',
        title: 'House rules.pdf',
        fileName: 'house-rules.pdf',
      },
    ],
    180,
  )
}

export async function getRoommateBoardHighlights(): Promise<RoommateMessage[]> {
  return delayedValue(
    [
      {
        id: 'wifi-update',
        author: 'Jordan',
        body: 'Wi-Fi is down, rebooted router.',
        timestamp: '5 minutes ago',
      },
      {
        id: 'parking-swap',
        author: 'Avery',
        body: 'Parking spot swap this weekend?',
        timestamp: '12 minutes ago',
      },
    ],
    90,
  )
}
