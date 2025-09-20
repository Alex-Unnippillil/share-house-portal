import type { ServiceRequest } from './types';

export interface MaintenanceRepository {
  create(request: ServiceRequest): Promise<ServiceRequest>;
  getById(id: string): Promise<ServiceRequest | null>;
  save(request: ServiceRequest): Promise<ServiceRequest>;
}

function cloneRequest(request: ServiceRequest): ServiceRequest {
  return JSON.parse(JSON.stringify(request)) as ServiceRequest;
}

export class InMemoryMaintenanceRepository implements MaintenanceRepository {
  private readonly requests = new Map<string, ServiceRequest>();

  async create(request: ServiceRequest): Promise<ServiceRequest> {
    this.requests.set(request.id, cloneRequest(request));
    return cloneRequest(request);
  }

  async getById(id: string): Promise<ServiceRequest | null> {
    const request = this.requests.get(id);
    if (!request) {
      return null;
    }
    return cloneRequest(request);
  }

  async save(request: ServiceRequest): Promise<ServiceRequest> {
    this.requests.set(request.id, cloneRequest(request));
    return cloneRequest(request);
  }
}
