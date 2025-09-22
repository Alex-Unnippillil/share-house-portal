import type { NextWebVitalsMetric } from "next/app"

import { reportWebVitals as captureWebVital } from "@/utils/metrics/web-vitals"

export function reportWebVitals(metric: NextWebVitalsMetric) {
  void captureWebVital(metric)
}
