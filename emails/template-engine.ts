import { readFile } from "node:fs/promises"
import path from "node:path"
import Handlebars from "handlebars"

const TEMPLATE_ROOT = path.join(process.cwd(), "emails", "templates")

const templateCache = new Map<string, Handlebars.TemplateDelegate>()

export interface EmailTemplateDescriptor {
  name: string
  version: string
}

function getCacheKey(descriptor: EmailTemplateDescriptor) {
  return `${descriptor.name}@${descriptor.version}`
}

async function loadTemplateSource(descriptor: EmailTemplateDescriptor) {
  const filePath = path.join(
    TEMPLATE_ROOT,
    descriptor.name,
    `${descriptor.version}.hbs`
  )

  return readFile(filePath, "utf8")
}

export async function renderEmailTemplate<TContext>(
  descriptor: EmailTemplateDescriptor,
  context: TContext
) {
  const cacheKey = getCacheKey(descriptor)
  let compiled = templateCache.get(cacheKey)

  if (!compiled) {
    const source = await loadTemplateSource(descriptor)
    compiled = Handlebars.compile(source)
    templateCache.set(cacheKey, compiled)
  }

  return compiled(context)
}
