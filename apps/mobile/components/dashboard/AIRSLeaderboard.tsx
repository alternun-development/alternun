import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  airsBalance: number;
  airsLifetimeEarned: number;
  isMe: boolean;
}

interface LeaderboardResult {
  entries: LeaderboardEntry[];
  requestingUserEntry: LeaderboardEntry | null;
}

interface AuthClient {
  getSessionToken(): Promise<string | null>;
}

interface AIRSLeaderboardProps {
  isDark: boolean;
  client: AuthClient;
  signedIn: boolean;
}

function RankBadge({ rank, isDark }: { rank: number; isDark: boolean }): React.JSX.Element {
  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const rankColor =
    rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : accent;

  return (
    <View style={[styles.rankBadge, { borderColor: `${rankColor}40` }]}>
      <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
    </View>
  );
}

export default function AIRSLeaderboard({
  isDark,
  client,
  signedIn,
}: AIRSLeaderboardProps): React.JSX.Element {
  const [result, setResult] = useState<LeaderboardResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = isDark ? '#1EE6B5' : '#0d9488';
  const bg = isDark ? '#050f0c' : '#f0fdf9';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,90,95,0.12)';
  const textColor = isDark ? '#e8fff6' : '#0b2d31';
  const mutedColor = isDark ? 'rgba(232,255,246,0.55)' : 'rgba(11,45,49,0.55)';
  const meBg = isDark ? 'rgba(30,230,181,0.08)' : 'rgba(13,148,136,0.06)';
  const meBorder = isDark ? 'rgba(30,230,181,0.20)' : 'rgba(13,148,136,0.18)';

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!signedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await client.getSessionToken();
      if (!token) {
        setError('No session token available');
        return;
      }

      const response = await fetch(`${resolveMobileApiBaseUrl()}/v1/airs/leaderboard?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError(`Failed to load leaderboard (${response.status})`);
        return;
      }

      const data = (await response.json()) as LeaderboardResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [client, signedIn]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const topEntries = result?.entries.filter((e) => e.rank <= 20) ?? [];
  const myEntry = result?.requestingUserEntry ?? null;
  const myRankOutsideTop = myEntry && myEntry.rank > 20;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Top AIRS</Text>
          <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
            Ranking global de acumuladores
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => void fetchLeaderboard()}
          activeOpacity={0.7}
          style={[styles.refreshBtn, { borderColor: cardBorder }]}
        >
          <Text style={[styles.refreshText, { color: accent }]}>↻</Text>
        </TouchableOpacity>
      </View>

      {!signedIn ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Inicia sesión para ver el ranking de AIRS
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.loadingBox}>
            <ActivityIndicator color={accent} />
          </View>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>{error}</Text>
          </View>
        </View>
      ) : topEntries.length === 0 ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Aún no hay usuarios con AIRS acumulados.
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Table header */}
          <View style={[styles.tableHeader, { backgroundColor: `${accent}0F` }]}>
            <Text style={[styles.thRank, { color: accent }]}>#</Text>
            <Text style={[styles.thName, { color: accent }]}>Usuario</Text>
            <Text style={[styles.thBalance, { color: accent }]}>AIRS</Text>
          </View>

          {topEntries.map((entry, idx) => {
            const isLast = idx === topEntries.length - 1 && !myRankOutsideTop;
            const divColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            return (
              <View
                key={entry.userId}
                style={[
                  styles.row,
                  entry.isMe && { backgroundColor: meBg },
                  !isLast && { borderBottomWidth: 1, borderBottomColor: divColor },
                ]}
              >
                <View style={styles.rankCell}>
                  <RankBadge rank={entry.rank} isDark={isDark} />
                </View>
                <View style={styles.nameCell}>
                  <Text
                    style={[styles.nameText, { color: entry.isMe ? accent : textColor }]}
                    numberOfLines={1}
                  >
                    {entry.displayName}
                  </Text>
                  {entry.isMe && <Text style={[styles.youBadge, { color: accent }]}>TÚ</Text>}
                </View>
                <Text style={[styles.balanceText, { color: entry.isMe ? accent : textColor }]}>
                  {entry.airsBalance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            );
          })}

          {myRankOutsideTop && myEntry && (
            <>
              <View style={[styles.separatorRow, { borderColor: `${accent}30` }]}>
                <Text style={[styles.separatorText, { color: mutedColor }]}>· · ·</Text>
              </View>
              <View
                style={[
                  styles.row,
                  { backgroundColor: meBg, borderWidth: 1, borderColor: meBorder },
                ]}
              >
                <View style={styles.rankCell}>
                  <RankBadge rank={myEntry.rank} isDark={isDark} />
                </View>
                <View style={styles.nameCell}>
                  <Text style={[styles.nameText, { color: accent }]} numberOfLines={1}>
                    {myEntry.displayName}
                  </Text>
                  <Text style={[styles.youBadge, { color: accent }]}>TÚ</Text>
                </View>
                <Text style={[styles.balanceText, { color: accent }]}>
                  {myEntry.airsBalance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = createTypographyStyles({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: 'Sculpin-Bold',
  },
  sectionSubtitle: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    marginTop: 2,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  refreshText: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 28,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thRank: {
    width: 52,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  thName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  thBalance: {
    width: 80,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: 'Sculpin-Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rankCell: {
    width: 52,
  },
  rankBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  rankText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    fontWeight: '800',
  },
  nameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  nameText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  youBadge: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balanceText: {
    width: 80,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    fontFamily: 'Sculpin-Bold',
  },
  separatorRow: {
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  separatorText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 14,
    letterSpacing: 4,
  },
});
