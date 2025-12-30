import fs from 'fs';
import csv from 'csv-parser';

fs.createReadStream('san_pham_2025-12-30.csv')
    .pipe(csv())
    .on('headers', (headers) => {
        console.log('Headers:', headers);
    })
    .on('data', (data) => {
        console.log('First row:', data);
        process.exit(0);
    });
