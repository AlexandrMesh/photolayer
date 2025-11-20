import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const FIRST_OPEN_KEY = 'rp:firstOpenAt';
const OPENS_COUNT_KEY = 'rp:opensCount';
const LAST_PROMPT_AT_KEY = 'rp:lastPromptAt';
const HAS_REVIEWED_KEY = 'rp:hasReviewed';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

type MaybeAskForReviewOptions = {
  minOpens?: number;
  minDaysSinceFirstOpen?: number;
  minDaysBetweenPrompts?: number;
};

export const recordAppOpen = async (): Promise<void> => {
  const firstOpen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
  if (!firstOpen) {
    await AsyncStorage.setItem(FIRST_OPEN_KEY, String(Date.now()));
  }

  const opensRaw = await AsyncStorage.getItem(OPENS_COUNT_KEY);
  const opensCount = Number(opensRaw || '0') + 1;
  await AsyncStorage.setItem(OPENS_COUNT_KEY, String(opensCount));
};

export const maybeAskForReview = async (options?: MaybeAskForReviewOptions): Promise<boolean | void> => {
  const { minOpens = 5, minDaysSinceFirstOpen = 3, minDaysBetweenPrompts = 7 } = options || {};
  const available = await StoreReview.isAvailableAsync();
  if (!available) return false;

  const hasReviewed = (await AsyncStorage.getItem(HAS_REVIEWED_KEY)) === '1';
  if (hasReviewed) return false;

  const opens = Number((await AsyncStorage.getItem(OPENS_COUNT_KEY)) || '0');
  const firstOpenAt = Number((await AsyncStorage.getItem(FIRST_OPEN_KEY)) || '0');
  const lastPromptAt = Number((await AsyncStorage.getItem(LAST_PROMPT_AT_KEY)) || '0');

  const daysSinceFirstOpen = firstOpenAt ? (Date.now() - firstOpenAt) / MS_IN_DAY : 0;
  const daysSinceLastPrompt = lastPromptAt ? (Date.now() - lastPromptAt) / MS_IN_DAY : Infinity;

  const meetsOpenCount = opens >= minOpens;
  const meetsFirstOpenDays = daysSinceFirstOpen >= minDaysSinceFirstOpen;
  const meetsBetweenPrompts = daysSinceLastPrompt >= minDaysBetweenPrompts;

  if (!meetsOpenCount || !meetsFirstOpenDays || !meetsBetweenPrompts) return false;

  const didRequest = (await StoreReview.requestReview()) as boolean | undefined;
  await AsyncStorage.setItem(LAST_PROMPT_AT_KEY, String(Date.now()));

  if (didRequest === true) {
    await AsyncStorage.setItem(HAS_REVIEWED_KEY, '1');
  }

  return didRequest;
};
