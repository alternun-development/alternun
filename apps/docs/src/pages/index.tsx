import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import AnimatedHero from '@site/src/components/AnimatedHero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description='Transforming Gold Reserves into Digital Value with Sustainable Mining'
    >
      <AnimatedHero />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
