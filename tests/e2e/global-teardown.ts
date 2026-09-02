import { execFileSync } from 'node:child_process';

export default function globalTeardown() {
    execFileSync('php', ['tests/e2e/fixture.php', 'cleanup'], { stdio: 'inherit' });
}
