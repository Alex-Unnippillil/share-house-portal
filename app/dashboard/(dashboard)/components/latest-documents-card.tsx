import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

import { getRecentDocumentsPreview } from '../data'

export async function LatestDocumentsCard() {
  const documents = await getRecentDocumentsPreview()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest documents</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {documents.map((document) => (
            <li key={document.id}>{document.title}</li>
          ))}
        </ul>
        <Link href="/documents" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Open
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
