import type { Route } from 'next'
import SmartLink from "@/components/navigation/SmartLink"
import React from 'react'
 
function Card<T extends string>({ href }: { href: Route<T> | URL }) {
  return (
    <SmartLink href={href}>
      <div>My Card</div>
    </SmartLink>
  )
}