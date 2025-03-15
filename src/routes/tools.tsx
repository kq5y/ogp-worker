import { Hono } from "hono";

import { getFonts } from "@/libs/font";
import { generateImage } from "@/libs/ogp";

const router = new Hono<Env>();

router.get("/image.png", async (c) => {
  const { cat, slug, title, noCache } = c.req.query();

  if (!cat || !slug || !title) {
    return c.body("Invalid Parameters", { status: 400 });
  }

  const cacheKey = `https://ogp.kq5.jp/tools/image.png?cat=${cat}&slug=${slug}&title=${title}`;
  const cache = await caches.open("ogp-cache");

  if (noCache !== "1") {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse.body, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const fonts = await getFonts("inconsolata", [
    ["https://tools.kq5.jp/fonts/Inconsolata-Bold.woff", 700],
    ["https://tools.kq5.jp/fonts/Inconsolata-Regular.woff", 400],
  ]);

  const buffer = await generateImage(
    <div
      style={{
        width: "100%",
        height: "100%",
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
          {"/*** tools.kq5.jp ***/"}
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
      fonts: fonts,
    }
  );

  const response = new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });

  await cache.put(cacheKey, response.clone());

  return response;
});

export { router };
