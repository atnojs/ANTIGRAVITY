const fs = require('fs');
fs.writeFileSync('E:/ANTIGRAVITY/test_output.txt', 'Node/Bun works! Version: ' + process.version + '\nPlatform: ' + process.platform);
console.log('Done');
