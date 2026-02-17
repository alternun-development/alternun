import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import InteractiveNeuralVortex from '@site/src/components/InteractiveNeuralVortex';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import FuturisticFooter from '@site/src/components/FuturisticFooter';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description='Transforming Gold Reserves into Digital Value with Sustainable Mining Solutions'
    >
      <main>
        <InteractiveNeuralVortex />
        <HomepageFeatures />
      </main>
      <FuturisticFooter />
    </Layout>
  );
}
