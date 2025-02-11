declare module "*.wasm" {
  let asset: string;
  export default asset;
}

interface Bindings {
  GOOGLE_FONTS_API_KEY?: string;
}

type Env = { Bindings: Bindings };
