// Numeric discipline values used in Contest:* sort keys. Kept free of React
// imports so server code and scripts (tsx) can use it.
export const DISCIPLINE_ENUM_VALUES: Record<Discipline, number> = {
  OVERALL: 0,
  TRICKLINE: 1,
  TRICKLINE_AERIAL: 2,
  TRICKLINE_JIB_AND_STATIC: 3,
  TRICKLINE_TRANSFER: 4,
  FREESTYLE_HIGHLINE: 5,
  SPEED: 6,
  SPEED_SHORT: 7,
  SPEED_HIGHLINE: 8,
  ENDURANCE: 9,
  BLIND: 10,
  RIGGING: 11,
  FREESTYLE: 12,
  WALKING: 13,
};
