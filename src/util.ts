export const unwrap = <T>(item: T | undefined | null, message: string): T => {
  if (item == null) throw new Error(message);

  return item;
};
