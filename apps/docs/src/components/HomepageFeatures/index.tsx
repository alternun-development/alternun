import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import innovative from './innovative.svg'
import sustainable from './sustainable.svg'
import community from './community.svg'

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};



const FeatureList: FeatureItem[] = [
  {
    title: 'DIGITAL GOLD MINING', // Updated title
    Svg: innovative, // Updated to use My3DComponent
    description: (
      <>
        Transforming gold reserves into a secure store of value that generates liquidity while preventing environmental harm applying regenerative finance. {/* Updated description */}
      </>
    ),
  },
  {
    title: 'Sustainable Practices',
    Svg: sustainable, // Updated to use My3DComponent
    description: (
      <>
        Stopping the environmental damage caused by traditional gold mining by developing regenerative projects in areas susceptible to exploitation. {/* Updated description */}
      </>
    ),
  },
  {
    title: 'Community Engagement',
    Svg: community, // Updated to use My3DComponent
    description: (
      <>
        Engaging with the community is at the heart of what we do, fostering collaboration and support.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
          <Svg className={styles.featureSvg} role="img" /> {/* Ensure Svg is a valid 3D component */}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
