const API_URL = 'https://script.google.com/macros/s/AKfycbx3xrrgdQ_OtwRL8DVHW4bR60kCx5TUUVrn6jW3sdi9NZ66bPLoO7H5pQ1GzJ_GQ4Hi/exec';

export async function fetchDashboardData(action, days) {
  try {
    const params = new URLSearchParams({
      action,
      days: days || 7,
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    throw error;
  }
}