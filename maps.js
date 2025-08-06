class MapsAPI {
    constructor() {
        this.cache = new CacheManager();
        this.errorHandler = new ErrorHandler();
    }

    async getCoordinates(address) {
        if (!address) return null;

        const cacheKey = `coords_${btoa(address)}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            // Usar Nominatim (OpenStreetMap) - API gratuita
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=br`,
                {
                    headers: {
                        'User-Agent': 'PMG-ProspecPro/1.0 (contato@pmg.com.br)'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    display_name: data[0].display_name,
                    address_components: this.parseAddressComponents(data[0])
                };

                this.cache.set(cacheKey, result, 86400000); // 24 horas
                return result;
            }

            return null;

        } catch (error) {
            console.warn('Erro ao obter coordenadas:', error);
            
            // Fallback: tentar com ViaCEP se tiver CEP no endereço
            const cep = this.extractCEP(address);
            if (cep) {
                return await this.getCoordinatesByCEP(cep);
            }

            return null;
        }
    }

    async getCoordinatesByCEP(cep) {
        try {
            const cleanCEP = cep.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            
            if (!response.ok) {
                throw new Error('CEP não encontrado');
            }

            const data = await response.json();
            
            if (data.erro) {
                throw new Error('CEP inválido');
            }

            // Montar endereço completo e buscar coordenadas
            const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
            return await this.getCoordinates(fullAddress);

        } catch (error) {
            console.warn('Erro ao obter coordenadas por CEP:', error);
            return null;
        }
    }

    async reverseGeocode(lat, lng) {
        const cacheKey = `reverse_${lat}_${lng}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                {
                    headers: {
                        'User-Agent': 'PMG-ProspecPro/1.0 (contato@pmg.com.br)'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }

            const data = await response.json();
            const result = {
                address: data.display_name,
                components: this.parseAddressComponents(data)
            };

            this.cache.set(cacheKey, result, 86400000);
            return result;

        } catch (error) {
            console.warn('Erro no reverse geocoding:', error);
            return null;
        }
    }

    async calculateDistance(origin, destination) {
        try {
            const originCoords = typeof origin === 'string' ? 
                await this.getCoordinates(origin) : origin;
            const destCoords = typeof destination === 'string' ? 
                await this.getCoordinates(destination) : destination;

            if (!originCoords || !destCoords) {
                throw new Error('Não foi possível obter as coordenadas');
            }

            // Calcular distância usando fórmula de Haversine
            const distance = this.haversineDistance(
                originCoords.lat, originCoords.lng,
                destCoords.lat, destCoords.lng
            );

            return {
                distance: distance,
                unit: 'km',
                origin: originCoords,
                destination: destCoords
            };

        } catch (error) {
            console.warn('Erro ao calcular distância:', error);
            return null;
        }
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return Math.round(distance * 100) / 100; // Arredondar para 2 casas decimais
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    parseAddressComponents(data) {
        return {
            street: data.address?.road || '',
            neighborhood: data.address?.neighbourhood || data.address?.suburb || '',
            city: data.address?.city || data.address?.town || data.address?.municipality || '',
            state: data.address?.state || '',
            country: data.address?.country || 'Brasil',
            postcode: data.address?.postcode || ''
        };
    }

    extractCEP(text) {
        const cepRegex = /\d{5}-?\d{3}/;
        const match = text.match(cepRegex);
        return match ? match[0] : null;
    }

    async getNearbyPlaces(lat, lng, type = 'restaurant', radius = 1000) {
        try {
            // Usar Overpass API para buscar lugares próximos
            const query = `
                [out:json][timeout:25];
                (
                  node["amenity"="${type}"](around:${radius},${lat},${lng});
                  way["amenity"="${type}"](around:${radius},${lat},${lng});
                  relation["amenity"="${type}"](around:${radius},${lat},${lng});
                );
                out center;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(query)}`
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }

            const data = await response.json();
            
            return data.elements.map(element => ({
                id: element.id,
                name: element.tags.name || 'Nome não disponível',
                type: element.tags.amenity,
                cuisine: element.tags.cuisine,
                lat: element.lat || element.center?.lat,
                lng: element.lon || element.center?.lon,
                address: this.buildAddress(element.tags),
                phone: element.tags.phone,
                website: element.tags.website,
                opening_hours: element.tags.opening_hours
            })).filter(place => place.lat && place.lng);

        } catch (error) {
            console.warn('Erro ao buscar lugares próximos:', error);
            return [];
        }
    }

    buildAddress(tags) {
        const parts = [];
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags['addr:neighbourhood']) parts.push(tags['addr:neighbourhood']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        return parts.join(', ');
    }

    generateMapUrl(lat, lng, zoom = 15) {
        return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`;
    }

    generateDirectionsUrl(origin, destination) {
        if (typeof origin === 'object') {
            origin = `${origin.lat},${origin.lng}`;
        }
        if (typeof destination === 'object') {
            destination = `${destination.lat},${destination.lng}`;
        }
        
        return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
    }

    async getRoutingInfo(origin, destination, mode = 'driving') {
        try {
            const originCoords = typeof origin === 'string' ? 
                await this.getCoordinates(origin) : origin;
            const destCoords = typeof destination === 'string' ? 
                await this.getCoordinates(destination) : destination;

            if (!originCoords || !destCoords) {
                throw new Error('Não foi possível obter as coordenadas');
            }

            // Usar OSRM (Open Source Routing Machine) - gratuito
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/${mode}/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false&steps=false`
            );

            if (!response.ok) {
                throw new Error(`Erro na API de roteamento: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    distance: Math.round(route.distance / 1000 * 100) / 100, // km
                    duration: Math.round(route.duration / 60), // minutos
                    origin: originCoords,
                    destination: destCoords,
                    mode: mode
                };
            }

            // Fallback para distância em linha reta
            return {
                distance: this.haversineDistance(
                    originCoords.lat, originCoords.lng,
                    destCoords.lat, destCoords.lng
                ),
                duration: null,
                origin: originCoords,
                destination: destCoords,
                mode: 'straight_line'
            };

        } catch (error) {
            console.warn('Erro ao obter informações de rota:', error);
            return null;
        }
    }
}
