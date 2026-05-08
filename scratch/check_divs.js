const fs = require('fs');
const content = fs.readFileSync('\\\\wsl.localhost\\Ubuntu\\home\\samuel\\projects\\Forge-v1\\app\\dashboard\\browse\\[id]\\page.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  balance += opens - closes;
  console.log(`${i + 1}: ${balance} (opens: ${opens}, closes: ${closes}) - ${line.trim().substring(0, 30)}`);
}
