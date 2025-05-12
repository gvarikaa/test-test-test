'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, XCircle, Search, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelected: (location: {
    name: string;
    latitude: number;
    longitude: number;
  }) => void;
  onClear: () => void;
  initialLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

type Place = {
  name: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

export default function LocationPicker({
  onLocationSelected,
  onClear,
  initialLocation,
}: LocationPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Set up click outside listener to close the picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Reset search when picker is closed
  useEffect(() => {
    if (!showPicker) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showPicker]);
  
  // Handle search query changes with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // In a real implementation, this would be a call to a geocoding API
        // For demo purposes, we'll generate some fake results
        await generateFakeSearchResults(searchQuery);
      } catch (err) {
        console.error('Error searching for locations:', err);
        setError('Failed to search for locations');
      } finally {
        setIsLoading(false);
      }
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);
  
  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        try {
          // In a real implementation, this would be a reverse geocoding API call
          // For demo purposes, we'll just use the coordinates with a generic name
          setSelectedLocation({
            name: 'Current Location',
            latitude,
            longitude,
          });
          
          onLocationSelected({
            name: 'Current Location',
            latitude,
            longitude,
          });
          
          setShowPicker(false);
        } catch (err) {
          console.error('Error getting location name:', err);
          setError('Failed to get your location name');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error getting user location:', err);
        setError('Failed to get your current location');
        setIsLoading(false);
      }
    );
  };
  
  // Clear the location
  const clearLocation = () => {
    setSelectedLocation(undefined);
    onClear();
  };
  
  // Handle location selection
  const handleSelectLocation = (place: Place) => {
    const location = {
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    };
    
    setSelectedLocation(location);
    onLocationSelected(location);
    setShowPicker(false);
  };
  
  // Generate fake search results for demo purposes
  const generateFakeSearchResults = async (query: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const fakeResults: Place[] = [
          {
            name: `${query} City Center`,
            formatted_address: `${query} City, Country`,
            geometry: {
              location: {
                lat: 40.7128 + Math.random() * 0.1,
                lng: -74.006 + Math.random() * 0.1,
              },
            },
          },
          {
            name: `${query} Mall`,
            formatted_address: `${query} Mall, City, Country`,
            geometry: {
              location: {
                lat: 40.7128 + Math.random() * 0.1,
                lng: -74.006 + Math.random() * 0.1,
              },
            },
          },
          {
            name: `${query} Park`,
            formatted_address: `${query} Park, City, Country`,
            geometry: {
              location: {
                lat: 40.7128 + Math.random() * 0.1,
                lng: -74.006 + Math.random() * 0.1,
              },
            },
          },
        ];
        
        setSearchResults(fakeResults);
        resolve();
      }, 500);
    });
  };
  
  return (
    <div className="relative">
      {/* Location display or button */}
      {selectedLocation ? (
        <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
          <MapPin size={16} className="text-blue-400" />
          <span className="text-gray-200 text-sm flex-1 truncate">
            {selectedLocation.name}
          </span>
          <button
            onClick={clearLocation}
            className="text-gray-400 hover:text-white"
            aria-label="Clear location"
          >
            <XCircle size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 p-2 bg-gray-800 rounded-md text-gray-300 hover:bg-gray-700 w-full"
        >
          <MapPin size={16} />
          <span className="text-sm">Add location</span>
        </button>
      )}
      
      {/* Location picker modal */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-10 mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg w-80"
        >
          <h4 className="text-white font-medium mb-3">Pick a location</h4>
          
          {/* Search input */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a place..."
              className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Loader2 size={16} className="text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          
          {/* Current location button */}
          <button
            onClick={getUserLocation}
            className="w-full mb-3 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <MapPin size={16} />
            <span>Use current location</span>
          </button>
          
          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-xs">
              {error}
            </div>
          )}
          
          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              <div className="text-xs text-gray-400 mb-1">Search results:</div>
              <ul className="space-y-2">
                {searchResults.map((place, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSelectLocation(place)}
                      className="w-full text-left p-2 rounded hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-white text-sm font-medium">
                        {place.name}
                      </div>
                      {place.formatted_address && (
                        <div className="text-gray-400 text-xs truncate">
                          {place.formatted_address}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* No results message */}
          {searchQuery.trim().length >= 3 && !isLoading && searchResults.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-2">
              No places found matching your search.
            </div>
          )}
          
          {/* Initial instructions */}
          {!searchQuery.trim() && !isLoading && searchResults.length === 0 && !error && (
            <div className="text-gray-400 text-xs text-center py-2">
              Type at least 3 characters to search for places or use your current location.
            </div>
          )}
        </div>
      )}
    </div>
  );
}