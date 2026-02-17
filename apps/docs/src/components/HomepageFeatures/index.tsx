import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'DIGITAL GOLD MINING',
    icon: '⛏️',
    description: (
      <>
        Transforming gold reserves into a secure store of value that generates liquidity while
        preventing environmental harm applying regenerative finance.
      </>
    ),
  },
  {
    title: 'Sustainable Practices',
    icon: '🌱',
    description: (
      <>
        Stopping the environmental damage caused by traditional gold mining by developing
        regenerative projects in areas susceptible to exploitation.
      </>
    ),
  },
  {
    title: 'Community Engagement',
    icon: '🤝',
    description: (
      <>
        Engaging with the community is at the heart of what we do, fostering collaboration and
        support.
      </>
    ),
  },
];

function Feature({ title, icon, description }: FeatureItem) {
  return (
    <motion.div
      className={clsx('col col--4')}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      viewport={{ once: true }}
    >
      <div className={styles.featureCard}>
        <motion.div
          className={styles.iconContainer}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className={styles.featureIcon}
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          >
            {icon}
          </motion.span>
        </motion.div>
        <div className={styles.featureContent}>
          <Heading as='h3' className={styles.featureTitle}>
            {title}
          </Heading>
          <p className={styles.featureDescription}>{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function HomepageFeatures(): React.ReactElement {
  return (
    <section className={styles.features}>
      <div className='container'>
        <motion.div
          className='row'
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
