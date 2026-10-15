
import { createReport } from './controller';
const app = require('express')();
app.post('/report', createReport);
