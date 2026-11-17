import React, { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../components/common/ScreenShell';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { AirsReviewView } from '../components/airsReports/AirsReviewView';
import { useManagePalette } from '../components/manage/useManagePalette';
import { createAirsReviewClient, focusedReportId } from '../utils/airsReports';
import type { ManageScreenAuthContext } from './manage/[projectId].types';

/**
 * Airs in review (/airs-reports), for approvers. Review emails link here with ?report=<id>,
 * which opens that report first.
 */
export default function AirsReportsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ report?: string | string[] }>();
  const router = useRouter();
  const { client } = (useAuth as unknown as () => ManageScreenAuthContext)();
  const { t } = useAppTranslation('mobile');
  const reviewClient = useMemo(
    () => createAirsReviewClient(() => client.getSessionToken()),
    [client]
  );
  const palette = useManagePalette();

  return (
    <ScreenShell activeSection='explore' backgroundColor={palette.background}>
      <AirsReviewView
        client={reviewClient}
        palette={palette}
        t={t}
        focusId={focusedReportId(params.report)}
        // Opened from an email there is no history: go to the Explorer instead.
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
      />
    </ScreenShell>
  );
}
