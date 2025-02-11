import type { Font } from "satori/wasm";

export const getFont = async (
  name: string,
  url: string,
  weight: Font["weight"],
  fileType = "font/woff"
) => {
  const cacheKey = `${url}`;
  const cache = await caches.open("font-cache");
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    return {
      name,
      data: arrayBuffer,
      weight,
    } as Font;
  }
  const data = await fetch(url);
  const arrayBuffer = await data.arrayBuffer();
  await cache.put(
    cacheKey,
    new Response(arrayBuffer, {
      headers: {
        "Cache-Control": "max-age=604800",
        "Content-Type": fileType,
      },
    })
  );
  return {
    name,
    data: arrayBuffer,
    weight,
  } as Font;
};

export const getFonts = async (
  name: string,
  fonts: [string, Font["weight"]][],
  fileType = "font/woff"
) => {
  return await Promise.all(
    fonts.map(async ([url, weight]) => {
      return getFont(name, url, weight, fileType);
    })
  );
};

interface GoogleFontAPIResponse {
  kind: "webfonts#webfontList";
  items: {
    family: string;
    variants: string[];
    subsets?: string[];
    version: string;
    lastModified: string;
    files: {
      [key: string]: string;
    };
    category: string;
    kind: string;
    menu: string;
  }[];
}

const weightMap: { [key: string]: Font["weight"] } = {
  "100": 100,
  "200": 200,
  "300": 300,
  "400": 400,
  "500": 500,
  "600": 600,
  "700": 700,
  "800": 800,
  "900": 900,
  regular: 400,
};

export const getGoogleFonts = async (
  name: string,
  weights: string[],
  key: string
) => {
  const fontEndpoint = new URL(
    "https://www.googleapis.com/webfonts/v1/webfonts"
  );
  fontEndpoint.searchParams.set("key", key);
  fontEndpoint.searchParams.set("family", name);
  const data = await fetch(fontEndpoint.toString());
  const json = (await data.json()) as GoogleFontAPIResponse;
  return Promise.all(
    Object.entries(json.items[0].files)
      .filter(([weight]) => weights.includes(weight))
      .map(async ([weight, url]) => {
        return getFont(name, url, weightMap[weight], "font/ttf");
      })
  );
};
