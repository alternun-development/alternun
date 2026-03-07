import {
  createTranslator,
  type AppTranslationNamespace,
  type Translator,
} from '@alternun/i18n';
import { useAppPreferences, } from '../settings/AppPreferencesProvider';

export function useAppTranslation(
  namespace: AppTranslationNamespace = 'mobile',
): Translator {
  const { language, } = useAppPreferences();

  return createTranslator({
    locale: language,
    namespace,
  },);
}
