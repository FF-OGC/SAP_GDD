// Upper envelope from a fresh counter: full daily quota, no chase win.
// Extra rolls after quota keep this rate; maxShot clamps chance, not counter.
export function chaseChance(config, shots) {
  if (!config.enabled || shots <= 1 || config.maxShot <= 0) return 0;
  return Math.max(config.minChance, Math.min(config.step * (Math.min(shots, config.maxShot) - 1) ** config.power, config.maxChance));
}

export function dailyChaseCeilings(config, limitedChance = 0) {
  const plateauDay = Math.ceil(config.maxShot / config.shotsPerDay);
  return Array.from({ length: plateauDay + 1 }, (_, index) => {
    const day = index + 1;
    const shots = day * config.shotsPerDay;
    const chance = chaseChance(config, shots);
    return { day, shots, effectiveShot: Math.min(shots, config.maxShot), chance,
      chasePerOpen: (1 - limitedChance) * chance,
      eitherPerOpen: limitedChance + (1 - limitedChance) * chance };
  });
}
