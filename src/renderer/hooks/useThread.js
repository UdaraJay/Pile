import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import * as fileOperations from '../utils/fileOperations';
import { getPost } from './usePostHelpers';

function useThread() {
  const { getCurrentPilePath } = usePilesContext();

  const getThread = useCallback(
    async (parentPostPath) => {
      if (!parentPostPath) return;
      let _thread = [];
      const fullPath = getCurrentPilePath(parentPostPath);
      const freshPost = await getPost(fullPath);
      const replies = freshPost?.data?.replies || [];
      _thread.push(freshPost);

      for (const replyPath of replies) {
        const path = getCurrentPilePath(replyPath);
        const reply = await getPost(path);
        _thread.push(reply);
      }

      return _thread;
    },
    [getCurrentPilePath]
  );

  return {
    getThread,
  };
}

export default useThread;
