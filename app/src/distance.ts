function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function routeMinutes(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    )
    const data = await res.json()
    const sec = data?.routes?.[0]?.duration
    return typeof sec === 'number' ? Math.round(sec / 60) : null
  } catch {
    return null
  }
}
