/**
 * Formats enum strings into human-readable labels.
 * Examples:
 *   "CODING_PRACTICE" -> "Coding practice"
 *   "INTERMEDIATE"    -> "Intermediate"
 *   "NOT_STARTED"     -> "Not started"
 *   "IN_PROGRESS"     -> "In progress"
 */
export const formatEnum = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const words = trimmed.toLowerCase().split(/[_\s]+/);
  if (words.length === 0) return '';
  const first = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  const rest = words.slice(1).join(' ');
  return rest ? `${first} ${rest}` : first;
};

