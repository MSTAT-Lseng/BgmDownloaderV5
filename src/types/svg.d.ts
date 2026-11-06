/**
 * @file SVG 模块的类型声明，让 `import X from "./x.svg"` 能当作 React 组件使用。
 */

declare module "*.svg" {
  import * as React from "react";
  import { SvgProps } from "react-native-svg";

  const content: React.FC<SvgProps>;
  export default content;
}
