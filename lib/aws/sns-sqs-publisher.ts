import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { NoopDomainEventPublisher } from '@/lib/events/domain-event';
import type { DomainEvent, DomainEventPublisher } from '@/lib/events/domain-event';

export interface SnsSqsPublisherOptions {
  topicArn?: string;
  queueUrl?: string;
  snsClient?: SNSClient;
  sqsClient?: SQSClient;
  region?: string;
}

/**
 * Publishes domain events to SNS topics and/or SQS queues. When both a topic
 * and queue are configured the event is faned-out to each destination.
 */
export class SnsSqsPublisher implements DomainEventPublisher {
  private readonly topicArn?: string;
  private readonly queueUrl?: string;
  private snsClient?: SNSClient;
  private sqsClient?: SQSClient;
  private readonly region?: string;

  constructor(options: SnsSqsPublisherOptions = {}) {
    this.topicArn = options.topicArn;
    this.queueUrl = options.queueUrl;
    this.snsClient = options.snsClient;
    this.sqsClient = options.sqsClient;
    this.region = options.region;
  }

  private getSnsClient(): SNSClient {
    if (!this.snsClient) {
      this.snsClient = new SNSClient({
        region: this.region ?? process.env.AWS_REGION ?? 'us-east-1',
      });
    }
    return this.snsClient;
  }

  private getSqsClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: this.region ?? process.env.AWS_REGION ?? 'us-east-1',
      });
    }
    return this.sqsClient;
  }

  async publish(event: DomainEvent): Promise<void> {
    const payload = JSON.stringify(event);
    const publishTasks: Promise<unknown>[] = [];

    if (this.topicArn) {
      publishTasks.push(
        this.getSnsClient().send(
          new PublishCommand({
            TopicArn: this.topicArn,
            Message: payload,
          }),
        ),
      );
    }

    if (this.queueUrl) {
      publishTasks.push(
        this.getSqsClient().send(
          new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: payload,
          }),
        ),
      );
    }

    if (!publishTasks.length) {
      // eslint-disable-next-line no-console
      console.warn('SNS/SQS publisher invoked without a topic ARN or queue URL. Event not dispatched.');
      return;
    }

    await Promise.all(publishTasks);
  }
}

export function createSnsSqsPublisherFromEnv(): DomainEventPublisher {
  const topicArn = process.env.MAINTENANCE_EVENTS_TOPIC_ARN;
  const queueUrl = process.env.MAINTENANCE_EVENTS_QUEUE_URL;

  if (!topicArn && !queueUrl) {
    return new NoopDomainEventPublisher();
  }

  return new SnsSqsPublisher({
    topicArn: topicArn ?? undefined,
    queueUrl: queueUrl ?? undefined,
  });
}
