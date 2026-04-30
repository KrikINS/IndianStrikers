declare global {
  const __BUILD_TIME__: string;
}

const formatBuildDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${mins}`;
  } catch (e) {
    return 'manual';
  }
};

const BUILD_SUFFIX = typeof __BUILD_TIME__ !== 'undefined' ? formatBuildDate(__BUILD_TIME__) : 'dev';

export const APP_VERSION = `v2.7.1-20260430-Final`;
