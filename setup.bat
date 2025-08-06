@echo off
echo 🚀 Configurando PMG ProspecPro...

:: Criar estrutura de pastas
mkdir assets\css
mkdir assets\js\apis
mkdir assets\js\utils  
mkdir assets\js\components
mkdir assets\data
mkdir assets\img
mkdir config
mkdir workers
mkdir tests

:: Criar arquivos principais
type nul > index.html
type nul > README.md
type nul > .gitignore
type nul > assets\css\style.css
type nul > assets\css\components.css
type nul > assets\js\main.js
type nul > config\api-keys.js

echo ✅ Estrutura criada com sucesso!
echo 📂 Abra o projeto no VS Code: code .
pause
