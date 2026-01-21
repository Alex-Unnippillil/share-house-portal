import { getUpcomingBookings } from "../data"
import { UpcomingBookingsCardClient } from "./upcoming-bookings-card.client"

export async function UpcomingBookingsCard() {
  const bookings = await getUpcomingBookings()
  return <UpcomingBookingsCardClient bookings={bookings} />
}
