import * as React from "react"

import SmartLink from "@/components/navigation/SmartLink"

export default function OnboardingProgress({ step = 1 }: { step?: number }) {
  return (
    <div className="px-4 pb-8 pt-12">
      <div className="mx-auto w-full max-w-md">
        <div className="relative">
          <div className="absolute left-0 top-1/2 -mt-px h-0.5 w-full bg-slate-200 dark:bg-slate-700" aria-hidden="true"></div>
          <ul className="relative flex w-full justify-between">
            <li>
              <SmartLink
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 1 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                href="/signup?=page1"
                intent="navigation"
              >
                1
              </SmartLink>
            </li>
            <li>
              <SmartLink
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 2 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                href="/signup?=page2"
                intent="navigation"
              >
                2
              </SmartLink>
            </li>
            <li>
              <SmartLink
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 3 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                href="/signup?=page3"
                intent="navigation"
              >
                3
              </SmartLink>
            </li>
            <li>
              <SmartLink
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${step >= 4 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                href="/signup?=page4"
                intent="navigation"
              >
                4
              </SmartLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
