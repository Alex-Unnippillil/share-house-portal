#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, 'scenarios.json');
const METRICS_PATH = path.join(__dirname, 'latest-metrics.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const services = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--service' || arg === '-s') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --service');
      }
      services.add(value.toLowerCase());
      i += 1;
      continue;
    }
    if (arg.startsWith('--service=')) {
      const value = arg.split('=')[1];
      if (value) {
        value.split(',').forEach((service) => services.add(service.toLowerCase()));
      }
      continue;
    }
  }
  return { services };
};

const normaliseConfig = (config) => {
  if (!config || !Array.isArray(config.scenarios)) {
    throw new Error('Invalid configuration: expected a scenarios array');
  }
  const baseStart = config.gameDay?.start ? new Date(config.gameDay.start) : new Date();
  if (Number.isNaN(baseStart.getTime())) {
    throw new Error(`Invalid gameDay.start value: ${config.gameDay.start}`);
  }
  return {
    gameDay: {
      label: config.gameDay?.label ?? 'Disaster Recovery Game Day',
      start: baseStart,
      owner: config.gameDay?.owner ?? 'Unassigned',
      timezone: config.gameDay?.timezone ?? 'UTC',
      notes: config.gameDay?.notes ?? ''
    },
    scenarios: config.scenarios.map((scenario) => ({
      ...scenario,
      offsetMinutes: scenario.offsetMinutes ?? 0,
      durationMinutes: scenario.durationMinutes ?? scenario.steps?.reduce((total, step) => total + (step.simulatedDurationMinutes ?? 0), 0) ?? 0
    }))
  };
};

const formatDate = (date, timezone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.format(date);
};

const computeSchedule = (baseStart, scenario) => {
  const start = new Date(baseStart.getTime() + (scenario.offsetMinutes ?? 0) * 60_000);
  const end = new Date(start.getTime() + (scenario.durationMinutes ?? 0) * 60_000);
  return { start, end };
};

const computeMetrics = (scenario) => {
  const actualRTO = (scenario.steps ?? []).reduce(
    (total, step) => total + (step.simulatedDurationMinutes ?? 0),
    0
  );
  const actualRPO = scenario.restorePointAgeMinutes ?? scenario.targetRPO ?? 0;
  const rtoGapMinutes = actualRTO - (scenario.targetRTO ?? 0);
  const rpoGapMinutes = actualRPO - (scenario.targetRPO ?? 0);
  return {
    actualRTO,
    actualRPO,
    rtoGapMinutes,
    rpoGapMinutes,
    rtoMet: rtoGapMinutes <= 0,
    rpoMet: rpoGapMinutes <= 0
  };
};

const printScenario = async (scenario, schedule, timezone, metrics) => {
  console.log(`\n=== ${scenario.title} (${scenario.service}) ===`);
  console.log(`Owner: ${scenario.owner}`);
  console.log(
    `Window: ${formatDate(schedule.start, timezone)} - ${formatDate(schedule.end, timezone)} (${scenario.durationMinutes} min)`
  );
  console.log(
    `Targets -> RTO: ${scenario.targetRTO} min, RPO: ${scenario.targetRPO} min`
  );
  console.log('Simulating steps:');
  for (const [index, step] of (scenario.steps ?? []).entries()) {
    console.log(
      `  ${index + 1}. ${step.name} (~${step.simulatedDurationMinutes} min)`
    );
    if (step.summary) {
      console.log(`     ↳ ${step.summary}`);
    }
    await sleep(60);
  }
  console.log(
    `Simulated RTO: ${metrics.actualRTO} min -> ${
      metrics.rtoMet ? 'meets target ✅' : `exceeds target by ${metrics.rtoGapMinutes} min ❌`
    }`
  );
  console.log(
    `Simulated RPO: ${metrics.actualRPO} min -> ${
      metrics.rpoMet ? 'meets target ✅' : `exceeds target by ${metrics.rpoGapMinutes} min ❌`
    }`
  );
  if ((scenario.successCriteria ?? []).length > 0) {
    console.log('Success criteria:');
    scenario.successCriteria.forEach((criterion) => console.log(`  - ${criterion}`));
  }
  const needsImprovement = !metrics.rtoMet || !metrics.rpoMet;
  if (needsImprovement && (scenario.improvementBacklog ?? []).length > 0) {
    console.log('Improvement backlog:');
    scenario.improvementBacklog.forEach((item) => console.log(`  - ${item}`));
  }
};

const writeMetrics = async (gameDay, scenarioMetrics) => {
  const payload = {
    gameDay: {
      label: gameDay.label,
      owner: gameDay.owner,
      timezone: gameDay.timezone,
      start: gameDay.start.toISOString()
    },
    generatedAt: new Date().toISOString(),
    scenarios: scenarioMetrics
  };
  await writeFile(METRICS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const main = async () => {
  try {
    const args = parseArgs(process.argv.slice(2));
    const rawConfig = await readFile(CONFIG_PATH, 'utf8');
    const config = normaliseConfig(JSON.parse(rawConfig));
    console.log(`Disaster recovery game day: ${config.gameDay.label}`);
    console.log(`Owner: ${config.gameDay.owner} | Timezone: ${config.gameDay.timezone}`);
    if (config.gameDay.notes) {
      console.log(`Notes: ${config.gameDay.notes}`);
    }
    const scenarios = config.scenarios.filter((scenario) => {
      if (args.services.size === 0) {
        return true;
      }
      return args.services.has(String(scenario.service).toLowerCase());
    });
    if (scenarios.length === 0) {
      console.log('No scenarios matched the provided filter.');
      return;
    }
    const scenarioMetrics = [];
    for (const scenario of scenarios) {
      const schedule = computeSchedule(config.gameDay.start, scenario);
      const metrics = computeMetrics(scenario);
      await printScenario(scenario, schedule, config.gameDay.timezone, metrics);
      scenarioMetrics.push({
        service: scenario.service,
        title: scenario.title,
        owner: scenario.owner,
        scheduledStart: schedule.start.toISOString(),
        scheduledEnd: schedule.end.toISOString(),
        targetRTO: scenario.targetRTO,
        actualRTO: metrics.actualRTO,
        rtoGapMinutes: metrics.rtoGapMinutes,
        rtoMet: metrics.rtoMet,
        targetRPO: scenario.targetRPO,
        actualRPO: metrics.actualRPO,
        rpoGapMinutes: metrics.rpoGapMinutes,
        rpoMet: metrics.rpoMet,
        improvementBacklog: scenario.improvementBacklog ?? [],
        successCriteria: scenario.successCriteria ?? []
      });
    }
    await writeMetrics(config.gameDay, scenarioMetrics);
    console.log(`\nMetrics saved to ${METRICS_PATH}`);
  } catch (error) {
    console.error('Failed to run game day simulation:', error.message);
    process.exitCode = 1;
  }
};

await main();
