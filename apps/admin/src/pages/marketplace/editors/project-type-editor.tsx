import { useEffect, useState } from 'react';
import { requestMarketplace } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import {
  projectTypeAssignmentPath,
  projectTypeLabel,
  projectTypesPath,
  sortProjectTypes,
} from '../../../marketplace/project-types';
import type { ProjectType, SetProjectTypeResponse } from '../../../marketplace/project-types.types';
import type { ProjectTypeEditorProps, ProjectTypeOptionsState } from './project-type-editor.types';

const copy = marketplaceCopy.projectTypes;

/** Shows a project's type; Super Admins can change it (it decides whether reports need a document). */
export function ProjectTypeEditor({
  project,
  roles,
  onChanged,
}: ProjectTypeEditorProps): JSX.Element {
  const canManage = hasMarketplacePermission(roles, 'project_types:manage');
  const [options, setOptions] = useState<ProjectTypeOptionsState>({ kind: 'loading' });
  const [current, setCurrent] = useState<string>(project.projectTypeCode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    requestMarketplace<ProjectType[]>(projectTypesPath)
      .then((data) => {
        if (active) setOptions({ kind: 'success', data: sortProjectTypes(data) });
      })
      .catch((requestError: unknown) => {
        if (active) setOptions({ kind: 'error', error: requestError });
      });
    return () => {
      active = false;
    };
  }, []);

  const types = options.kind === 'success' ? options.data : [];
  const selected = types.find((type) => type.code === current);

  async function change(code: string): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      const result = await requestMarketplace<SetProjectTypeResponse>(
        projectTypeAssignmentPath(project.id),
        { method: 'PUT', body: { projectTypeCode: code === '' ? null : code } }
      );
      setCurrent(result.projectTypeCode ?? '');
      onChanged(copy.assigned);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='project-type-editor'>
      <label>
        <span>{copy.projectType}</span>
        <select
          disabled={!canManage || saving || options.kind !== 'success'}
          value={current}
          onChange={(event) => void change(event.target.value)}
        >
          <option value=''>{copy.none}</option>
          {types
            .filter((type) => type.isActive || type.code === current)
            .map((type) => (
              <option key={type.code} value={type.code}>
                {projectTypeLabel(type)}
              </option>
            ))}
        </select>
      </label>
      <small>
        {selected
          ? selected.requiresDocumentNumber
            ? copy.documentRequired
            : copy.documentOptional
          : copy.documentRequiredNoType}
      </small>
      {!canManage ? <small>{copy.assignPermission}</small> : null}
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
    </div>
  );
}
