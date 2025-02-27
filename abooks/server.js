import { resolve } from 'path';
import cron from 'node-cron';
import { checkAndCreateDir } from './helpers/core/file-system.js';

import './config/environment.js';
import './config/seeders.js';
import './config/database.js';

import app from './app.js';

const dirname = resolve();

// INITIAL SEEDING
const DIR = [
  `${dirname}/uploads`,
  `${dirname}/public`,
  `${dirname}/uploads/temp`,
  `${dirname}/uploads/author-image`,
  `${dirname}/uploads/instructor-image`,
  `${dirname}/uploads/blog`,
  `${dirname}/uploads/books`,
  `${dirname}/uploads/exam`,
  `${dirname}/uploads/unzipped-books`,
  `${dirname}/uploads/book-images`,
  `${dirname}/uploads/chapter-images`,
  `${dirname}/uploads/user-images`,
  `${dirname}/uploads/blog-images`,
  `${dirname}/uploads/book-instructions`,
  `${dirname}/uploads/test`,
];

checkAndCreateDir(DIR);

const PORT = process.env.PORT || 3000;

// CRON JOB every 1 day
cron.schedule('0 0 * * *', async () => {
  console.log('running a task every day');
});

app.listen(PORT);
