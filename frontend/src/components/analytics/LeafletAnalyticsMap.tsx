import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CityData {
  city: string;
  users: number;
}

interface LeafletAnalyticsMapProps {
  data: CityData[];
}

// Koordinater för svenska städer
const CITY_COORDINATES: { [key: string]: LatLngTuple } = {
  'Stockholm': [59.3293, 18.0686],
  'Göteborg': [57.7089, 11.9746],
  'Malmö': [55.6050, 13.0038],
  'Uppsala': [59.8586, 17.6389],
  'Västerås': [59.6162, 16.5448],
  'Örebro': [59.2753, 15.2134],
  'Linköping': [58.4108, 15.6214],
  'Helsingborg': [56.0465, 12.6945],
  'Jönköping': [57.7826, 14.1618],
  'Norrköping': [58.5877, 16.1826],
  'Lund': [55.7047, 13.1910],
  'Umeå': [63.8258, 20.2630],
  'Gävle': [60.6749, 17.1410],
  'Borås': [57.7210, 12.9401],
  'Södertälje': [59.1955, 17.6253],
  'Eskilstuna': [59.3709, 16.5077],
  'Karlstad': [59.4021, 13.5115],
  'Täby': [59.4439, 18.0649],
  'Växjö': [56.8787, 14.8059],
  'Halmstad': [56.6745, 12.8577],
};

// Fix för Leaflet ikoner i React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LeafletAnalyticsMap: React.FC<LeafletAnalyticsMapProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen geografisk data än</h3>
          <p className="text-gray-600">Väntar på besökare från olika städer...</p>
          <p className="text-gray-500 text-sm mt-2">Kan ta 24-48 timmar innan data visas</p>
        </div>
      </div>
    );
  }

  // Lägg till koordinater för städer
  const citiesWithCoords = data
    .map(city => ({
      ...city,
      coordinates: CITY_COORDINATES[city.city] || CITY_COORDINATES[city.city.split(',')[0]?.trim()],
    }))
    .filter(city => city.coordinates);

  if (citiesWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Städer saknar koordinater</h3>
          <p className="text-gray-600">Kan inte visa {data.length} stad(er) på kartan</p>
        </div>
      </div>
    );
  }

  // Sverige som centrum
  const defaultCenter: LatLngTuple = [62.0, 15.0];
  const maxUsers = Math.max(...data.map(d => d.users), 1);

  // Skapa anpassade ikoner baserat på antal besökare
  const getMarkerIcon = (users: number) => {
    const size = Math.max(8, Math.min(20, (users / maxUsers) * 20));
    const color = users >= maxUsers * 0.7 ? '#EF4444' :  // Röd för top
                  users >= maxUsers * 0.4 ? '#F97316' :  // Orange för medium
                  '#3B82F6';  // Blå för low

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="${size * 2}" height="${size * 2 + 10}" viewBox="0 0 ${size * 2} ${size * 2 + 10}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <circle cx="${size}" cy="${size}" r="${size}" fill="${color}" filter="url(#shadow)" />
          <circle cx="${size}" cy="${size}" r="${size * 0.4}" fill="white" opacity="0.8" />
        </svg>
      `)}`,
      iconSize: [size * 2, size * 2 + 10],
      iconAnchor: [size, size],
      popupAnchor: [0, -size],
    });
  };

  return (
    <div className="space-y-6">
      {/* Leaflet Map Container */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-blue-100">
        <MapContainer
          center={defaultCenter}
          zoom={5}
          className="h-[300px] sm:h-[400px] lg:h-[500px] w-full"
          style={{ background: '#F3F4F6' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {citiesWithCoords.map((city) => (
            <Marker
              key={city.city}
              position={city.coordinates!}
              icon={getMarkerIcon(city.users)}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{city.city}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Besökare:</span>
                      <span className="font-bold text-blue-600 text-lg">{city.users}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        {((city.users / maxUsers) * 100).toFixed(1)}% av total
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(city.users / maxUsers) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="text-2xl sm:text-4xl font-bold mb-1">{citiesWithCoords.length}</div>
          <div className="text-blue-100 text-xs sm:text-sm font-medium">Städer</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="text-2xl sm:text-4xl font-bold mb-1">
            {data.reduce((sum, city) => sum + city.users, 0)}
          </div>
          <div className="text-indigo-100 text-xs sm:text-sm font-medium">Besökare</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
          <div className="text-lg sm:text-2xl font-bold mb-1 truncate">{citiesWithCoords[0]?.city || '-'}</div>
          <div className="text-purple-100 text-xs sm:text-sm font-medium">Top stad</div>
        </div>
      </div>

      {/* City list */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl sm:text-2xl">📍</span>
          Alla städer ({data.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {data.map((city, index) => {
            const percentage = (city.users / maxUsers) * 100;
            const isTop = index < 3;

            return (
              <div
                key={index}
                className={`p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                  isTop
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isTop && (
                      <span className="text-yellow-300 text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    )}
                    <span className={`font-bold ${isTop ? 'text-white' : 'text-gray-900'}`}>
                      {city.city}
                    </span>
                  </div>
                  <span className={`font-bold ${isTop ? 'text-white' : 'text-blue-600'}`}>
                    {city.users}
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${isTop ? 'bg-white/30' : 'bg-gray-300'}`}>
                  <div
                    className={`h-2 rounded-full ${isTop ? 'bg-white' : 'bg-blue-600'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Kartförklaring</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-700 font-medium">Flest besökare (70%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-700 font-medium">Många besökare (40-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-gray-700 font-medium">Färre besökare (0-40%)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 sm:mt-4">
          Klicka på en markör för att se mer information
        </p>
      </div>
    </div>
  );
};

export default LeafletAnalyticsMap;
