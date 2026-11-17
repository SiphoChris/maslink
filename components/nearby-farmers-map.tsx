"use client";

import { useState } from "react";
import { MapPin, Search, Sprout } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";

const searchRadii = [10, 25, 50, 100, 250];

export function NearbyFarmersMap({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const [radiusKm, setRadiusKm] = useState(50);
  const [search, setSearch] = useState("");
  const hasOrigin =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);
  const farmers = useQuery(
    api.users.findNearbyFarmers,
    hasOrigin ? { radiusKm } : "skip",
  );
  const matchingFarmers = (farmers ?? []).filter((farmer) =>
    farmer.farmName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const center: [number, number] =
    hasOrigin ? [longitude, latitude] : [25, -29];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Farmer network</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#202821]">Farmers near you</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#737b73]">
            Find nearby farms open to connecting and pooling produce. Their exact address is never shown.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#59635a]">
          Search radius
          <select
            aria-label="Search radius"
            className="h-9 rounded-lg border border-[#dfe5dc] bg-white px-3 text-sm text-[#202821] outline-none focus-visible:ring-2 focus-visible:ring-[#8eb28b]"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
          >
            {searchRadii.map((radius) => (
              <option key={radius} value={radius}>{radius} km</option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-[#e8ebe5] bg-white shadow-sm sm:h-[520px]">
          {!hasOrigin ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#f6f3eb]/95 p-8 text-center">
              <div className="max-w-sm">
                <MapPin className="mx-auto mb-3 size-8 text-[#507b55]" />
                <h2 className="text-lg font-semibold text-[#202821]">Add your farm location</h2>
                <p className="mt-2 text-sm leading-6 text-[#737b73]">
                  Set your farm location in your profile to see other farmers nearby.
                </p>
              </div>
            </div>
          ) : null}
          <Map center={center} zoom={hasOrigin ? 8 : 5}>
            <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />
            {hasOrigin ? (
              <MapMarker longitude={longitude} latitude={latitude}>
                <MarkerContent>
                  <div className="grid size-9 place-items-center rounded-full border-2 border-white bg-[#2e583d] text-white shadow-sm">
                    <MapPin className="size-4" />
                  </div>
                </MarkerContent>
                <MarkerTooltip>Your farm</MarkerTooltip>
                <MarkerPopup>
                  <p className="px-3 py-2 text-sm font-medium text-[#202821]">Your farm location</p>
                </MarkerPopup>
              </MapMarker>
            ) : null}
            {matchingFarmers.map((farmer) => (
              <MapMarker
                key={farmer.id}
                longitude={farmer.longitude}
                latitude={farmer.latitude}
              >
                <MarkerContent>
                  <div className="grid size-9 place-items-center rounded-full border-2 border-white bg-[#a64f38] text-white shadow-sm">
                    <Sprout className="size-4" />
                  </div>
                </MarkerContent>
                <MarkerTooltip>{farmer.farmName}</MarkerTooltip>
                <MarkerPopup>
                  <div className="space-y-1 px-3 py-2">
                    <p className="text-sm font-semibold text-[#202821]">{farmer.farmName}</p>
                    <p className="text-xs text-[#737b73]">{farmer.distanceKm} km away</p>
                    <p className="text-[11px] text-[#737b73]">Approximate area only</p>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}
          </Map>
        </div>

        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-[#e8ebe5] bg-white shadow-sm">
          <div className="border-b border-[#e8ebe5] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#202821]">Discover farms</h2>
                <p className="mt-1 text-xs text-[#737b73]">
                  {farmers === undefined ? "Finding farmers" : `${matchingFarmers.length} farms within ${radiusKm} km`}
                </p>
              </div>
            </div>
            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#899187]" />
              <input
                aria-label="Search farm names"
                className="h-10 w-full rounded-lg border border-[#dfe5dc] bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8eb28b]"
                placeholder="Search farm names"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="flex-1 divide-y divide-[#eef0ec] overflow-y-auto">
            {farmers === undefined ? (
              <p className="p-5 text-sm text-[#737b73]">Loading nearby farmers</p>
            ) : matchingFarmers.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-[#737b73]">
                {search ? "No farms match that name." : "No farmers have opted into nearby discovery in this radius yet."}
              </p>
            ) : (
              matchingFarmers.map((farmer) => (
                <article key={farmer.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-[#202821]">{farmer.farmName}</h3>
                    <p className="mt-1 text-xs text-[#737b73]">Approximate location</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#edf4eb] px-2.5 py-1 text-xs font-medium text-[#345f3d]">
                    {farmer.distanceKm} km
                  </span>
                </article>
              ))
            )}
          </div>
          <p className="border-t border-[#e8ebe5] bg-[#f7f8f5] px-4 py-3 text-xs leading-5 text-[#737b73]">
            Farmers appear here only when they opt in to sharing an approximate map location.
          </p>
        </aside>
      </div>
    </section>
  );
}
