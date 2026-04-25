import SmartLink from "@/components/navigation/SmartLink"
import { Contact } from "@/components/forms/contact"
import { Icons } from "@/components/icons"
import { siteConfig } from "@/config/site"

export default function ContactPage() {
  const supportEmail = siteConfig.support.email
  const supportPhone = siteConfig.support.phone
  const supportPhoneHref = `tel:${supportPhone.replace(/[^\d+]/g, "")}`

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col items-center space-y-2 text-center">
          <SmartLink href="/" className="mb-8 inline-flex">
            <span className="flex items-center space-x-2">
              <Icons.logo className="size-6" />
              <span className="inline-block font-bold">{siteConfig.name}</span>
            </span>
          </SmartLink>
          <h1 className="text-2xl font-semibold tracking-tight">Contact support</h1>
          <p className="text-sm text-muted-foreground">
            Need help with your household portal account? Reach our support team at{" "}
            <a className="font-medium underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>{" "}
            or call{" "}
            <a className="font-medium underline" href={supportPhoneHref}>
              {supportPhone}
            </a>
            .
          </p>
        </div>
        <Contact />
      </div>
    </div>
  )
}
