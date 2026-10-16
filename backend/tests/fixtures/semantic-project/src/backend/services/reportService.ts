const db = {
  insert: async (data: any) => ({ id: 1, ...data }),
  select: async (id: string) => ({ id })
};

export async function createReport(data: any) {
  // Database INSERT
  return await db.insert({ target: 'reports', data });
}

export async function getReport(id: string) {
  return await db.select(id);
}

export function intentionallyUnusedFunction() {
  console.log('never called');
}
