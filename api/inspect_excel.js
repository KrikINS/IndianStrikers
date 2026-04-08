const XLSX = require('xlsx');
const fs = require('fs');

const sourcePath = path.join(__dirname, '..', 'INS_Squad_Statistics_2026-04-08.xls');
const tempPath = path.join(__dirname, 'temp_stats.xls');

try {
    // Copy to bypass potential locks
    fs.copyFileSync(sourcePath, tempPath);
    const workbook = XLSX.readFile(tempPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetNames = workbook.SheetNames;
    console.log('Available sheets:', sheetNames);
    
    const results = {};
    for (const sheetName of sheetNames) {
        try {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            results[sheetName] = {
                headers: data[0] || [],
                rowsCount: data.length
            };
        } catch (innerErr) {
            results[sheetName] = { error: innerErr.message };
        }
    }
    
    fs.writeFileSync('excel_sheets_summary.json', JSON.stringify(results, null, 2));
    console.log('Saved summary to excel_sheets_summary.json');
} catch (e) {
    console.error('Error reading Excel:', e);
}
