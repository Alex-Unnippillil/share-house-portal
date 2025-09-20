import { createSnsSqsPublisherFromEnv } from '@/lib/aws/sns-sqs-publisher';

import { InMemoryMaintenanceRepository } from './repository';
import { MaintenanceService } from './service';

const repository = new InMemoryMaintenanceRepository();
const publisher = createSnsSqsPublisherFromEnv();

export const maintenanceService = new MaintenanceService(repository, publisher);
