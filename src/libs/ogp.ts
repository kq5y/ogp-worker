import type { ReactNode } from "react";
import satori, { init, type SatoriOptions } from "satori/wasm";
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

export const generateImage = async (
  element: ReactNode,
  options: Omit<SatoriOptions, "width" | "height"> & {
    width?: number;
    height?: number;
  } = {
    fonts: [],
  }
) => {
  await moduleInit();
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    ...options,
  });
  const ogp = await svg2png(svg, {
    width: options.width || WIDTH,
    height: options.height || HEIGHT,
  });
  return ogp.buffer as ArrayBuffer;
};
