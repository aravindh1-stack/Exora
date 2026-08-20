export function formatTimeAgo(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-indigo-500',
];

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export const DEPARTMENTS_LIST = [
  'CSE',
  'ECE',
  'EEE',
  'IT',
  'MECH',
  'CIVIL',
  'AIDS',
  'AIML',
];

export function normalizeDepartment(dept: string | null | undefined): string {
  if (!dept) return 'CSE';
  const clean = dept.trim().toUpperCase();

  if (clean.includes('CSE') || clean.includes('COMPUTER') || clean.includes('COMP')) return 'CSE';
  if (clean.includes('ECE') || clean.includes('ELECTRONIC') || clean.includes('COMM')) return 'ECE';
  if (clean.includes('EEE') || clean.includes('ELECTRICAL')) return 'EEE';
  if (clean.includes('IT') || clean.includes('INFO') || clean.includes('INFORMATION')) return 'IT';
  if (clean.includes('MECH') || clean.includes('MECHANICAL')) return 'MECH';
  if (clean.includes('CIVIL')) return 'CIVIL';
  if (clean.includes('AIDS') || clean.includes('DATA SCIENCE')) return 'AIDS';
  if (clean.includes('AIML') || clean.includes('MACHINE LEARNING')) return 'AIML';

  return clean;
}
