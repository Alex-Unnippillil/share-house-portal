#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const allowList = [
  'app/about/page.tsx',
  'app/account/account-form.tsx',
  'app/account/avatar.tsx',
  'app/account/supa-account-form.tsx',
  'app/auth-server-action/components/AuthFormLegacy.tsx',
  'app/auth/components/AuthForm.tsx',
  'app/auth/components/user-auth-form.tsx',
  'app/bookings/components/amenity-booking-form.tsx',
  'app/confirmation/page.tsx',
  'app/countries/[id]/page.tsx',
  'app/dashboard/components/MobileSideNav.tsx',
  'app/dashboard/components/NavLinks.tsx',
  'app/dashboard/components/SignOut.tsx',
  'app/dashboard/components/ToggleSidebar.tsx',
  'app/dashboard/members/components/create/CreateForm.tsx',
  'app/dashboard/members/components/edit/AccountForm.tsx',
  'app/dashboard/members/components/edit/AdvanceForm.tsx',
  'app/dashboard/members/components/edit/BasicForm.tsx',
  'app/dashboard/todo/components/CreateForm.tsx',
  'app/dashboard/todo/components/TodoForm.tsx',
  'app/dashboard/todo/components/ToggleDarkMode.tsx',
  'app/documents/components/create-signature-dialog.tsx',
  'app/documents/components/document-actions.tsx',
  'app/documents/components/document-viewer-dialog.tsx',
  'app/documents/components/documents-filters.tsx',
  'app/documents/components/upload-document-dialog.tsx',
  'app/payments/_components/catch-up-payment-card.tsx',
  'app/payments/_components/stripe-actions.tsx',
  'app/ssrcountries/[id]/country.tsx',
  'components/feature-prism.tsx',
  'components/forms/contact.tsx',
  'components/forms/profile-form.tsx',
  'components/forms/reacthookformstep.tsx',
  'components/forms/updateProfile.tsx',
  'components/google-auth-button.tsx',
  'components/maintenance/maintenance-request-form.tsx',
  'components/mobile-nav.tsx',
  'components/notifications/notification-center.tsx',
  'components/react-query-client-provider.tsx',
  'components/schedule-form.tsx',
  'components/sidebar-nav.tsx',
  'components/sign-out-button.tsx',
  'components/sign-out.tsx',
  'components/theme-provider.tsx',
  'components/theme-toggle.tsx',
  'components/ui/3d-cards.tsx',
  'components/ui/alert-dialog.tsx',
  'components/ui/avatar.tsx',
  'components/ui/calendar.tsx',
  'components/ui/checkbox.tsx',
  'components/ui/command.tsx',
  'components/ui/context-menu.tsx',
  'components/ui/dialog.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/hover-card.tsx',
  'components/ui/infinite-moving-cards.tsx',
  'components/ui/label.tsx',
  'components/ui/menubar.tsx',
  'components/ui/popover.tsx',
  'components/ui/progress.tsx',
  'components/ui/scroll-area.tsx',
  'components/ui/select.tsx',
  'components/ui/separator.tsx',
  'components/ui/sheet.tsx',
  'components/ui/slider.tsx',
  'components/ui/switch.tsx',
  'components/ui/tabs.tsx',
  'components/ui/time-picker.tsx',
  'components/ui/toaster.tsx',
  'components/visitors/visitor-booking-form.tsx',
  'hooks/use-auth.ts',
  'hooks/use-document-permissions.ts',
  'hooks/use-notifications.ts',
  'lib/hooks/use-copy-to-clipboard.tsx',
  'lib/hooks/use-sidebar.tsx',
  'utils/supabase-browser.ts',
].map((filePath) => filePath.replace(/\\/g, '/'))

const allowedFiles = new Set(allowList)
const disallowed = []

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  '.turbo',
])

const FILE_PATTERN = /\.(?:[tj]sx?|mdx)$/

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue

    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath)
      continue
    }

    if (!FILE_PATTERN.test(entry.name)) continue

    const contents = await fs.readFile(fullPath, 'utf8')
    if (!contents.includes("'use client'") && !contents.includes('"use client"')) {
      continue
    }

    const relativePath = path
      .relative(repoRoot, fullPath)
      .split(path.sep)
      .join('/')

    if (!allowedFiles.has(relativePath)) {
      disallowed.push(relativePath)
    }
  }
}

await walk(repoRoot)

if (disallowed.length > 0) {
  console.error('\nThe following files contain a "use client" directive but are not in the allow list:')
  disallowed.forEach((file) => console.error(`  - ${file}`))
  console.error('\nIf these files must be client components, explicitly add them to the allow list in scripts/check-client-directives.mjs.')
  process.exit(1)
}

const missing = []
for (const filePath of allowedFiles) {
  const absolute = path.join(repoRoot, filePath)
  try {
    const contents = await fs.readFile(absolute, 'utf8')
    if (!contents.includes("'use client'") && !contents.includes('"use client"')) {
      missing.push(filePath)
    }
  } catch {
    missing.push(filePath)
  }
}

if (missing.length > 0) {
  console.error('\nThe allow list references files without a "use client" directive:')
  missing.forEach((file) => console.error(`  - ${file}`))
  console.error('\nUpdate the allow list in scripts/check-client-directives.mjs to keep it in sync.')
  process.exit(1)
}

