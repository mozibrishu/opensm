import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

function FlyToLocation({ lat, lng }) {
  const map = useMap();
  if (lat && lng) {
    map.flyTo([lat, lng], 16);
  }
  return null;
}

// helper to calculate distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FreeGeoSearch() {
  const [query, setQuery] = useState("Dhaka University");
  const [userCoords, setUserCoords] = useState(null);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("");
  const [imgUrl, setImgUrl] = useState(null);

  // ========================
  // 1. Detect user location on mount
  // ========================
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.error(err);
        alert("Unable to get your location.");
      }
    );
  }, []);

  // ========================
  // 2. Search and pick nearest location
  // ========================
  async function doSearch() {
    if (!userCoords) {
      alert("User location not ready yet.");
      return;
    }

    setImgUrl(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + " Bangladesh"
        )}&limit=5&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (data.length === 0) {
        alert("No results found.");
        return;
      }

      // find nearest to user
      let nearest = null;
      let minDist = Infinity;
      for (const place of data) {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        const dist = haversine(userCoords.lat, userCoords.lng, lat, lon);
        if (dist < minDist) {
          minDist = dist;
          nearest = place;
        }
      }

      if (nearest) {
        setCoords({ lat: parseFloat(nearest.lat), lng: parseFloat(nearest.lon) });
        setAddress(nearest.display_name);
        fetchImage(nearest.display_name);
      }
    } catch (err) {
      console.error(err);
      alert("Error during search.");
    }
  }

  // ========================
  // 3. Unsplash Image Fetch
  // ========================
  async function fetchImage(queryText) {
    const UNSPLASH_ACCESS_KEY = "LhOAWCMcYQq5krpmJbYuAfHcVs7AJ-_j-Ue_144vAzg"; // replace with your Unsplash API key
    setImgUrl("loading");
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          queryText + " Bangladesh"
        )}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setImgUrl(data.results[0].urls.small);
      } else {
        setImgUrl("notfound");
      }
    } catch (err) {
      console.error("Unsplash fetch error", err);
      setImgUrl("notfound");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Bangladesh Location Search</h2>

      {/* Search Box + Button */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          placeholder="Type place in Bangladesh"
        />
        <button
          onClick={doSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search Nearest
        </button>
      </div>

      {/* Map */}
      <div className="h-80 rounded overflow-hidden">
        <MapContainer
          center={[23.7806, 90.2794]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {coords && (
            <>
              <Marker position={[coords.lat, coords.lng]}></Marker>
              <FlyToLocation lat={coords.lat} lng={coords.lng} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Address */}
      {address && (
        <p className="text-sm text-gray-700">
          <strong>Nearest Address:</strong> {address} <br />
          <a
            className="text-blue-600 underline"
            href={`https://www.openstreetmap.org/?mlat=${coords?.lat}&mlon=${coords?.lng}#map=18/${coords?.lat}/${coords?.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in OSM
          </a>
        </p>
      )}

      {/* Image Box */}
      <div className="border-2 border-dashed border-gray-400 p-4 rounded min-h-[150px] flex items-center justify-center">
        {!coords && <span>Search a location first.</span>}
        {imgUrl === "loading" && <span>Loading image…</span>}
        {imgUrl === "notfound" && (
          <span>No Unsplash image found for this location.</span>
        )}
        {imgUrl && imgUrl !== "loading" && imgUrl !== "notfound" && (
          <img src={imgUrl} alt="Nearby" className="max-h-64" />
        )}
      </div>
    </div>
  );
}
