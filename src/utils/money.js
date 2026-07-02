// Money helpers. Amounts are stored as floats, so every write rounds to the
// cent and every balance check compares against the same half-cent tolerance
// instead of an exact zero.

// Half a cent: anything below this is floating-point noise; anything at or
// above it is a real imbalance (amounts are entered with 2 decimals).
export const EPSILON = 0.005;

// Round to the cent. Inputs are always sums of 2-decimal values, so they can
// never land near a rounding midpoint and the simple form is safe.
export const round2 = (n) => Math.round(n * 100) / 100;
