'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LandingFooter() {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    // Load version from package.json
    try {
      const pkg = require('../../package.json') as { version: string };
      setVersion(pkg.version);
    } catch (e) {
      // Fallback to default
    }
  }, []);

  return (
    <footer className='w-full bg-white/40 backdrop-blur-sm border-t border-gray-200/30'>
      <div className='max-w-7xl mx-auto px-8 py-6'>
        <div className='flex flex-col items-start gap-4'>
          {/* Copyright — left-aligned */}
          <p className='text-gray-900 font-semibold'>(c) 2026 Alternun. All rights reserved.</p>

          {/* Version and Help Icon — left-aligned below */}
          <div className='flex items-center gap-3'>
            {/* Help Icon Button */}
            <button className='p-2 rounded-full border border-gray-300/50 bg-white/60 hover:bg-white transition-colors'>
              <HelpCircle size={18} className='text-gray-600' strokeWidth={1.5} />
            </button>

            {/* Version Button */}
            <button className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-300/50 bg-teal-50/40 hover:bg-teal-100/50 transition-colors'>
              <span className='text-teal-600 font-bold text-sm'>v{version}</span>
              <span className='text-teal-600 text-xs'>▾</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
