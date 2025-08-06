const fs = require('fs');
const path = require('path');

function listProject(dir = '.', level = 0) {
    const items = fs.readdirSync(dir).sort();
    const stats = {
        files: 0,
        folders: 0,
        totalSize: 0
    };

    items.forEach(item => {
        if (item.startsWith('.') && !item.includes('git')) return;
        
        const fullPath = path.join(dir, item);
        const relativePath = path.relative('.', fullPath);
        const stat = fs.statSync(fullPath);
        const indent = '  '.repeat(level);
        
        if (stat.isDirectory()) {
            console.log(`${indent}📁 ${item}/`);
            stats.folders++;
            const subStats = listProject(fullPath, level + 1);
            stats.files += subStats.files;
            stats.folders += subStats.folders;
            stats.totalSize += subStats.totalSize;
        } else {
            const size = (stat.size / 1024).toFixed(1);
            const ext = path.extname(item);
            const icon = getFileIcon(ext);
            console.log(`${indent}${icon} ${item} (${size} KB)`);
            stats.files++;
            stats.totalSize += stat.size;
        }
    });

    if (level === 0) {
        console.log('\n📊 ESTATÍSTICAS DO PROJETO:');
        console.log(`📁 Pastas: ${stats.folders}`);
        console.log(`📄 Arquivos: ${stats.files}`);
        console.log(`💾 Tamanho Total: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('\n🚀 PMG ProspecPro - Estrutura Completa');
    }

    return stats;
}

function getFileIcon(ext) {
    const icons = {
        '.html': '🌐',
        '.css': '🎨',
        '.js': '⚡',
        '.json': '📋',
        '.md': '📝',
        '.pdf': '📕',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.webp': '🖼️',
        '.txt': '📄',
        '.sh': '🔧',
        '.bat': '🔧'
    };
    return icons[ext] || '📄';
}

// Executar
console.log('🏗️ ESTRUTURA DO PROJETO PMG PROSPECTOR\n');
listProject();
