/// <reference lib="webworker" />
import { rankCards } from '../utils/ismcts';
import type { MCTSInput } from '../utils/ismcts';

self.onmessage = (e: MessageEvent<MCTSInput>) => {
  const result = rankCards(e.data);
  self.postMessage(result);
};
