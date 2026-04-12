const fs = require('fs');
const glob = require('glob');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<div class="lan-banner" id="lanBanner"><\/div>\r?\n?/g, '');
    fs.writeFileSync(file, content);
    console.log('Cleaned', file);
}
