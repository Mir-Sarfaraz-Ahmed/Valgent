
import { db } from './db';
export function saveReport(data) {
  db.insert('reports', data);
}
