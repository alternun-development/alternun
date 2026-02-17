import React from 'react';
import { motion } from 'framer-motion';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const FuturisticFooter = () => {
  const { i18n } = useDocusaurusContext();
  const currentYear = new Date().getFullYear();

  // Translations
  const t = {
    en: {
      product: 'Product',
      community: 'Community',
      legal: 'Legal',
      documentation: 'Documentation',
      blog: 'Blog',
      website: 'Website',
      github: 'GitHub',
      linktree: 'Linktree',
      support: 'Support',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      cookies: 'Cookies Policy',
      copyright: `© ${currentYear} Alternun. All rights reserved.`,
      builtWith: 'Built with ❤️ using Docusaurus',
      poweredBy: 'Powered by ReDeFi',
    },
    es: {
      product: 'Producto',
      community: 'Comunidad',
      legal: 'Legal',
      documentation: 'Documentación',
      blog: 'Blog',
      website: 'Sitio Web',
      github: 'GitHub',
      linktree: 'Linktree',
      support: 'Soporte',
      privacy: 'Política de Privacidad',
      terms: 'Términos de Servicio',
      cookies: 'Política de Cookies',
      copyright: `© ${currentYear} Alternun. Todos los derechos reservados.`,
      builtWith: 'Construido con ❤️ usando Docusaurus',
      poweredBy: 'Impulsado por ReDeFi',
    },
    th: {
      product: 'ผลิตภัณฑ์',
      community: 'ชุมชุม',
      legal: 'กฎหมาย',
      documentation: 'เอกสาร',
      blog: 'บล็อก',
      website: 'เว็บไซต์',
      github: 'GitHub',
      linktree: 'Linktree',
      support: 'สนับสนุน',
      privacy: 'นโยบายความเป็นส่วนตัว',
      terms: 'เงื่อนไขการให้บริการ',
      cookies: 'นโยบายคุกกี้',
      copyright: `© ${currentYear} Alternun. สงวนลิขสิทธิ์ทั้งหมด`,
      builtWith: 'สร้างด้วย ❤️ โดยใช้ Docusaurus',
      poweredBy: 'ขับเคลื่อนโดย ReDeFi',
    },
  };

  const lang = i18n.currentLocale || 'en';
  const translations = t[lang as keyof typeof t] || t.en;

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
                  <h4 className={styles.linkTitle}>{translations.product}</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/docs/category/basics'>
                        {translations.documentation}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/blog'>
                        {translations.blog}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://alternun.io'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {translations.website}
                      </motion.a>
                    </li>
                  </ul>
                </div>

                <div className={styles.linkSection}>
                  <h4 className={styles.linkTitle}>{translations.community}</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://github.com/alternun-development'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {translations.github}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a
                        whileHover={{ x: 5 }}
                        href='https://linktr.ee/Alternun'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {translations.linktree}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/docs'>
                        {translations.support}
                      </motion.a>
                    </li>
                  </ul>
                </div>

                <div className={styles.linkSection}>
                  <h4 className={styles.linkTitle}>{translations.legal}</h4>
                  <ul className={styles.linkList}>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/privacy'>
                        {translations.privacy}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/terms'>
                        {translations.terms}
                      </motion.a>
                    </li>
                    <li>
                      <motion.a whileHover={{ x: 5 }} href='/cookies'>
                        {translations.cookies}
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
                  <p>{translations.copyright}</p>
                  <div className={styles.footerTech}>
                    <span className={styles.techBadge}>{translations.builtWith}</span>
                    <span className={styles.techBadge}>{translations.poweredBy}</span>
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
