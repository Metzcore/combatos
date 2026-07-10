const fs = require('fs');
const content = fs.readFileSync('C:/Users/jmfg9/Documents/Fitness/Fight-Camp/dev_files/apex-protocol-daily-ignition.md', 'utf8');
const lines = content.split('\n');
const quotes = [];
let currentId = null;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^\d{3}$/)) {
        currentId = line;
    } else if (currentId && line.startsWith('\"') && line.endsWith('\"')) {
        quotes.push({ id: currentId, text: line.replace(/^\"|\"$/g, '') });
        currentId = null;
    }
}
const out = 'export const IGNITION_QUOTES = ' + JSON.stringify(quotes, null, 4) + ';\n';
fs.mkdirSync('C:/Users/jmfg9/Documents/Fitness/Fight-Camp/app/src/data', { recursive: true });
fs.writeFileSync('C:/Users/jmfg9/Documents/Fitness/Fight-Camp/app/src/data/ignition.js', out);
console.log('Created ignition.js with ' + quotes.length + ' quotes.');
