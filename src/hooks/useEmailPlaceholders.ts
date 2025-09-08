import { useState } from 'react';
import { replacePlaceholders } from '@/utils/emailPlaceholders';

export function useEmailPlaceholders() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processTemplate = async (
    template: string,
    storeId: string,
    launchId: string,
    additionalPlaceholders: Record<string, string> = {}
  ): Promise<string> => {
    setIsProcessing(true);
    try {
      const processedContent = await replacePlaceholders(
        template,
        storeId,
        launchId,
        additionalPlaceholders
      );
      return processedContent;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processTemplate,
    isProcessing
  };
}