import { Router } from 'express';

const router = Router();

router.get('/geocode', async (req, res) => {
  try {
    const { q, limit = 1 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=1`;
    
    console.log(`🗺️  Geocoding request: ${q}`);
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'VilchesApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        success: false,
        message: 'Geocoding service temporarily unavailable'
      });
    }

    const data = await response.json() as any[];
    
    const formattedResults = data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name,
      address: {
        house_number: item.address?.house_number,
        road: item.address?.road,
        city: item.address?.city || item.address?.town || item.address?.village,
        postcode: item.address?.postcode,
        country: item.address?.country
      },
      boundingbox: item.boundingbox
    }));

    console.log(`✅ Geocoding successful: ${formattedResults.length} results for "${q}"`);

    res.json({
      success: true,
      results: formattedResults,
      query: q
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal geocoding error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Parameters "lat" and "lon" are required'
      });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    
    console.log(`🗺️  Reverse geocoding: ${lat}, ${lon}`);
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'VilchesApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Nominatim reverse API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        success: false,
        message: 'Reverse geocoding service temporarily unavailable'
      });
    }

    const data = await response.json() as any;
    
    const formattedResult = {
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      display_name: data.display_name,
      address: {
        house_number: data.address?.house_number,
        road: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        postcode: data.address?.postcode,
        country: data.address?.country
      }
    };

    console.log(`✅ Reverse geocoding successful for ${lat}, ${lon}`);

    res.json({
      success: true,
      result: formattedResult
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal reverse geocoding error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
