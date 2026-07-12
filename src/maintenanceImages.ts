// Centralized, asset-focused imagery for maintenance tickets.
//
// Every ticket image is chosen from a curated library of enterprise / technician
// documentation style photos that show the ACTUAL damaged asset as the main subject
// (no random people). Selection is deterministic per ticket so the same issue always
// renders the same image, and different assets vary.
//
// Images are served from the Unsplash CDN with a consistent set of optimization params:
//   auto=format  -> deliver webp/avif when supported
//   fit=crop     -> crop to the subject, minimal background
//   ar=4:3       -> identical aspect ratio for every ticket
//   w=1000&q=80  -> high resolution but bandwidth friendly

const UNSPLASH_BASE = "https://images.unsplash.com/photo-";

/** Build a consistently optimized, asset-focused Unsplash URL from a photo id. */
export function maintenanceImageUrl(photoId: string): string {
  return `${UNSPLASH_BASE}${photoId}?auto=format&fit=crop&w=1000&q=80&ar=4:3`;
}

// Curated pools grouped by asset category. All photos depict the real hardware
// (monitor, laptop, phone, vehicle, conference display, server rack, printer).
const CATEGORY_POOLS: Record<string, string[]> = {
  Laptop: [
    "1721333089418-faead19e3654", // broken laptop on a table
    "1777861845855-edb4b29158af", // laptop + repair tools on a desk
    "1654778747238-12314fb5a4aa", // laptop opened for repair / hinge
  ],
  Monitor: [
    "1561064041-38db54d8c63d", // cracked / damaged display panel
    "1591799264318-7e6ef8ddb7ea", // cracked screen close-up
  ],
  Mobile: [
    "1746017302141-c9b930816de9", // cracked smartphone on a repair mat
    "1746006084491-95423925b699", // cracked smartphone screen
    "1650580809796-39361e4d77f6", // cell phone with cracked glass
  ],
  Vehicle: [
    "1701276785347-52c67e5b8231", // dashboard with red warning lights
    "1779357807496-ac3f5c17b941", // flat tyre on a car
    "1656084754108-41e7dc87d32b", // car with a flat tyre
    "1574786577419-d727dc86153b", // vehicle dashboard warning cluster
    "1722500346982-44cf18490f24", // driver's view of dashboard
  ],
  MeetingRoom: [
    "1750768145390-f0ad18d3e65b", // conference room with a wall display
    "1702628770460-29de8f6f5929", // room with a projector screen
    "1707553962455-3601c4607f72", // conference room projector screen
    "1739063274132-32ad572d2175", // large room with projector screen
  ],
  Server: [
    "1680992046615-065f58bcb4d8", // close-up of a server rack
  ],
  Desk: [
    "1680992046615-065f58bcb4d8", // generic IT hardware
  ],
  Other: [
    "1710857679450-ecd7945dd4bd", // office printer / multifunction device
    "1680992046615-065f58bcb4d8", // server / network hardware
    "1707553962455-3601c4607f72", // projector / display
  ],
};

// Issue-specific overrides so the image visually matches the reported fault
// (e.g. a flat tyre shows a flat tyre, not just any car).
const KEYWORD_OVERRIDES: { pattern: RegExp; pool: string[] }[] = [
  { pattern: /flat\s*tire|flat\s*tyre|punctur/, pool: ["1779357807496-ac3f5c17b941", "1656084754108-41e7dc87d32b"] },
  { pattern: /engine|dashboard|warning|check\s*engine|fault\s*code|emission|smoke/, pool: ["1701276785347-52c67e5b8231", "1574786577419-d727dc86153b", "1722500346982-44cf18490f24"] },
  { pattern: /paper\s*jam|\bjam\b|toner|\bink\b|printer|cartridge/, pool: ["1710857679450-ecd7945dd4bd"] },
  { pattern: /lamp|lens|projector|hdmi/, pool: ["1707553962455-3601c4607f72", "1702628770460-29de8f6f5929", "1750768145390-f0ad18d3e65b"] },
  { pattern: /flicker|vertical\s*line|dead\s*pixel|glitch/, pool: ["1561064041-38db54d8c63d", "1591799264318-7e6ef8ddb7ea"] },
];

// Tiny deterministic hash so a given ticket always maps to the same image.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolve a realistic, asset-focused maintenance image URL for a ticket.
 * @param category   Asset category (e.g. "Laptop", "Vehicle").
 * @param description The reported issue text (used for keyword overrides).
 * @param seed       Stable identifier (asset id / ticket id) for deterministic selection.
 */
export function getMaintenanceImage(category = "Other", description = "", seed = ""): string {
  const desc = description.toLowerCase();
  let pool = CATEGORY_POOLS[category] ?? CATEGORY_POOLS["Other"];

  for (const override of KEYWORD_OVERRIDES) {
    if (override.pattern.test(desc)) {
      pool = override.pool;
      break;
    }
  }

  const key = seed || description || category;
  const photoId = pool[hashString(key) % pool.length];
  return maintenanceImageUrl(photoId);
}
