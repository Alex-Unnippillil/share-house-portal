export interface DashboardMetric {
  id: string
  label: string
  value: number
  change: number
  trend: 'up' | 'down'
}

export interface UpcomingEvent {
  id: string
  title: string
  date: string
  location: string
  description: string
}

export interface MaintenanceRequest {
  id: string
  title: string
  unit: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'resolved'
  createdAt: string
  updatedAt?: string
  details: string
}

export interface ResidentDashboardSummary {
  metrics: DashboardMetric[]
  maintenance: {
    open: number
    inProgress: number
    resolvedThisMonth: number
  }
  upcomingEvents: UpcomingEvent[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  category: 'events' | 'maintenance' | 'community'
  author: string
  publishedAt: string
}

export interface PackageDelivery {
  id: string
  carrier: string
  trackingNumber: string
  status: 'awaiting_pickup' | 'picked_up'
  receivedAt: string
  location: string
  notes?: string
}

export interface ResidentDocument {
  id: string
  title: string
  category: string
  updatedAt: string
  summary: string
  url: string
}

export interface ResidentProfile {
  id: string
  name: string
  unit: string
  email: string
  phone: string
  emergencyContact: {
    name: string
    phone: string
  }
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    maintenanceUpdates: boolean
    newsletterOptIn: boolean
  }
}

type NetworkResponse<T> = Promise<T>

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

let networkDelay = 40

const simulateNetwork = async <T>(data: T): NetworkResponse<T> =>
  new Promise(resolve => {
    setTimeout(() => resolve(clone(data)), networkDelay)
  })

const initialDashboardSummary: ResidentDashboardSummary = {
  metrics: [
    {
      id: 'balance',
      label: 'Community balance',
      value: 1284,
      change: 6.4,
      trend: 'up',
    },
    {
      id: 'requests',
      label: 'Open maintenance tickets',
      value: 3,
      change: -1.5,
      trend: 'down',
    },
    {
      id: 'events',
      label: 'Events this month',
      value: 5,
      change: 2.1,
      trend: 'up',
    },
    {
      id: 'packages',
      label: 'Packages awaiting pickup',
      value: 4,
      change: 1.8,
      trend: 'up',
    },
  ],
  maintenance: {
    open: 3,
    inProgress: 2,
    resolvedThisMonth: 12,
  },
  upcomingEvents: [
    {
      id: 'event-1',
      title: 'Community Brunch',
      date: new Date().toISOString(),
      location: 'Skyline Lounge',
      description: 'Meet your neighbors over coffee and pastries.',
    },
    {
      id: 'event-2',
      title: 'Building Fire Drill',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      location: 'Main Lobby',
      description: 'Annual safety drill for all residents.',
    },
  ],
}

const initialMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: 'maint-1',
    title: 'Leaking faucet',
    unit: '12B',
    priority: 'medium',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    details: 'Kitchen sink faucet is leaking steadily and requires replacement.',
  },
  {
    id: 'maint-2',
    title: 'AC not cooling',
    unit: '18A',
    priority: 'high',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    details: 'Air conditioning unit is blowing warm air despite thermostat adjustments.',
  },
  {
    id: 'maint-3',
    title: 'Garage door remote issue',
    unit: 'P2-45',
    priority: 'low',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    details: 'Garage remote intermittently fails to open the gate.',
  },
]

const initialAnnouncements: Announcement[] = [
  {
    id: 'announce-1',
    title: 'New recycling guidelines',
    body: 'We have updated our recycling program to include glass. Please rinse containers before disposal.',
    category: 'community',
    author: 'Building Management',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'announce-2',
    title: 'Water shut-off notice',
    body: 'Planned water maintenance on Thursday from 10 AM to noon. Please plan accordingly.',
    category: 'maintenance',
    author: 'Facilities Team',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'announce-3',
    title: 'Yoga on the rooftop',
    body: 'Join us for sunrise yoga every Saturday at 7 AM. Mats are provided.',
    category: 'events',
    author: 'Resident Council',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
]

const initialPackages: PackageDelivery[] = [
  {
    id: 'pkg-1',
    carrier: 'UPS',
    trackingNumber: '1Z999999',
    status: 'awaiting_pickup',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    location: 'Package Room Locker 4',
  },
  {
    id: 'pkg-2',
    carrier: 'USPS',
    trackingNumber: '9400111899',
    status: 'picked_up',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    location: 'Package Room Locker 2',
    notes: 'Picked up by resident with ID verification.',
  },
  {
    id: 'pkg-3',
    carrier: 'FedEx',
    trackingNumber: '771234567',
    status: 'awaiting_pickup',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    location: 'Front Desk Shelf B',
  },
]

const initialDocuments: ResidentDocument[] = [
  {
    id: 'doc-1',
    title: 'Lease agreement',
    category: 'Contracts',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    summary: 'Signed lease agreement for unit 18A including parking assignment.',
    url: '/documents/lease-agreement.pdf',
  },
  {
    id: 'doc-2',
    title: 'Community handbook',
    category: 'Guides',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    summary: 'Policies, amenities, and emergency procedures for residents.',
    url: '/documents/community-handbook.pdf',
  },
  {
    id: 'doc-3',
    title: 'Gym waiver form',
    category: 'Amenities',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    summary: 'Updated waiver required for access to the 24-hour fitness center.',
    url: '/documents/gym-waiver.pdf',
  },
]

const initialProfile: ResidentProfile = {
  id: 'resident-1',
  name: 'Jordan Chen',
  unit: '18A',
  email: 'jordan.chen@example.com',
  phone: '+1 (555) 010-3322',
  emergencyContact: {
    name: 'Avery Chen',
    phone: '+1 (555) 010-9966',
  },
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    maintenanceUpdates: true,
    newsletterOptIn: true,
  },
}

