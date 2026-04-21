import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Alternun | Regenerative Impact Platform',
  description:
    "Learn about Alternun's mission to create a regenerative economy through verified impact tracking and monetization. Founded on principles of transparency and innovation.",
  openGraph: {
    title: 'About Alternun',
    description: 'Our mission, values, and the team behind the regenerative economy platform',
    url: 'https://alternun.co/about',
  },
};

export default function AboutPage() {
  return (
    <main className='min-h-screen bg-white'>
      <div className='max-w-4xl mx-auto px-6 py-20'>
        {/* H1 - First line for AI indexing */}
        <h1 className='text-5xl font-bold mb-6 text-gray-900'>About Alternun</h1>

        {/* Blockquote description for AI context */}
        <blockquote className='text-xl text-gray-700 border-l-4 border-blue-500 pl-6 mb-12 italic'>
          Alternun is building infrastructure for the regenerative economy, enabling individuals and
          organizations to track, verify, and monetize their positive environmental and social
          contributions through transparent, blockchain-backed systems.
        </blockquote>

        {/* H2 sections for content organization */}
        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Our Mission</h2>
          <p className='text-lg text-gray-700 mb-4'>
            We believe the world needs economic systems that reward genuine sustainability efforts.
            Alternun exists to create proof-of-impact infrastructure that transforms how we measure,
            verify, and incentivize environmental and social contributions.
          </p>
          <p className='text-lg text-gray-700'>
            With our AIRS (Alternun Impact Rating System), we've achieved{' '}
            <strong>+40% growth</strong> in impact-verified users over the past year, establishing
            ourselves as a leader in the regenerative economy movement.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>What We Do</h2>
          <p className='text-lg text-gray-700 mb-6'>
            Alternun provides a comprehensive platform that connects the dots across environmental
            and social impact:
          </p>
          <ul className='space-y-4 text-lg text-gray-700'>
            <li className='flex items-start'>
              <span className='text-blue-500 mr-4 font-bold'>•</span>
              <span>
                <strong>Impact Scoring:</strong> Convert environmental and social actions into
                quantifiable AIRS tokens through our proprietary algorithm
              </span>
            </li>
            <li className='flex items-start'>
              <span className='text-blue-500 mr-4 font-bold'>•</span>
              <span>
                <strong>Multi-Source Integration:</strong> Aggregate data from carbon apps, supply
                chains, IoT sensors, and community platforms
              </span>
            </li>
            <li className='flex items-start'>
              <span className='text-blue-500 mr-4 font-bold'>•</span>
              <span>
                <strong>Blockchain Verification:</strong> Ensure immutable, transparent records
                using distributed ledger technology
              </span>
            </li>
            <li className='flex items-start'>
              <span className='text-blue-500 mr-4 font-bold'>•</span>
              <span>
                <strong>Impact Marketplace:</strong> Enable trading of verified impact tokens with
                ESG-focused organizations
              </span>
            </li>
          </ul>
        </section>

        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Our Values</h2>
          <div className='grid md:grid-cols-2 gap-8'>
            <div>
              <h3 className='text-xl font-semibold mb-3 text-gray-900'>Transparency</h3>
              <p className='text-gray-700'>
                All impact data is verifiable and auditable. We use blockchain to ensure no
                double-counting and complete visibility into how impact is measured and credited.
              </p>
            </div>
            <div>
              <h3 className='text-xl font-semibold mb-3 text-gray-900'>Innovation</h3>
              <p className='text-gray-700'>
                We continuously improve our AIRS methodology and integrate new data sources to
                capture a more complete picture of impact across all domains.
              </p>
            </div>
            <div>
              <h3 className='text-xl font-semibold mb-3 text-gray-900'>Accessibility</h3>
              <p className='text-gray-700'>
                Impact tracking should be available to everyone—from individuals managing personal
                carbon footprints to enterprises monitoring ESG commitments.
              </p>
            </div>
            <div>
              <h3 className='text-xl font-semibold mb-3 text-gray-900'>Interoperability</h3>
              <p className='text-gray-700'>
                Our open API and integration framework enable seamless connection with existing
                systems, making impact tracking a natural extension of existing workflows.
              </p>
            </div>
          </div>
        </section>

        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Key Achievements</h2>
          <div className='grid md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='text-4xl font-bold text-blue-500 mb-2'>+40%</div>
              <p className='text-gray-700 font-semibold'>Year-over-year growth in verified users</p>
            </div>
            <div className='text-center'>
              <div className='text-4xl font-bold text-blue-500 mb-2'>15+</div>
              <p className='text-gray-700 font-semibold'>Countries with active users</p>
            </div>
            <div className='text-center'>
              <div className='text-4xl font-bold text-blue-500 mb-2'>∞</div>
              <p className='text-gray-700 font-semibold'>Possible impact integrations via API</p>
            </div>
          </div>
        </section>

        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Technology Stack</h2>
          <p className='text-lg text-gray-700 mb-4'>
            Built on proven, scalable technologies for maximum reliability and performance:
          </p>
          <div className='bg-gray-100 p-6 rounded-lg'>
            <div className='grid md:grid-cols-2 gap-6 text-gray-700'>
              <div>
                <p className='font-semibold mb-2'>Backend</p>
                <p>Node.js, NestJS, PostgreSQL with Drizzle ORM</p>
              </div>
              <div>
                <p className='font-semibold mb-2'>Mobile</p>
                <p>React Native with Expo for iOS/Android</p>
              </div>
              <div>
                <p className='font-semibold mb-2'>Web</p>
                <p>Next.js with React and Tailwind CSS</p>
              </div>
              <div>
                <p className='font-semibold mb-2'>Infrastructure</p>
                <p>AWS Lambda, RDS, Systems Manager with Supabase</p>
              </div>
            </div>
          </div>
        </section>

        <section className='mb-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Get In Touch</h2>
          <p className='text-lg text-gray-700 mb-6'>
            Have questions about Alternun? Want to partner with us? Interested in contributing to
            the regenerative economy?
          </p>
          <div className='space-y-3'>
            <p className='text-gray-700'>
              <strong>Email:</strong>{' '}
              <a href='mailto:contact@alternun.io' className='text-blue-500 hover:underline'>
                contact@alternun.io
              </a>
            </p>
            <p className='text-gray-700'>
              <strong>Address:</strong> Carrera 7 #71-21, Bogotá, DC, Colombia
            </p>
            <p className='text-gray-700'>
              <strong>GitHub:</strong>{' '}
              <a href='https://github.com/alternun' className='text-blue-500 hover:underline'>
                github.com/alternun
              </a>
            </p>
            <p className='text-gray-700'>
              <strong>LinkedIn:</strong>{' '}
              <a
                href='https://linkedin.com/company/alternun'
                className='text-blue-500 hover:underline'
              >
                linkedin.com/company/alternun
              </a>
            </p>
          </div>
        </section>

        <section className='border-t pt-12'>
          <h2 className='text-3xl font-bold mb-4 text-gray-900'>Community</h2>
          <p className='text-lg text-gray-700'>
            Alternun is open source. We believe in transparency and welcome contributions from
            developers, researchers, and impact enthusiasts worldwide.
          </p>
          <p className='text-lg text-gray-700 mt-4'>
            Check out our{' '}
            <a
              href='https://github.com/alternun/alternun'
              className='text-blue-500 hover:underline'
            >
              GitHub repository
            </a>{' '}
            to contribute code, report issues, or explore our architecture.
          </p>
        </section>
      </div>
    </main>
  );
}
