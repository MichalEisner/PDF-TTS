/**
 * CloudProcessor.ts
 * Pomocník pro odesílání úloh na pozadí (Pipedream / Google Apps Script)
 */

interface CloudJobData {
  text: string;
  email: string;
  fileName: string;
  type: 'PREKLAD' | 'TTS';
  targetLanguage?: string;
  author?: string;
}

// Zde vloží uživatel svou Pipedream nebo GAS URL
const CLOUD_WEBHOOK_URL = "https://eo1a69rwb0fkzcb.m.pipedream.net"; 

export const sendToCloudBackground = async (data: CloudJobData): Promise<boolean> => {
  if (!CLOUD_WEBHOOK_URL) {
    console.warn("CloudProcessor: Chybí CLOUD_WEBHOOK_URL. Prosím, nastavte ji v src/utils/CloudProcessor.ts");
    return false;
  }

  try {
    const response = await fetch(CLOUD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'PDF-TTS Web App'
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("CloudProcessor: Chyba při odesílání do cloudu:", error);
    return false;
  }
};
