// Constants
const SPREADSHEET_ID = process.env['NEXT_PUBLIC_GOOGLE_SHEETS_ID'] || '';
const SHEET_NAME = 'Sheet1';
const API_KEY = process.env['NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY'] || '';

// Types
export interface DownloadData {
  tmdbId: string;
  size: string;
  downloadLink: string;
}

export async function getDownloadData(): Promise<DownloadData[]> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.values || !Array.isArray(data.values)) {
      throw new Error('Invalid data format from Google Sheets');
    }

    // Get headers from first row
    const headers = data.values[0];
    const tmdbIdIndex = headers.indexOf('TMDB ID');
    const sizeIndex = headers.indexOf('Size');
    const downloadLinkIndex = headers.indexOf('Download Link');

    // Validate required columns exist
    if (tmdbIdIndex === -1 || sizeIndex === -1 || downloadLinkIndex === -1) {
      throw new Error('Required columns not found in spreadsheet');
    }

    // Process only required columns
    return data.values.slice(1).map((row: any[]) => {
      const tmdbId = row[tmdbIdIndex]?.toString().trim();
      const size = row[sizeIndex]?.toString().trim();
      const downloadLink = row[downloadLinkIndex]?.toString().trim();

      // Only include rows that have all required data
      if (!tmdbId || !size || !downloadLink) {
        return null;
      }

      return {
        tmdbId,
        size,
        downloadLink
      };
    }).filter((item: DownloadData | null): item is DownloadData => item !== null);

  } catch (error) {
    console.error('Error fetching download data:', error);
    throw error;
  }
} 