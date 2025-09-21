import { template as compileTemplate } from 'lodash';

import type {
  NotificationChannel,
  NotificationTemplate,
  RenderedTemplate,
  TemplateContext,
} from './types';

interface TemplateRegistryEntry extends NotificationTemplate {
  compiledSubject?: (context: TemplateContext) => string;
  compiledHtml?: (context: TemplateContext) => string;
  compiledText?: (context: TemplateContext) => string;
}

export class TemplateEngine {
  private readonly templates = new Map<string, TemplateRegistryEntry>();

  registerTemplate(template: NotificationTemplate) {
    const entry: TemplateRegistryEntry = {
      ...template,
      compiledSubject: template.subject
        ? compileTemplate(template.subject, { interpolate: /{{([\s\S]+?)}}/g })
        : undefined,
      compiledHtml: template.html
        ? compileTemplate(template.layout ? template.layout.replace('{{{body}}}', template.html) : template.html, {
            interpolate: /{{([\s\S]+?)}}/g,
          })
        : undefined,
      compiledText: template.text
        ? compileTemplate(template.text, { interpolate: /{{([\s\S]+?)}}/g })
        : undefined,
    };

    entry.createdAt = entry.createdAt ?? new Date();
    entry.updatedAt = new Date();

    this.templates.set(this.key(template.channel, template.id), entry);
  }

  getTemplate(channel: NotificationChannel, templateId: string): NotificationTemplate | null {
    return this.templates.get(this.key(channel, templateId)) ?? null;
  }

  render(
    channel: NotificationChannel,
    templateId: string,
    context: TemplateContext = {},
  ): RenderedTemplate {
    const template = this.templates.get(this.key(channel, templateId));

    if (!template) {
      throw new Error(`Template ${templateId} for channel ${channel} not registered`);
    }

    const mergedContext = {
      ...(template.defaultContext ?? {}),
      ...context,
    } satisfies TemplateContext;

    return {
      subject: template.compiledSubject ? template.compiledSubject(mergedContext) : template.subject,
      html: template.compiledHtml ? template.compiledHtml(mergedContext) : template.html,
      text: template.compiledText ? template.compiledText(mergedContext) : template.text,
      metadata: {
        templateId,
        channel,
        compiledAt: new Date().toISOString(),
      },
    } satisfies RenderedTemplate;
  }

  listTemplates(channel?: NotificationChannel): NotificationTemplate[] {
    return Array.from(this.templates.values())
      .filter((entry) => !channel || entry.channel === channel)
      .map(({ compiledHtml, compiledSubject, compiledText, ...rest }) => rest);
  }

  removeTemplate(channel: NotificationChannel, templateId: string) {
    this.templates.delete(this.key(channel, templateId));
  }

  private key(channel: NotificationChannel, templateId: string) {
    return `${channel}:${templateId}`;
  }
}
