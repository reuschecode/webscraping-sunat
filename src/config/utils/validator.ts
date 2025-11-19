export const isValidRuc = (ruc: string): boolean => {
  return /^\d{11}$/.test(ruc);
};
