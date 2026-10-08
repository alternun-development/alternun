import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// SST 3.19.3 exports CheckpointV3 (latest.resources), and state remove accepts
// resource names, not URNs. Never print exported state: it can contain secrets.
export function planCertificatePreservation(checkpoint, prefixes) {
  const resources = checkpoint?.latest?.resources;
  if (!Array.isArray(resources)) throw new Error('Unsupported SST state format');
  // A pending operation whose resource URN no longer exists in state is orphaned
  // (e.g. left behind by an interrupted build step already removed from state),
  // not an in-flight operation that could race with this migration.
  const resourceByUrn = new Map(resources.map((resource) => [resource.urn, resource]));
  const activePendingOperations = (checkpoint.latest.pending_operations ?? []).filter(
    (operation) => {
      const resource = resourceByUrn.get(operation.resource?.urn);
      if (!resource) return false;
      // A 'creating' operation whose resource already has recorded outputs
      // completed successfully; the pending-operation record is stale
      // checkpoint bookkeeping left behind for that resource, not an
      // in-flight operation that could race with this migration.
      if (operation.type === 'creating' && resource.outputs && Object.keys(resource.outputs).length)
        return false;
      return true;
    }
  );
  if (activePendingOperations.length) throw new Error('SST state has pending operations');
  const byUrn = new Map();
  const byName = new Map();
  for (const resource of resources) {
    if (typeof resource.urn !== 'string' || !resource.urn.startsWith('urn:pulumi:')) {
      throw new Error('Invalid SST resource identity');
    }
    const name = resource.urn.split('::').at(-1);
    if (byUrn.has(resource.urn)) throw new Error('Duplicate SST resource identity');
    byUrn.set(resource.urn, resource);
    byName.set(name, [...(byName.get(name) ?? []), resource]);
  }
  const selected = new Set();
  const depth = new Map();
  for (const resource of resources) {
    let current = resource;
    let distance = 0;
    const visited = new Set();
    while (current) {
      if (visited.has(current.urn)) throw new Error('SST state has a parent cycle');
      visited.add(current.urn);
      const name = current.urn.split('::').at(-1);
      if (prefixes.includes(name)) {
        if (current.type !== 'sst:aws:Certificate')
          throw new Error('Unexpected certificate component type');
        selected.add(resource.urn);
        depth.set(resource.urn, distance);
        break;
      }
      if (!current.parent) break;
      current = byUrn.get(current.parent);
      if (!current) throw new Error('SST state has an unresolved parent; repair before migration');
      distance++;
    }
    const name = resource.urn.split('::').at(-1);
    if (prefixes.some((prefix) => name.startsWith(prefix)) && !selected.has(resource.urn)) {
      throw new Error('Unowned legacy certificate resource; reconcile state before migration');
    }
  }
  return [...selected]
    .sort((a, b) => depth.get(b) - depth.get(a))
    .map((urn) => {
      const name = urn.split('::').at(-1);
      if (byName.get(name).length !== 1) throw new Error('Ambiguous SST resource name');
      return name;
    });
}

export function preserveCertificateState(stage, prefixes, run = execFileSync) {
  const invoke = (args, input) =>
    run('npx', ['sst', 'state', ...args, '--stage', stage], {
      encoding: 'utf8',
      input,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, SST_TELEMETRY_DISABLED: '1' },
    });
  try {
    const names = planCertificatePreservation(JSON.parse(invoke(['export'])), prefixes);
    for (const name of names) invoke(['remove', name], 'y\n');
    if (
      names.length &&
      planCertificatePreservation(JSON.parse(invoke(['export'])), prefixes).length
    ) {
      throw new Error('Legacy certificate resources remain in state');
    }
    return names.length;
  } catch {
    // Child-process errors include stdout/stderr and possibly state secrets.
    throw new Error(
      'Certificate state preservation failed; deployment stopped. Inspect SST state privately before retrying.'
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const count = preserveCertificateState(process.argv[2], process.argv.slice(3));
    console.log(
      `Preserved ${count} certificate and validation resources outside legacy SST state.`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
