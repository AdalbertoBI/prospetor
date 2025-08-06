#!/bin/bash
# setup.sh

echo "🚀 Configurando PMG ProspecPro..."

# Criar estrutura de diretórios
mkdir -p pmg-prospector/{js,css,assets,data}
cd pmg-prospector

# Baixar dependências
echo "📦 Baixando dependências..."
curl -o js/bootstrap.min.js https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/js/bootstrap.bundle.min.js
curl -o css/bootstrap.min.css https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/css/bootstrap.min.css
curl -o css/fontawesome.min.css https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css

# Copiar arquivo de imagens
cp ../imagens.json data/

echo "✅ Configuração concluída!"
echo "📄 Para usar:"
echo "1. Abra o index.html em um servidor web"
echo "2. Configure as APIs necessárias"
echo "3. Teste com dados reais"

echo "🔗 APIs utilizadas:"
echo "- ReceitaWS (consulta CNPJ): https://receitaws.com.br"
echo "- Canva API (criação de designs): https://developers.canva.com"
