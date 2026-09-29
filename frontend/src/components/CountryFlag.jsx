import React from 'react';

export const CountryFlag = ({ countryCode, showCode = true }) => {
  if (!countryCode || countryCode === 'Unknown' || countryCode === 'XX') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <span>🌐</span>
        {showCode && <span>--</span>}
      </span>
    );
  }

  const clean = countryCode.trim().toUpperCase();
  let flagEmoji = '🌐';

  if (/^[A-Z]{2}$/.test(clean)) {
    try {
      flagEmoji = String.fromCodePoint(
        ...[...clean].map((char) => 127397 + char.charCodeAt(0))
      );
    } catch {
      flagEmoji = '🌐';
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-mono">
      <span className="text-sm select-none" role="img" aria-label={clean}>
        {flagEmoji}
      </span>
      {showCode && <span>{clean}</span>}
    </span>
  );
};

export default CountryFlag;
