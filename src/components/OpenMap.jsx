import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon in Leaflet + React
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

export default function FreeGeoSearch() {
  const [query, setQuery] = useState("Dhaka, Bangladesh");
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("");
  const [imgUrl, setImgUrl] = useState(null);
  const imgWrapRef = useRef();

  async function fetchUnsplashImage(q) {
    const accessKey = "LhOAWCMcYQq5krpmJbYuAfHcVs7AJ-_j-Ue_144vAzg"; // 🔑 replace with your Unsplash key
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      q
    )}&per_page=1&client_id=${accessKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls.small;
      }
    } catch (err) {
      console.error("Unsplash fetch error", err);
    }
    return null;
  }

  async function doSearch() {
    setImgUrl(null); // reset image
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (data.length === 0) {
        alert("No results found.");
        return;
      }
      const top = data[0];
      const lat = parseFloat(top.lat);
      const lng = parseFloat(top.lon);
      setCoords({ lat, lng });
      setAddress(top.display_name);

      // move focus to image box so single Tab shows image
      setTimeout(() => {
        imgWrapRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error(err);
      alert("Error during search.");
    }
  }

  async function handleImageFocus() {
    if (!coords) {
      setImgUrl(null);
      return;
    }
    setImgUrl("loading");

    // Try Unsplash with query first, then address
    const img =
      (await fetchUnsplashImage(query)) ||
      (address ? await fetchUnsplashImage(address) : null);

    setImgUrl(img || "notfound");
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Free Search → OSM + Unsplash</h2>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          placeholder="Type address / place name"
        />
        <button
          onClick={doSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

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

      {address && (
        <p className="text-sm text-gray-700">
          <strong>Address:</strong> {address} <br />
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

      <div
        ref={imgWrapRef}
        tabIndex="0"
        onFocus={handleImageFocus}
        className="border-2 border-dashed border-gray-400 p-4 rounded min-h-[150px] flex items-center justify-center focus:outline-blue-500"
      >
        {!coords && <span>Search a location first.</span>}
        {coords && imgUrl === null && (
          <span>
            Press <strong>Tab</strong> here to load a nearby photo.
          </span>
        )}
        {imgUrl === "loading" && <span>Loading image…</span>}
        {imgUrl === "notfound" && (
          <span>No Unsplash image found for this location.</span>
        )}
        {imgUrl && imgUrl !== "loading" && imgUrl !== "notfound" && (
          <img src={imgUrl} alt="Location" className="max-h-64 rounded" />
        )}
      </div>
    </div>
  );
}
