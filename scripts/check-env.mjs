import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const sheetId = process.env.GOOGLE_SHEET_ID;

console.log('CLIENT_ID set:', !!clientId && clientId.length > 10);
console.log('CLIENT_SECRET set:', !!clientSecret && clientSecret.length > 10);
console.log('SHEET_ID set:', !!sheetId && sheetId.length > 10);
