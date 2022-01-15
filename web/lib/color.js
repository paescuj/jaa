export const defaultBackgroundColor = { r: 200, g: 198, b: 215, a: 1 };

export const convertToHex = ({ r, g, b, a }) => {
  let hex =
    (r | (1 << 8)).toString(16).slice(1) +
    (g | (1 << 8)).toString(16).slice(1) +
    (b | (1 << 8)).toString(16).slice(1) +
    ((a * 255) | (1 << 8)).toString(16).slice(1);
  return `#${hex}`;
};

// See http://www.w3.org/TR/AERT#color-contrast
export const isHighBrightness = ({ r, g, b, a }) =>
  (r * 299 + g * 587 + b * 114) / 1000 > 128 || a < 0.5;
