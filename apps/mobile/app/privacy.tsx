import { useRouter, } from 'expo-router';
import React, { useEffect, useState, } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { useAppPreferences, } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface TextSpan {
  text: string;
  bold?: boolean;
}

/**
 * Very simple markdown formatter for policy documents:
 * - **text** → bold text
 */
function parseMarkdownParagraph(text: string,): (TextSpan | string)[] {
  const spans: (TextSpan | string)[] = [];
  let current = '';
  let inBold = false;
  let i = 0;

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      if (current) {
        if (inBold) {
          spans.push({ text: current, bold: true, },);
        } else {
          spans.push(current,);
        }
        current = '';
      }
      inBold = !inBold;
      i += 2;
    } else {
      current += text[i];
      i += 1;
    }
  }

  if (current) {
    if (inBold) {
      spans.push({ text: current, bold: true, },);
    } else {
      spans.push(current,);
    }
  }

  return spans;
}

/**
 * Render a single paragraph with inline bold formatting
 */
function renderParagraph(
  text: string,
  index: number,
  textColor: string,
  accentColor: string,
): React.JSX.Element {
  const spans = parseMarkdownParagraph(text,);

  return (
    <Text key={index} style={[styles.paragraph, { color: textColor, },]}>
      {spans.map((span, idx,) =>
        typeof span === 'string' ? (
          <Text key={idx}>{span}</Text>
        ) : (
          <Text key={idx} style={{ fontWeight: 'bold', color: accentColor, }}>
            {span.text}
          </Text>
        ),
      )}
    </Text>
  );
}

export default function PrivacyPage(): React.JSX.Element {
  const router = useRouter();
  const { themeMode, language, } = useAppPreferences();
  const [content, setContent,] = useState<string | null>(null,);
  const [loading, setLoading,] = useState(true,);
  const [error, setError,] = useState<string | null>(null,);

  const isDark = themeMode === 'dark';
  const textColor = isDark ? '#effff9' : '#0b2d31';
  const accentColor = isDark ? '#1ee6b5' : '#0b5a5f';

  useEffect(() => {
    const fetchContent = async (): Promise<void> => {
      try {
        setLoading(true,);
        const response = await fetch(`${API_URL}/v1/legal/privacy?locale=${language ?? 'en'}`,);

        if (!response.ok) {
          throw new Error('Failed to fetch privacy policy',);
        }

        const data = (await response.json()) as { content: string };
        setContent(data.content,);
        setError(null,);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content',);
      } finally {
        setLoading(false,);
      }
    };

    void fetchContent();
  }, [language,],);

  const paragraphs = content ? content.split(/\n\n+/,).filter((p,) => p.trim().length > 0,) : [];

  return (
    <ScreenShell headerLabel='Privacy Policy' onBackPress={() => router.back()} hideFooter>
      <ScrollView
        style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#ffffff', },]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size='large' color={accentColor} />
            <Text style={[styles.loadingText, { color: textColor, },]}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: '#ef4444', },]}>Error: {error}</Text>
          </View>
        ) : paragraphs.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: textColor, },]}>No content available</Text>
          </View>
        ) : (
          <View>
            {paragraphs.map((para, idx,) => renderParagraph(para, idx, textColor, accentColor,),)}
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
},);
