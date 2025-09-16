import { runCli, parseCliArgs } from './cli.js';

async function main() {
  const options = parseCliArgs();
  await runCli(options);
}

main().catch(console.error);
