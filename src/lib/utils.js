import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function parseDateInput(value) {
  if (!value || value === 0) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    return new Date(value > 1e11 ? value : value * 1000);
  }
  if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      return new Date(num > 1e11 ? num : num * 1000);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(timestamp) {
  const date = parseDateInput(timestamp);
  if (!date) return 'Nunca';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDateOnly(timestamp) {
  const date = parseDateInput(timestamp);
  if (!date) return 'Nunca';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
