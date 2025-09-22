const thresholds = require('./config/canary/thresholds.json');

const canaryUrl = process.env.CANARY_URL;
if (!canaryUrl) {
  throw new Error('CANARY_URL must be set to run Lighthouse checks');
}

const numberOfRuns = Number(process.env.LIGHTHOUSE_RUNS || 1);

module.exports = {
  ci: {
    collect: {
      url: [canaryUrl],
      numberOfRuns,
      settings: {
        chromeFlags: '--no-sandbox',
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: thresholds.lighthouse.performance }],
        'categories:accessibility': ['error', { minScore: thresholds.lighthouse.accessibility }],
        'categories:best-practices': ['error', { minScore: thresholds.lighthouse.bestPractices }],
        'categories:seo': ['error', { minScore: thresholds.lighthouse.seo }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouse'
    }
  }
};
