export function formatDisplayName(name, fallback = '') {
  if (typeof name !== 'string') return fallback;

  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (!normalizedName) return fallback;

  return normalizedName
    .split(' ')
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase())
    .join(' ');
}
