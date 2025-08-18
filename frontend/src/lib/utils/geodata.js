import { json } from 'd3-fetch';

export async function fetchWithCache(key, apiUrl, fallbackUrl, cacheHours = 24) {
    const cacheKey = `geodata_${key}`;
    const timestampKey = `${cacheKey}_timestamp`;
    
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    const isExpired = !timestamp || (Date.now() - parseInt(timestamp)) > (cacheHours * 60 * 60 * 1000);
    
    if (cached && !isExpired) {
        console.log(`Using cached data for ${key}`);
        return JSON.parse(cached);
    }
    
    try {
        console.log(`Fetching fresh data from API for ${key}`);
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, Date.now().toString());
        
        return data;
    } catch (error) {
        console.warn(`API failed for ${key}, trying fallback:`, error);
        if (fallbackUrl) {
            return await json(fallbackUrl);
        }
        throw error;
    }
}