import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../components/common/ScreenShell';
import { useAuth } from '../../components/auth/AppAuthProvider';
import { useAppTranslation } from '../../components/i18n/useAppTranslation';
import { ProjectManageView } from '../../components/manage/ProjectManageView';
import { useManagePalette } from '../../components/manage/useManagePalette';
import { createManageClient } from '../../utils/projectManage';
import { createClientsClient } from '../../utils/projectClients';
import type { ManageScreenAuthContext } from './[projectId].types';

/** In-app project administration (/manage/:projectId) for project admins and moderators. */
export default function ProjectManageScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const router = useRouter();
  const { client } = (useAuth as unknown as () => ManageScreenAuthContext)();
  const { t } = useAppTranslation('mobile');
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0] ?? ''
    : params.projectId ?? '';
  const manageClient = useMemo(
    () => createManageClient(projectId, () => client.getSessionToken()),
    [client, projectId]
  );
  const clientsClient = useMemo(
    () => createClientsClient({ projectId }, () => client.getSessionToken()),
    [client, projectId]
  );
  const palette = useManagePalette();

  return (
    <ScreenShell activeSection='explore' backgroundColor={palette.background}>
      <ProjectManageView
        key={projectId}
        client={manageClient}
        palette={palette}
        t={t}
        onBack={() => router.back()}
        canPickFiles={Platform.OS === 'web'}
        clientsClient={clientsClient}
      />
    </ScreenShell>
  );
}
