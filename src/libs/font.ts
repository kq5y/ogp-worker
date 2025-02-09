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
