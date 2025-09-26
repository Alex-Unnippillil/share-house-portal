import { notFound } from 'next/navigation'

import CountryPageClient from './client-page'

export const revalidate = 0

type CountryPageProps = {
  params: {
    id: string
  }
}

export default function CountryPage({ params }: CountryPageProps) {
  const id = Number(params.id)

  if (Number.isNaN(id)) {
    notFound()
  }

  return <CountryPageClient id={id} />
}
