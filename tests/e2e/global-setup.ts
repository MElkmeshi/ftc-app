import { execFileSync } from 'node:child_process';

export default function globalSetup() {
    execFileSync('php', ['tests/e2e/fixture.php', 'seed'], { stdio: 'inherit' });
}
