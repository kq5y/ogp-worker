import { Hono } from "hono";
import { env } from "hono/adapter";

import { XMLParser } from "fast-xml-parser";

import { getGoogleFonts } from "@/libs/font";
import { generateImage } from "@/libs/ogp";

const router = new Hono<Env>();

const parser = new XMLParser({
  ignoreDeclaration: true,
});

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  slug: string;
  hidden: boolean;
  tags: string;
}

interface PostItem {
  title: string;
  link: string;
  date: string;
  slug: string;
  hidden: boolean;
  tags: string[];
}

const getPosts = async (useCache = true) => {
  const cache = await caches.open("blog-cache");

  if (useCache) {
    const cachedResponse = await cache.match("https://kq5.jp/rss.xml");
    if (cachedResponse) {
      return JSON.parse(await cachedResponse.text()) as PostItem[];
    }
  }

  const response = await fetch("https://kq5.jp/rss.xml");
  const xml = await response.text();
  const result = parser.parse(xml);

  const items: PostItem[] = result.rss.channel.item.map((item: RSSItem) => ({
    title: item.title,
    link: item.link,
    date: new Date(item.pubDate).toISOString().split("T")[0],
    slug: item.slug,
    hidden: item.hidden,
    tags: item.tags.split(","),
  }));

  await cache.put(
    "https://kq5.jp/rss.xml",
    new Response(JSON.stringify(items))
  );

  return items;
};

router.get("/image.png", async (c) => {
  const { slug, date, noCache } = c.req.query();

  if (!slug || !date) {
    return c.body("Invalid Parameters", { status: 400 });
  }

  const cacheKey = `https://ogp.kq5.jp/blog/image.png?slug=${slug}&date=${date}`;
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

  let posts = await getPosts();
  let post = posts.find((p) => p.slug === slug && p.date === date);
  if (!post) {
    posts = await getPosts(false);
    post = posts.find((p) => p.slug === slug && p.date === date);
    if (!post) {
      return c.body("Post not found", { status: 404 });
    }
  }

  const { GOOGLE_FONTS_API_KEY } = env(c);
  if (!GOOGLE_FONTS_API_KEY) {
    return c.body("Server Error: Invalid Google Fonts API Key", {
      status: 500,
    });
  }
  const fonts = await getGoogleFonts(
    "M PLUS Rounded 1c",
    ["regular", "700"],
    GOOGLE_FONTS_API_KEY
  );

  const buffer = await generateImage(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #13161b, #131217)",
        color: "#eee",
        fontFamily: '"M PLUS Rounded 1c", sans-serif',
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "60px",
          right: "60px",
          bottom: "60px",
          borderRadius: "30px",
          background: "rgba(33,36,56,.8)",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontSize: "36px",
            color: "#aaa",
          }}
        >
          {`/${post.slug}`}
        </div>
        <div
          style={{
            fontSize: "70px",
            fontWeight: "bold",
            flex: "1",
          }}
        >
          {post.title}
        </div>
        <div
          style={{
            fontSize: "45px",
            fontWeight: "bold",
            color: "#ccc",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>{post.date}</div>
          <div>kq5.jp</div>
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
