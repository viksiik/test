import { execSync } from 'node:child_process';

/** sha з конфігурації (GIT_SHA) → інакше з git → інакше 'unknown'. */
export function resolveVersion(configuredSha: string | undefined): string {
  if (configuredSha) return configuredSha;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}
