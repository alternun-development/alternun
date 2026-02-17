import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className='container'>
        <Heading as='h1' className='hero__title'>
          {siteConfig.title}
        </Heading>
        <p className='hero__subtitle'>
          <a
            href='https://x.com/search?q=%23ReDeFi&src=typed_query'
            id='ReDeFine'
            className={styles.rainbowText}
          >
            #ReDeFine
          </a>{' '}
          the future with us
        </p>

        <div className={styles.buttons}>
          <Link
            className={clsx('button button--secondary button--lg', styles.exploreButton)}
            to='/docs/intro'
          >
            Explore Docs - 5min ⏱️
          </Link>{' '}
          &nbsp; &nbsp;
          <Link
            className={clsx('button button--lg', styles.craftButton)}
            to='/docs/Craft-the-Future/intro'
          >
            <span className={styles.defaultText}>Craft the Future 🎨</span>
            <span className={styles.hoverText}> Join now!</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`${siteConfig.title}`} description='#ReDeFine the future with us'>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
