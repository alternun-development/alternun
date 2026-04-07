/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import React, { useState } from 'react';
import { HelpCircle, MessageCircle, Mail, MessageSquare, Phone, ArrowLeft } from 'lucide-react';
import styles from './styles.module.css';

interface SupportButtonWebProps {
  supportEmail: string;
}

const SupportButtonWeb = ({ supportEmail }: SupportButtonWebProps): React.JSX.Element => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
  const [showChatOptions, setShowChatOptions] = useState<boolean>(false);

  const handleOpenChatOptions = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(true);
  };

  const handleTelegram = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    window.open('https://t.me/alternun_io', '_blank');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(false);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setDialogOpen(false);
  };

  const handleWhatsAppMessage = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    window.open('https://wa.me/?text=Hello%20Alternun%20Support', '_blank');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(false);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setDialogOpen(false);
  };

  const handleWhatsAppGroup = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    window.open('https://chat.whatsapp.com/IcX8nBsx1Nq4B8nOTDoeLH', '_blank');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(false);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setDialogOpen(false);
  };

  const handleLiveChat = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    window.open('https://alternun.io/support', '_blank');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(false);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setDialogOpen(false);
  };

  const handleSendEmail = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    window.location.href = `mailto:${supportEmail}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setDialogOpen(false);
  };

  const handleBack = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setShowChatOptions(false);
  };

  if (!dialogOpen) {
    return (
      <button
        className={styles.supportButton}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
        onClick={() => setDialogOpen(true)}
        title='Open support'
        aria-label='Open support'
      >
        <HelpCircle size={18} />
      </button>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={styles.backdrop}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
        onClick={() => setDialogOpen(false)}
        role='presentation'
      />

      {/* Dialog */}
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.dialogHeader}>
          <h3 className={styles.dialogTitle}>How can we help?</h3>
          <button
            className={styles.closeButton}
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
            onClick={() => setDialogOpen(false)}
            aria-label='Close'
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className={styles.optionsContainer}>
          {!showChatOptions ? (
            <>
              {/* Chat option */}
              <button className={styles.optionButton} onClick={handleOpenChatOptions}>
                <div className={styles.optionIconWrapper}>
                  <MessageCircle size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Chat with us</h4>
                  <p className={styles.optionDescription}>
                    Start a conversation with our support team
                  </p>
                </div>
              </button>

              {/* Email option */}
              <button className={styles.optionButton} onClick={handleSendEmail}>
                <div className={styles.optionIconWrapper}>
                  <Mail size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Send an email</h4>
                  <p className={styles.optionDescription}>{supportEmail}</p>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Back button */}
              <button className={styles.backButton} onClick={handleBack}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              {/* Telegram option */}
              <button className={styles.optionButton} onClick={handleTelegram}>
                <div className={styles.optionIconWrapper}>
                  <MessageSquare size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Join Telegram</h4>
                  <p className={styles.optionDescription}>Chat with our community</p>
                </div>
              </button>

              {/* WhatsApp Message option */}
              <button className={styles.optionButton} onClick={handleWhatsAppMessage}>
                <div className={styles.optionIconWrapper}>
                  <MessageCircle size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Send WhatsApp message</h4>
                  <p className={styles.optionDescription}>Message us directly</p>
                </div>
              </button>

              {/* WhatsApp Group option */}
              <button className={styles.optionButton} onClick={handleWhatsAppGroup}>
                <div className={styles.optionIconWrapper}>
                  <MessageCircle size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Join WhatsApp group</h4>
                  <p className={styles.optionDescription}>Connect with our community</p>
                </div>
              </button>

              {/* Live Chat option */}
              <button className={styles.optionButton} onClick={handleLiveChat}>
                <div className={styles.optionIconWrapper}>
                  <Phone size={20} />
                </div>
                <div className={styles.optionContent}>
                  <h4 className={styles.optionTitle}>Start live chat</h4>
                  <p className={styles.optionDescription}>Chat with support agent</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportButtonWeb;
