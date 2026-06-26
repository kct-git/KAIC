const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'app');

function getAllFiles(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.css')) {
                arrayOfFiles.push(path.join(__dirname, 'frontend', 'app', dirPath.split('frontend\\app')[1] || '', file));
            }
        }
    });

    return arrayOfFiles;
}

const allFiles = getAllFiles(directoryPath);

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    if (file.endsWith('.css')) {
        content = content.replace(/--background: #ffffff;/g, '--background: #fafaf9;'); // stone-50
    } else {
        // Replace bg-slate-50 with bg-stone-100
        content = content.replace(/bg-slate-50(?!\d)/g, 'bg-stone-100');
        // Replace bg-white with bg-stone-50
        content = content.replace(/bg-white(?!\d)/g, 'bg-stone-50');
        // Replace selection:bg-slate-100 with selection:bg-stone-200
        content = content.replace(/selection:bg-slate-100(?!\d)/g, 'selection:bg-stone-200');
        // Let's also warm up the text a bit for slate-900 to stone-900
        content = content.replace(/text-slate-900(?!\d)/g, 'text-stone-900');
        content = content.replace(/text-slate-800(?!\d)/g, 'text-stone-800');
        content = content.replace(/text-slate-700(?!\d)/g, 'text-stone-700');
        
        // Soften borders
        content = content.replace(/border-slate-200(?!\d)/g, 'border-stone-200');
        content = content.replace(/border-slate-300(?!\d)/g, 'border-stone-300');
        
        // Hover
        content = content.replace(/hover:bg-slate-100(?!\d)/g, 'hover:bg-stone-100');
    }
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
console.log("Soften migration complete.");
