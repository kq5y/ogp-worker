import { Hono } from "hono";

import satori, { type Font, init } from "satori/wasm";
import { initialize, svg2png } from "svg2png-wasm";
import wasm from "svg2png-wasm/svg2png_wasm_bg.wasm";
import initYoga from "yoga-wasm-web";
import yogaWasm from "yoga-wasm-web/dist/yoga.wasm";

const WIDTH = 1200;
const HEIGHT = 630;

const genModuleInit = () => {
  let isInit = false;
  return async () => {
    if (isInit) {
      return;
    }
    init(await initYoga(yogaWasm));
    await initialize(wasm);
    isInit = true;
  };
};
const moduleInit = genModuleInit();

interface FontCacheData {
  name: string;
  data: string;
  weight: Font["weight"];
}

async function getFonts(name: string, fonts: [string, Font["weight"]][]) {
  return await Promise.all(
    fonts.map(async ([filename, weight]) => {
      const cacheKey = `font:${filename}-${weight}`;
      const cache = await caches.open("font-cache");
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const cachedFont = (await cachedResponse.json()) as FontCacheData;
        const arrayBuffer = Uint8Array.from(atob(cachedFont.data), (c) =>
          c.charCodeAt(0)
        ).buffer;
        return {
          name: cachedFont.name,
          data: arrayBuffer,
          weight: cachedFont.weight,
        } as Font;
      }
      const data = await fetch(`https://tools.t3x.jp/fonts/${filename}.woff`);
      const arrayBuffer = await data.arrayBuffer();
      const font = {
        name,
        data: arrayBuffer,
        weight: weight,
      } as Font;
      const base64Data = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );
      const cacheData: FontCacheData = {
        name,
        data: base64Data,
        weight,
      };
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(cacheData), {
          headers: {
            "Cache-Control": "max-age=604800",
            "Content-Type": "application/json",
          },
        })
      );
      return font;
    })
  );
}

const router = new Hono();

router.get("/image.png", async (c) => {
  const { cat, slug, title } = c.req.query();

  if (!cat || !slug || !title) {
    return c.body("Invalid Parameters", { status: 400 });
  }

  await moduleInit();

  const fonts: Font[] = await getFonts("inconsolata", [
    ["Inconsolata-Bold", 700],
    ["Inconsolata-Regular", 400],
  ]);

  const svg = await satori(
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(0deg, #0f0c38, #030221)",
        color: "#eee",
        fontFamily: "inconsolata, sans-serif",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50px",
          left: "50px",
          right: "50px",
          bottom: "50px",
          borderRadius: "50px",
          background: "#5a596b45",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "80px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            color: "#bbb",
          }}
        >
          {"/*** tools.t3x.jp ***/"}
        </div>
        <div
          style={{ fontSize: "90px", fontWeight: "bold" }}
        >{`${cat}.${slug}`}</div>
        <div
          style={{
            fontSize: "60px",
            fontWeight: "bold",
            color: "#ddd",
          }}
        >
          {title}
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: fonts,
    }
  );

  const ogp = await svg2png(svg);
  const buffer = ogp.buffer as ArrayBuffer;

  return c.body(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export { router };
