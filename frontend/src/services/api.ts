/**
 * API client for standard non-streaming endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check returned HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to check health:', err);
    throw err;
  }
}

export async function cancelGeneration(requestId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/generations/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Cancel request failed with HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to notify backend of cancellation for request ${requestId}:`, err);
    return null;
  }
}
