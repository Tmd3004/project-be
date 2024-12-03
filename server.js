const Papa = require('papaparse');
const axios = require('axios');
const fs = require('fs');

async function getLatLngFromAddress(address, apiKey) {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.items && data.items.length > 0) {
            const lat = data.items[0].position.lat;
            const lng = data.items[0].position.lng;
            return `${lat}, ${lng}`;
        }
    } catch (error) {
        console.error('Error fetching geocode data:', error);
    }
    return null;
}

async function fetchWithRateLimit(address, apiKey, delay = 1000, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const latlng = await getLatLngFromAddress(address, apiKey);
        if (latlng) {
            return latlng;
        } else if (attempt < retries) {
            console.log(`Retrying... attempt ${attempt + 1}`);
            await new Promise(resolve => setTimeout(resolve, delay)); 
        } else {
            console.error('Max retries reached');
        }
    }
    return null;
}

async function updateCsvWithLatLng(inputFile, outputFile, apiKey) {
    const csvData = fs.readFileSync(inputFile, 'utf8');
    
    Papa.parse(csvData, {
        complete: async function(results) {
            const rows = results.data;
            const updatedRows = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const address = row[3]; 
                if (address) {
                    const latlng = await fetchWithRateLimit(address, apiKey, 2000); 
                    if (latlng) {
                        row[4] = latlng; 
                    }
                }
                updatedRows.push(row);
            }

            const updatedCsv = Papa.unparse(updatedRows);
            fs.writeFileSync(outputFile, updatedCsv);
            console.log('CSV file has been updated with latlng data.');
        }
    });
}

const inputFile = './input.csv';
const outputFile = './output.csv';
const apiKey = 'UbWrAnYGHiNTfTGXol9HdncgY8suWv1_hsZXfrNDK_E'; 

updateCsvWithLatLng(inputFile, outputFile, apiKey);
