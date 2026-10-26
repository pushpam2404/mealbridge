// Rough, commonly cited conversion factors used for the impact dashboard.
export const KG_PER_SERVING = 0.4;
export const CO2_PER_KG = 2.5; // kg CO2e avoided per kg of food not landfilled

export function kgFor({ quantity, unit, estServings }) {
  if (unit === 'kg') return quantity;
  return estServings * KG_PER_SERVING;
}

export function summarize({ servings = 0, kg = 0, ...rest }) {
  const roundedKg = Math.round(kg * 10) / 10;
  return {
    ...rest,
    meals: Math.round(servings),
    kg: roundedKg,
    co2: Math.round(roundedKg * CO2_PER_KG * 10) / 10,
  };
}
