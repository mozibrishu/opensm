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
  const [query, setQuery] = useState("Eiffel Tower, Paris");
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("");
  const [imgUrl, setImgUrl] = useState(null);
  const imgWrapRef = useRef();

  async function doSearch() {
    setImgUrl(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&addressdetails=1`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      if (data.length === 0) {
        alert("No results found.");
        return;
      }
      const top = data[0];
      setCoords({ lat: parseFloat(top.lat), lng: parseFloat(top.lon) });
      setAddress(top.display_name);
    } catch (err) {
      console.error(err);
      alert("Error during search.");
    }
  }

  async function fetchCommonsImage(lat, lng) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo|coordinates&generator=geosearch&ggscoord=${lat}%7C${lng}&ggsradius=100&ggslimit=10&iiprop=url|extmetadata`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.query && data.query.pages) {
        const pages = Object.values(data.query.pages);
        for (const p of pages) {
          if (p.imageinfo && p.imageinfo.length) {
            return p.imageinfo[0].url;
          }
        }
      }
    } catch (err) {
      console.error("Commons fetch error", err);
    }
    return null;
  }

  async function handleImageFocus() {
    if (!coords) {
      setImgUrl(null);
      return;
    }
    setImgUrl("loading");
    const img = await fetchCommonsImage(coords.lat, coords.lng);
    setImgUrl(img || "notfound");
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Free Search → OSM + Wikimedia</h2>

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
            href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=18/${coords.lat}/${coords.lng}`}
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
          <span>Press <strong>Tab</strong> here to load a nearby photo.</span>
        )}
        {imgUrl === "loading" && <span>Loading image…</span>}
        {imgUrl === "notfound" && (
          <span>No Wikimedia image found nearby.</span>
        )}
        {imgUrl && imgUrl !== "loading" && imgUrl !== "notfound" && (
          <img src={imgUrl} alt="Nearby Wikimedia" className="max-h-64" />
        )}
      </div>
    </div>
  );
}