const coreRoutes = [
  '/',
  '/dashboard',
  '/payments',
  '/documents',
  '/messaging',
  '/visitors',
  '/maintenance',
  '/account',
  '/contact',
  '/auth',
  '/onboarding',
];

const buildUrl = (baseUrl, route) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${route}`;
};

const previewBaseUrl =
  process.env.LHCI_PREVIEW_BASE_URL || process.env.URL || 'http://localhost:3000';

module.exports = {
  coreRoutes,
  ci: {
    collect: {
      url: coreRoutes.map((route) => buildUrl(previewBaseUrl, route)),
      numberOfRuns: 3,
      settings: {
        extraHeaders: JSON.stringify({
          'x-lhci-env': 'ci',
        }),
      },
      budgets: [
        {
          path: '/*',
          timings: [
            { metric: 'first-contentful-paint', threshold: 1800 },
            { metric: 'largest-contentful-paint', threshold: 2500 },
            { metric: 'speed-index', threshold: 3400 },
            { metric: 'total-blocking-time', threshold: 200 },
            { metric: 'interaction-to-next-paint', threshold: 200 },
            { metric: 'cumulative-layout-shift', threshold: 0.1 },
          ],
        },
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800, aggregationMethod: 'median' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'speed-index': ['error', { maxNumericValue: 3400, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'artifacts/lighthouse',
      reportFilenamePattern: 'report-<%= urlHash %>.html',
    },
  },
};
