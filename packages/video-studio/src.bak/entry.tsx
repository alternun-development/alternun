import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioDashboard } from './studio/StudioDashboard';

// Check if we're running in studio mode (not in Remotion preview)
const isStudioMode = !window.location.pathname.includes('/preview') && !window.remotion_projectName;

if (isStudioMode) {
  // Studio mode - render the dashboard
  const root = ReactDOM.createRoot(document.getElementById('root') || document.body);
  root.render(
    <React.StrictMode>
      <StudioDashboard />
    </React.StrictMode>
  );
} else {
  // Remotion mode - composition preview will handle it
  console.log('Running in Remotion Studio mode');
}
