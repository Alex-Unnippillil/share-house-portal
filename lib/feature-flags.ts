import "server-only"

const FEATURE_FLAG_ENV_MAP = {
        streamingDashboards: "NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS",
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAG_ENV_MAP

function isTruthy(value: string | undefined) {
        if (!value) {
                return false
        }
        return ["1", "true", "on", "enabled", "yes"].includes(value.toLowerCase())
}

export function isFeatureEnabled(flag: FeatureFlag) {
        const envKey = FEATURE_FLAG_ENV_MAP[flag]
        return isTruthy(process.env[envKey])
}
