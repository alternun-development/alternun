import React, { useState, } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { Award, ExternalLink, X, Share2, Download, } from 'lucide-react-native';
import { SBTCertificate, } from './types';

interface CertificateGalleryProps {
  certificates: SBTCertificate[];
}

function formatDate(date: Date,): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', },);
}

export default function CertificateGallery({ certificates, }: CertificateGalleryProps,) {
  const [selected, setSelected,] = useState<SBTCertificate | null>(null,);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>SBT Certificates</Text>
          <Text style={styles.sectionSubtitle}>{certificates.length} issued certificates</Text>
        </View>
        <View style={styles.badgeCount}>
          <Award size={12} color='#1ccba1' />
          <Text style={styles.badgeCountText}>{certificates.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {certificates.map((cert,) => (
          <TouchableOpacity
            key={cert.id}
            style={styles.certCard}
            onPress={() => setSelected(cert,)}
            activeOpacity={0.85}
          >
            <View style={styles.certCardGlow} />
            <View style={styles.certHeader}>
              <View style={styles.certIconWrapper}>
                <Award size={20} color='#1ccba1' />
              </View>
              <View style={styles.certBadge}>
                <Text style={styles.certBadgeText}>SBT</Text>
              </View>
            </View>
            <Text style={styles.certProject} numberOfLines={2}>
              {cert.projectName}
            </Text>
            <View style={styles.certImpact}>
              <Text style={styles.certImpactValue}>{cert.impactAmount}</Text>
              <Text style={styles.certImpactUnit}>{cert.impactUnit}</Text>
            </View>
            <Text style={styles.certDate}>{formatDate(cert.date,)}</Text>
            <View style={styles.certViewBtn}>
              <Text style={styles.certViewBtnText}>View Certificate</Text>
              <ExternalLink size={10} color='#1ccba1' />
            </View>
          </TouchableOpacity>
        ),)}
      </ScrollView>

      {/* Certificate Detail Modal */}
      <Modal visible={!!selected} transparent animationType='fade'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Certificate Details</Text>
              <TouchableOpacity onPress={() => setSelected(null,)}>
                <X size={20} color='rgba(232,232,255,0.6)' />
              </TouchableOpacity>
            </View>
            {selected && (
              <>
                <View style={styles.certDetailCard}>
                  <View style={styles.certDetailIconRow}>
                    <View style={styles.certDetailIconBig}>
                      <Award size={32} color='#1ccba1' />
                    </View>
                    <View style={styles.certDetailInfo}>
                      <Text style={styles.certDetailId}>{selected.id}</Text>
                      <View style={styles.certDetailBadge}>
                        <Text style={styles.certDetailBadgeText}>Soul-Bound Token</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.certDetailProject}>{selected.projectName}</Text>
                  <View style={styles.certDetailImpact}>
                    <Text style={styles.certDetailImpactNum}>{selected.impactAmount}</Text>
                    <Text style={styles.certDetailImpactUnit}> {selected.impactUnit} offset</Text>
                  </View>
                </View>

                <View style={styles.metadataSection}>
                  {Object.entries(selected.metadata,).map(([key, val,],) => (
                    <View key={key} style={styles.metaRow}>
                      <Text style={styles.metaKey}>
                        {key.charAt(0,).toUpperCase() + key.slice(1,)}
                      </Text>
                      <Text style={styles.metaValue}>{val}</Text>
                    </View>
                  ),)}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Issue Date</Text>
                    <Text style={styles.metaValue}>{formatDate(selected.date,)}</Text>
                  </View>
                </View>

                <View style={styles.hashSection}>
                  <Text style={styles.hashSectionLabel}>On-Chain Reference</Text>
                  <Text style={styles.hashValue} numberOfLines={1}>
                    {selected.onChainRef}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                    <Share2 size={14} color='rgba(232,232,255,0.7)' />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                    <Download size={14} color='rgba(232,232,255,0.7)' />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeModalBtn}
                    onPress={() => setSelected(null,)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeModalBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createTypographyStyles({
  section: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#e8e8ff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.02,
    fontFamily: 'Sculpin-Bold',
  },
  sectionSubtitle: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  badgeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,203,161,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeCountText: {
    color: '#1ccba1',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 12,
  },
  certCard: {
    width: 180,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.18)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 8, },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  certCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(28,203,161,0.06)',
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  certIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(28,203,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certBadge: {
    backgroundColor: 'rgba(28,203,161,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  certBadgeText: {
    color: '#1ccba1',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  certProject: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
    fontFamily: 'Sculpin-Bold',
  },
  certImpact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  certImpactValue: {
    color: '#1ccba1',
    fontSize: 20,
    fontWeight: '700',
  },
  certImpactUnit: {
    color: 'rgba(28,203,161,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  certDate: {
    color: 'rgba(232,232,255,0.35)',
    fontSize: 11,
    marginBottom: 12,
  },
  certViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,203,161,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.2)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  certViewBtnText: {
    color: '#1ccba1',
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.9)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#e8e8ff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  certDetailCard: {
    backgroundColor: 'rgba(28,203,161,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.18)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  certDetailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  certDetailIconBig: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(28,203,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certDetailInfo: {
    gap: 6,
  },
  certDetailId: {
    color: 'rgba(232,232,255,0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  certDetailBadge: {
    backgroundColor: 'rgba(28,203,161,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  certDetailBadgeText: {
    color: '#1ccba1',
    fontSize: 10,
    fontWeight: '600',
  },
  certDetailProject: {
    color: '#e8e8ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'Sculpin-Bold',
  },
  certDetailImpact: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  certDetailImpactNum: {
    color: '#1ccba1',
    fontSize: 24,
    fontWeight: '700',
  },
  certDetailImpactUnit: {
    color: 'rgba(28,203,161,0.7)',
    fontSize: 13,
  },
  metadataSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaKey: {
    color: 'rgba(232,232,255,0.45)',
    fontSize: 12,
  },
  metaValue: {
    color: '#e8e8ff',
    fontSize: 12,
    fontWeight: '600',
  },
  hashSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  hashSectionLabel: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 11,
    marginBottom: 6,
  },
  hashValue: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonText: {
    color: 'rgba(232,232,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalBtn: {
    flex: 1,
    backgroundColor: '#1ccba1',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#050510',
    fontSize: 13,
    fontWeight: '700',
  },
},);
