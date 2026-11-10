import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../../components/common/ScreenShell';
import { useAuth } from '../../../components/auth/AppAuthProvider';
import { useAppTranslation } from '../../../components/i18n/useAppTranslation';
import { EnterpriseManageView } from '../../../components/manage/EnterpriseManageView';
import { useManagePalette } from '../../../components/manage/useManagePalette';
import { createEnterpriseManageClient } from '../../../utils/enterpriseManage';
import { createClientsClient } from '../../../utils/projectClients';
import type { ManageScreenAuthContext } from '../[projectId].types';

/** In-app enterprise administration (/manage/enterprise/:enterpriseId). */
export default function EnterpriseManageScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ enterpriseId?: string | string[] }>();
  const router = useRouter();
  const { client } = (useAuth as unknown as () => ManageScreenAuthContext)();
  const { t } = useAppTranslation('mobile');
  const enterpriseId = Array.isArray(params.enterpriseId)
    ? params.enterpriseId[0] ?? ''
    : params.enterpriseId ?? '';
  const manageClient = useMemo(
    () => createEnterpriseManageClient(enterpriseId, () => client.getSessionToken()),
    [client, enterpriseId]
  );
  const clientsClient = useMemo(
    () => createClientsClient({ enterpriseId }, () => client.getSessionToken()),
    [client, enterpriseId]
  );
  const palette = useManagePalette();

  return (
    <ScreenShell activeSection='explore' backgroundColor={palette.background}>
      <EnterpriseManageView
        key={enterpriseId}
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