let dashboardSummary = clone(initialDashboardSummary)
let maintenanceRequests = clone(initialMaintenanceRequests)
let announcements = clone(initialAnnouncements)
let packages = clone(initialPackages)
let documents = clone(initialDocuments)
let profile = clone(initialProfile)

export const getResidentDashboard = async (): Promise<ResidentDashboardSummary> =>
  simulateNetwork(dashboardSummary)

export const getMaintenanceRequests = async (): Promise<MaintenanceRequest[]> =>
  simulateNetwork(maintenanceRequests)

export const updateMaintenanceRequestStatus = async (
  id: string,
  status: MaintenanceRequest['status']
): Promise<MaintenanceRequest> => {
  const index = maintenanceRequests.findIndex(request => request.id === id)
  if (index === -1) {
    throw new Error('Maintenance request not found')
  }

  const previousStatus = maintenanceRequests[index].status
  const updatedRequest: MaintenanceRequest = {
    ...maintenanceRequests[index],
    status,
    updatedAt: new Date().toISOString(),
  }

  maintenanceRequests = maintenanceRequests.map(request =>
    request.id === id ? updatedRequest : request
  )

  dashboardSummary = {
    ...dashboardSummary,
    maintenance: {
      ...dashboardSummary.maintenance,
      open: maintenanceRequests.filter(request => request.status === 'pending').length,
      inProgress: maintenanceRequests.filter(request => request.status === 'in_progress').length,
      resolvedThisMonth:
        dashboardSummary.maintenance.resolvedThisMonth +
        (previousStatus !== 'resolved' && status === 'resolved' ? 1 : 0),
    },
    metrics: dashboardSummary.metrics.map(metric => {
      if (metric.id === 'requests') {
        return {
          ...metric,
          value: maintenanceRequests.filter(request => request.status !== 'resolved').length,
        }
      }
      return metric
    }),
  }

  return simulateNetwork(updatedRequest)
}

export const getAnnouncements = async (): Promise<Announcement[]> =>
  simulateNetwork(
    [...announcements].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  )

export const getPackages = async (): Promise<PackageDelivery[]> =>
  simulateNetwork(packages)

export const acknowledgePackagePickup = async (
  id: string
): Promise<PackageDelivery> => {
  const index = packages.findIndex(item => item.id === id)
  if (index === -1) {
    throw new Error('Package not found')
  }

  const updatedPackage: PackageDelivery = {
    ...packages[index],
    status: 'picked_up',
    notes: 'Marked as picked up through resident portal.',
  }

  packages = packages.map(item => (item.id === id ? updatedPackage : item))

  dashboardSummary = {
    ...dashboardSummary,
    metrics: dashboardSummary.metrics.map(metric =>
      metric.id === 'packages'
        ? { ...metric, value: packages.filter(pkg => pkg.status === 'awaiting_pickup').length }
        : metric
    ),
  }

  return simulateNetwork(updatedPackage)
}

export const getResidentDocuments = async (): Promise<ResidentDocument[]> =>
  simulateNetwork(documents)

export const getResidentProfile = async (): Promise<ResidentProfile> =>
  simulateNetwork(profile)

export const updateResidentPreferences = async (
  updates: Partial<ResidentProfile['preferences']>
): Promise<ResidentProfile> => {
  profile = {
    ...profile,
    preferences: {
      ...profile.preferences,
      ...updates,
    },
  }

  return simulateNetwork(profile)
}

export const __resetResidentApiState = (): void => {
  dashboardSummary = clone(initialDashboardSummary)
  maintenanceRequests = clone(initialMaintenanceRequests)
  announcements = clone(initialAnnouncements)
  packages = clone(initialPackages)
  documents = clone(initialDocuments)
  profile = clone(initialProfile)
}

export const __setResidentApiNetworkDelay = (delay: number): void => {
  networkDelay = delay
}
