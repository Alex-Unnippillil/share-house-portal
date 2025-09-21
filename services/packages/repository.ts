import { randomUUID } from 'crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase'

import { PackageServiceError } from './errors'
import type { PackageRow, SupplyChainRow } from './types'

export interface CreatePackageRecord {
  packageId: string
  name: string
  description?: string
  type?: string
  userId: string
  barcode: string
  status: string
}

export interface SupplyChainEventRecord {
  packageId: string
  userId: string
  dataType: string
  data: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface FetchPackagesOptions {
  startDate?: string
  endDate?: string
}

export interface FetchEventsOptions {
  packageIds?: string[]
  since?: string
}

export interface PackageRepository {
  createPackage(record: CreatePackageRecord): Promise<PackageRow>
  findById(packageId: string): Promise<PackageRow | null>
  findByBarcode(barcode: string): Promise<PackageRow | null>
  fetchPackagesByIds(packageIds: string[]): Promise<PackageRow[]>
  updatePackageStatus(packageId: string, status: string): Promise<PackageRow>
  updatePackagesStatus(packageIds: string[], status: string): Promise<PackageRow[]>
  insertSupplyChainEvent(event: SupplyChainEventRecord): Promise<void>
  fetchEvents(dataType: string, options?: FetchEventsOptions): Promise<SupplyChainRow[]>
  fetchPackages(options?: FetchPackagesOptions): Promise<PackageRow[]>
}

export class SupabasePackageRepository implements PackageRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createPackage(record: CreatePackageRecord): Promise<PackageRow> {
    const { data, error } = await this.client
      .from('packages')
      .insert({
        id: record.packageId,
        name: record.name,
        description: record.description ?? null,
        type: record.type ?? null,
        user_id: record.userId,
        status: record.status,
        qr_code_url: record.barcode,
      })
      .select()
      .single()

    if (error) {
      throw new PackageServiceError('Failed to intake package', 500, error)
    }

    return data
  }

  async findById(packageId: string): Promise<PackageRow | null> {
    const { data, error } = await this.client
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .maybeSingle()

    if (error) {
      throw new PackageServiceError('Failed to lookup package', 500, error)
    }

    return data
  }

  async findByBarcode(barcode: string): Promise<PackageRow | null> {
    const byId = await this.findById(barcode)
    if (byId) {
      return byId
    }

    const { data, error } = await this.client
      .from('packages')
      .select('*')
      .eq('qr_code_url', barcode)
      .maybeSingle()

    if (error) {
      throw new PackageServiceError('Failed to lookup package', 500, error)
    }

    return data
  }

  async fetchPackagesByIds(packageIds: string[]): Promise<PackageRow[]> {
    if (packageIds.length === 0) {
      return []
    }

    const { data, error } = await this.client
      .from('packages')
      .select('*')
      .in('id', packageIds)

    if (error) {
      throw new PackageServiceError('Failed to load packages', 500, error)
    }

    return data ?? []
  }

  async updatePackageStatus(packageId: string, status: string): Promise<PackageRow> {
    const { data, error } = await this.client
      .from('packages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .select()
      .single()

    if (error) {
      throw new PackageServiceError('Failed to update package', 500, error)
    }

    return data
  }

  async updatePackagesStatus(packageIds: string[], status: string): Promise<PackageRow[]> {
    if (packageIds.length === 0) {
      return []
    }

    const { data, error } = await this.client
      .from('packages')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', packageIds)
      .select()

    if (error) {
      throw new PackageServiceError('Failed to update packages', 500, error)
    }

    return data ?? []
  }

  async insertSupplyChainEvent(event: SupplyChainEventRecord): Promise<void> {
    const { error } = await this.client.from('supply_chain_data').insert({
      id: randomUUID(),
      name: event.packageId,
      user_id: event.userId,
      data_type: event.dataType,
      data: event.data as Json,
      metadata: event.metadata as Json | undefined,
    })

    if (error) {
      throw new PackageServiceError('Failed to record package event', 500, error)
    }
  }

  async fetchEvents(
    dataType: string,
    options: FetchEventsOptions = {}
  ): Promise<SupplyChainRow[]> {
    let query = this.client.from('supply_chain_data').select('*').eq('data_type', dataType)

    if (options.packageIds && options.packageIds.length > 0) {
      query = query.in('name', options.packageIds)
    }

    if (options.since) {
      query = query.gte('created_at', options.since)
    }

    const { data, error } = await query

    if (error) {
      throw new PackageServiceError('Failed to load package events', 500, error)
    }

    return data ?? []
  }

  async fetchPackages(options: FetchPackagesOptions = {}): Promise<PackageRow[]> {
    let query = this.client.from('packages').select('*')

    if (options.startDate) {
      query = query.gte('created_at', options.startDate)
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate)
    }

    const { data, error } = await query

    if (error) {
      throw new PackageServiceError('Failed to load packages', 500, error)
    }

    return data ?? []
  }
}
