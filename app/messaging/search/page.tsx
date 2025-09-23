import { MessagingSearchExperience } from "@/components/messaging/messaging-search-experience";

export default function MessagingSearchPage() {
  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Search messaging</h1>
        <p className="text-muted-foreground">
          Quickly pivot across roommate announcements, polls, and maintenance chatter with curated filters.
        </p>
      </header>
      <MessagingSearchExperience />
    </div>
  );
}
