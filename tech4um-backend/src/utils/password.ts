import * as bcrypt from 'bcrypt';

export const validatePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
