/// <reference types="vite/client" />

declare module "dom-to-image-more" {
  type Options = {
    width?: number;
    height?: number;
    style?: Record<string, string>;
    quality?: number;
    bgcolor?: string;
  };

  const domtoimage: {
    toPng(node: Node, options?: Options): Promise<string>;
  };

  export default domtoimage;
}
