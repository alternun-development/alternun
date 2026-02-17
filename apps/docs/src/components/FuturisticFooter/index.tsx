import React from 'react';
import { motion } from 'framer-motion';
import styles from './styles.module.css';

const FuturisticFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerBackground}>
        <div className={styles.gridPattern}></div>
        <div className={styles.gradientOverlay}></div>
      </div>

      <div className='container'>
        <motion.div
          className={styles.footerContent}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className='row'>
            <div className='col col--12'>
              <motion.div
                className={styles.footerLogo}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <img
                  src='/img/alternun-black.svg'
                  alt='Alternun Logo'
                  className={styles.footerLogoImg}
                />
                <div className={styles.footerBrand}>
                  <h3 className={styles.brandName}>ALTERNUN</h3>
                  <p className={styles.brandTagline}>#ReDeFine the future</p>
                </div>
              </motion.div>
            </div>
          </div>

          <div className='row'>
            <div className='col col--12'>
              <motion.div
                className={styles.footerLinks}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className={styles.linkSection}>
                  <h4 className={styles.linkTitle}>Product</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/docs/category/basics'>
                        Documentation
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/blog'>
                        Blog
                      </motion.a>
                    </li>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://alternun.io'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Website
                      </motion.a>
                    </li>
                  </ul>
                </div>

                <div className={styles.linkSection}>
                  <h4 className={styles.linkTitle}>Community</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://github.com/alternun-development'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        GitHub
                      </motion.a>
                    </li>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://linktr.ee/Alternun'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Linktree
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/docs'>
                        Support
                      </motion.a>
                    </li>
                  </ul>
                </div>

                <div className={styles.linkSection}>
                  <h4 className={styles.linkTitle}>Legal</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/privacy'>
                        Privacy Policy
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/terms'>
                        Terms of Service
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/cookies'>
                        Cookies Policy
                      </motion.a>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            className={styles.footerBottom}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className='row'>
              <div className='col col--12'>
                <div className={styles.copyright}>
                  <p>&copy; {currentYear} Alternun. All rights reserved.</p>
                  <div className={styles.footerTech}>
                    <span className={styles.techBadge}>Built with ❤️ using Docusaurus</span>
                    <span className={styles.techBadge}>Powered by ReDeFi</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default FuturisticFooter;
