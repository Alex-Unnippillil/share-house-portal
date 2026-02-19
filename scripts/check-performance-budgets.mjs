import fs from 'node:fs'

const budgets = JSON.parse(fs.readFileSync('config/performance-budgets.json', 'utf8'))
const lighthouseConfig = fs.readFileSync('.lighthouserc.js', 'utf8')

const errors = []

if (!lighthouseConfig.includes('largest-contentful-paint')) {
  errors.push('Missing LCP assertion in .lighthouserc.js')
}
if (!lighthouseConfig.includes('cumulative-layout-shift')) {
  errors.push('Missing CLS assertion in .lighthouserc.js')
}
if (!lighthouseConfig.includes('interaction-to-next-paint')) {
  errors.push('Missing INP assertion in .lighthouserc.js')
}

if (!budgets.apiResponseMs || typeof budgets.apiResponseMs !== 'object') {
  errors.push('Missing apiResponseMs budget map in config/performance-budgets.json')
} else {
  for (const [endpoint, budgetMs] of Object.entries(budgets.apiResponseMs)) {
    if (!endpoint.startsWith('/api/')) {
      errors.push(`API budget key must start with /api/: ${endpoint}`)
    }

    if (typeof budgetMs !== 'number' || !Number.isFinite(budgetMs) || budgetMs <= 0) {
      errors.push(`API budget for ${endpoint} must be a positive number`)
    }
  }
}

if (!budgets.webVitals || typeof budgets.webVitals !== 'object') {
  errors.push('Missing webVitals in config/performance-budgets.json')
}


if (!budgets.jsBundles || typeof budgets.jsBundles !== 'object') {
  errors.push('Missing jsBundles budget map in config/performance-budgets.json')
} else {
  for (const [route, budgetKb] of Object.entries(budgets.jsBundles)) {
    if (!route.startsWith('/')) {
      errors.push(`JS budget route must start with /: ${route}`)
    }

    if (typeof budgetKb !== 'number' || !Number.isFinite(budgetKb) || budgetKb <= 0) {
      errors.push(`JS budget for ${route} must be a positive number`)
    }
  }
}


if (errors.length) {
  console.error('Performance budget check failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Performance budget configuration passed.')
