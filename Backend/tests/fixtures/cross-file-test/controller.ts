
import { saveReport } from './service';
export function createReport(req, res) {
  saveReport(req.body);
  res.send('ok');
}
