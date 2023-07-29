import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import * as fileOperations from '../utils/fileOperations';
import { useIndexContext } from 'renderer/context/IndexContext';
import OpenAI from 'openai';

function useAI() {
  const [ai, setAi] = useState(null);

  useEffect(() => {
    const openaiInstance = new OpenAI({
      apiKey: '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',
    });
    setAi(openaiInstance);
  }, []);

  return ai;
}

export default useAI;
