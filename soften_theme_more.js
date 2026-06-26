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
        content = content.replace(/--background: #fafaf9;/g, '--background: #f4f1ea;');
        content = content.replace(/--background: #ffffff;/g, '--background: #f4f1ea;');
    } else {
        // Main backgrounds (previously stone-100 or slate-50) -> bg-[#f4f1ea]
        content = content.replace(/bg-stone-100(?!\d)/g, 'bg-[#f4f1ea]');
        content = content.replace(/bg-slate-50(?!\d)/g, 'bg-[#f4f1ea]');
        
        // Card/Bubble backgrounds (previously stone-50 or white) -> bg-[#faf9f6]
        content = content.replace(/bg-stone-50(?!\d)/g, 'bg-[#faf9f6]');
        content = content.replace(/bg-white(?!\d)/g, 'bg-[#faf9f6]');
        
        // Gradients
        content = content.replace(/from-stone-100/g, 'from-[#f4f1ea]');
        content = content.replace(/via-stone-100/g, 'via-[#f4f1ea]');
        content = content.replace(/from-slate-50/g, 'from-[#f4f1ea]');
        content = content.replace(/via-slate-50/g, 'via-[#f4f1ea]');
        
        // Hover
        content = content.replace(/hover:bg-stone-100/g, 'hover:bg-[#ebe6db]');
        content = content.replace(/hover:bg-slate-100/g, 'hover:bg-[#ebe6db]');
        content = content.replace(/hover:bg-stone-50/g, 'hover:bg-[#f4f1ea]');
        content = content.replace(/hover:bg-white/g, 'hover:bg-[#f4f1ea]');

        // Borders
        content = content.replace(/border-stone-200/g, 'border-[#e0dcd3]');
        content = content.replace(/border-slate-200/g, 'border-[#e0dcd3]');
        content = content.replace(/border-stone-300/g, 'border-[#d1ccbf]');
        content = content.replace(/border-slate-300/g, 'border-[#d1ccbf]');
    }
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
console.log("Warmer soft migration complete.");
