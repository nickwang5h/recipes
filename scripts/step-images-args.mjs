// The command line of scripts/step-images.mjs, apart so it can be tested without running the script.

/** Options that take the next argument as their value (see the usage at the top of step-images.mjs). */
export const VALUE_OPTIONS = new Set(['--limit', '--max-5h', '--max-week', '--max-week-plain', '--model', '--commit-every']);

/** The command and its slugs: every argument that is neither an option nor an option's value. */
export function parseArgs(args) {
  const [cmd, ...rest] = args;
  const slugs = [];
  for (let i = 0; i < rest.length; i++) {
    if (VALUE_OPTIONS.has(rest[i])) i++;
    else if (!rest[i].startsWith('--')) slugs.push(rest[i]);
  }
  return { cmd, slugs };
}
