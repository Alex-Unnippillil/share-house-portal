import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Contact } from "@/components/forms/contact"

const quickStartSteps = [
  {
    title: "Complete onboarding",
    description:
      "Confirm your unit assignment, rent share, emergency contacts, and vehicle details so roommates and property managers can coordinate safely.",
  },
  {
    title: "Set up rent payments",
    description:
      "Connect a payment method, enable autopay if needed, and review due dates and receipts from the Payments workspace.",
  },
  {
    title: "Book shared amenities",
    description:
      "Reserve shared spaces like kitchen, TV room, parking, and computer stations while avoiding booking conflicts.",
  },
  {
    title: "Track documents and requests",
    description:
      "Use Documents for lease files and signed agreements, and Maintenance for issue reporting and progress updates.",
  },
]

const faqItems = [
  {
    question: "Who can see my requests and bookings?",
    answer:
      "Roommates in your unit and authorized property managers can view booking and request status needed for household coordination.",
  },
  {
    question: "How do overnight guest limits work?",
    answer:
      "Visitor requests are validated against your property policy before submission and notify roommates plus property management.",
  },
  {
    question: "Where do I find signed lease agreements?",
    answer:
      "Open the Documents area to view the latest signed lease files, previous versions, and compliance records.",
  },
]

export default function AboutPage() {
  return (
    <div className="container mx-auto space-y-10 px-4 py-12">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold">Portal Help</h1>
        <p className="max-w-3xl text-muted-foreground">
          Use this guide to get started with rent, amenity bookings, documents, and roommate coordination in the Share House
          Portal.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quickStartSteps.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {faqItems.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Need more help?</CardTitle>
            <CardDescription>Contact property support for account, billing, or booking issues.</CardDescription>
          </CardHeader>
          <CardContent>
            <Contact />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
