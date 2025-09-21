'use client'

import {
  acknowledgePackagePickup,
  getAnnouncements,
  getMaintenanceRequests,
  getPackages,
  getResidentDashboard,
  getResidentDocuments,
  getResidentProfile,
  updateMaintenanceRequestStatus,
  updateResidentPreferences,
  type Announcement,
  type MaintenanceRequest,
  type PackageDelivery,
  type ResidentDocument,
  type ResidentProfile,
} from './api'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

const residentKeys = {
  dashboard: ['resident', 'dashboard'] as const,
  maintenance: ['resident', 'maintenance'] as const,
  announcements: ['resident', 'announcements'] as const,
  packages: ['resident', 'packages'] as const,
  documents: ['resident', 'documents'] as const,
  profile: ['resident', 'profile'] as const,
}

export const useResidentDashboard = (): UseQueryResult<ResidentDashboardSummary, Error> =>
  useQuery({
    queryKey: residentKeys.dashboard,
    queryFn: () => getResidentDashboard(),
  })

export const useMaintenanceRequests = (): UseQueryResult<MaintenanceRequest[], Error> =>
  useQuery({
    queryKey: residentKeys.maintenance,
    queryFn: () => getMaintenanceRequests(),
  })

export const useAnnouncementsFeed = (): UseQueryResult<Announcement[], Error> =>
  useQuery({
    queryKey: residentKeys.announcements,
    queryFn: () => getAnnouncements(),
  })

export const usePackagesList = (): UseQueryResult<PackageDelivery[], Error> =>
  useQuery({
    queryKey: residentKeys.packages,
    queryFn: () => getPackages(),
  })

export const useResidentDocuments = (): UseQueryResult<ResidentDocument[], Error> =>
  useQuery({
    queryKey: residentKeys.documents,
    queryFn: () => getResidentDocuments(),
  })

export const useResidentProfile = (): UseQueryResult<ResidentProfile, Error> =>
  useQuery({
    queryKey: residentKeys.profile,
    queryFn: () => getResidentProfile(),
  })

export const useUpdateMaintenanceStatus = (): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; status: MaintenanceRequest['status'] }
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => updateMaintenanceRequestStatus(id, status),
    onSuccess: updatedRequest => {
      queryClient.setQueryData<MaintenanceRequest[]>(residentKeys.maintenance, current =>
        current?.map(item => (item.id === updatedRequest.id ? updatedRequest : item)) ?? [updatedRequest]
      )
      queryClient.invalidateQueries({ queryKey: residentKeys.dashboard })
    },
  })
}

export const useAcknowledgePackage = (): UseMutationResult<
  PackageDelivery,
  Error,
  { id: string }
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => acknowledgePackagePickup(id),
    onSuccess: updatedPackage => {
      queryClient.setQueryData<PackageDelivery[]>(residentKeys.packages, current =>
        current?.map(item => (item.id === updatedPackage.id ? updatedPackage : item)) ?? [updatedPackage]
      )
      queryClient.invalidateQueries({ queryKey: residentKeys.dashboard })
    },
  })
}

export const useUpdateResidentPreferences = (): UseMutationResult<
  ResidentProfile,
  Error,
  Partial<ResidentProfile['preferences']>
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updates => updateResidentPreferences(updates),
    onSuccess: updatedProfile => {
      queryClient.setQueryData(residentKeys.profile, updatedProfile)
    },
  })
}

export { residentKeys }
