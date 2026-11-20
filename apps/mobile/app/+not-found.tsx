import React from 'react';
import { Unmatched } from 'expo-router';
import { useLegacyRouteRedirect } from '../utils/legacyRoutes';

// Unmatched URLs land here. Legacy Spanish URLs (e.g. /mi-perfil from old emails) are
// redirected to their English routes; everything else gets the default not-found screen.
export default function NotFoundScreen(): React.JSX.Element | null {
  const redirecting = useLegacyRouteRedirect();
  return redirecting ? null : <Unmatched />;
}
