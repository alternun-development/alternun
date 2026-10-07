export function parsePorcelainStatus(output) {
  const records = output.split('\0').filter(Boolean);
  const changes = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const pathName = record.slice(3).replace(/\\/g, '/');

    if (!pathName) {
      continue;
    }

    changes.push({
      xy: status.trim(),
      path: pathName,
      untracked: status === '??',
    });

    // In NUL-delimited porcelain output, rename/copy records include the
    // source path as the following record. The current path is the destination
    // path, which is the one that must be passed to git add.
    if (status.includes('R') || status.includes('C')) {
      index += 1;
    }
  }

  return changes;
}
