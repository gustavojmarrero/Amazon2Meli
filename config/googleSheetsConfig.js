const { google } = require('googleapis');
require('dotenv').config();

const authenticate = async () => {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  return auth;
};

const sheets = async () => {
  const auth = await authenticate();
  return google.sheets({ version: 'v4', auth });
};

const drive = async () => {
  const auth = await authenticate();
  return google.drive({ version: 'v3', auth });
};

const readSheet = async (spreadsheetId, range) => {    
  const gsheets = await sheets();
  const result = await gsheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });
  return result.data.values;
};

const updateSheet = async (spreadsheetId, range, values) => {
  const gsheets = await sheets();
  const result = await gsheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
  return result.data;
};

const clearSheet = async (spreadsheetId, range) => {
  try {
    const gsheets = await sheets();
    const result = await gsheets.spreadsheets.values.clear({
      spreadsheetId,
      range
    });
    return result.data;
  } catch (error) {
    console.error('Error al borrar los valores:', error);
    throw error;
  }
};

const insertSheet = async (spreadsheetId, range, values) => {
  const gsheets = await sheets();
  const result = await gsheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range, // La hoja y las columnas donde queremos agregar datos
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
  return result.data;
};

const listGoogleSheetsInFolder = async (folderId) => {
  try {
    const gdrive = await drive();
    let files = [];
    let pageToken = null;

    do {
      const res = await gdrive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        fields: 'nextPageToken, files(id, name)',
        pageToken: pageToken
      });

      files = files.concat(res.data.files);
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`Name: ${file.name}, ID: ${file.id}`);
      });
      return files; // Retornar la lista de archivos
    } else {
      console.log('No files found.');
      return [];
    }
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

module.exports = {
  insertSheet,
  readSheet,
  updateSheet,
  clearSheet,
  listGoogleSheetsInFolder
};