import { useEffect } from 'react';

import { maybeAskForReview, recordAppOpen } from '../utils/reviewPrompt';

const ReviewPrompt = () => {
  useEffect(() => {
    recordAppOpen().catch(() => undefined);
    const id = setTimeout(() => {
      maybeAskForReview().catch(() => undefined);
    }, 2000);
    return () => clearTimeout(id);
  }, []);

  return null;
};

export default ReviewPrompt;
