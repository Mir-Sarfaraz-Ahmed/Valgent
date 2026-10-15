export const authenticateToken = (req: any, res: any, next: any) => {
  // dummy auth
  next();
};

export const fakeAuthMiddleware = (req: any, res: any, next: any) => {
  // suggests authentication but does not authenticate, and is never used
  next();
};
