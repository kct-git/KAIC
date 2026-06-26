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
            if (file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(__dirname, 'frontend', 'app', dirPath.split('frontend\\app')[1] || '', file));
            }
        }
    });

    return arrayOfFiles;
}

const map = {
    // Backgrounds
    "bg-zinc-950": "bg-slate-50",
    "bg-zinc-900": "bg-white",
    "bg-zinc-800": "bg-slate-100",
    "bg-zinc-700": "bg-slate-200",
    "bg-zinc-100": "bg-slate-900", // User text bubbles were zinc-100, now should be slate-900

    // Text
    "text-zinc-50": "text-slate-900",
    "text-zinc-100": "text-slate-900",
    "text-zinc-200": "text-slate-800",
    "text-zinc-300": "text-slate-700",
    "text-zinc-400": "text-slate-600",
    "text-zinc-500": "text-slate-500",
    "text-zinc-600": "text-slate-400",
    "text-zinc-900": "text-slate-50", // User text inside bubbles was zinc-900, now slate-50

    // Borders
    "border-zinc-800": "border-slate-200",
    "border-zinc-700": "border-slate-300",
    "border-zinc-600": "border-slate-400",
    
    // Hover states
    "hover:bg-zinc-800": "hover:bg-slate-100",
    "hover:bg-zinc-700": "hover:bg-slate-200",
    "hover:border-zinc-600": "hover:border-slate-400",
    "hover:border-zinc-500": "hover:border-slate-500",
    
    // Selection
    "selection:bg-zinc-800": "selection:bg-slate-200",
    "selection:text-white": "selection:text-slate-900",

    // Gradients
    "from-zinc-950": "from-slate-50",
    "via-zinc-950": "via-slate-50",
    
    // Disabled states
    "disabled:bg-zinc-800": "disabled:bg-slate-200",
    "disabled:text-zinc-500": "disabled:text-slate-400",
    "disabled:text-zinc-600": "disabled:text-slate-400",
};

const allFiles = getAllFiles(path.join(__dirname, 'frontend', 'app'));

for (const file of allFiles) {
    if (file.includes('globals.css')) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Use regular expressions for word boundaries to avoid partial matches
    for (const [key, value] of Object.entries(map)) {
        const regex = new RegExp(key.replace(/:/g, '\\:') + '(?![\\d-])', 'g');
        content = content.replace(regex, value);
    }
    
    // Fix any specific cases if needed, e.g. white/black that need swapping
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
console.log("Migration complete.");
