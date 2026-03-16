'use strict';

/**
 * Utility functions for Daily Status handlers.
 */

// Converts "MM/DD/YYYY" to "YYYY/MM/DD"
function mmddyyyyToYyyymmdd(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split('/');
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}/${mm.padStart(2, '0')}/${dd.padStart(2, '0')}`;
}

// Converts "MM-dd-yyyy" to "YYYY/MM/DD"
function mmddyyyyDashToYyyymmdd(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split('-');
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}/${mm.padStart(2, '0')}/${dd.padStart(2, '0')}`;
}

// Converts "yyyy-mm-dd" to "YYYY/MM/DD"
function yyyymmddDashToYyyymmddSlash(dateStr) {
  if (!dateStr) return null;
  const [yyyy, mm, dd] = dateStr.split('-');
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}/${mm.padStart(2, '0')}/${dd.padStart(2, '0')}`;
}

// Validates basic MM/DD/YYYY format
function isValidMmDdYyyy(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const [mm, dd, yyyy] = parts;
  return !!(mm && dd && yyyy && mm.length <= 2 && dd.length <= 2 && yyyy.length === 4);
}

module.exports = {
  mmddyyyyToYyyymmdd,
  mmddyyyyDashToYyyymmdd,
  yyyymmddDashToYyyymmddSlash,
  isValidMmDdYyyy,
};

