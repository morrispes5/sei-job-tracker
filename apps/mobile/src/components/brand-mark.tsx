import Svg, { Circle, Path, Rect } from "react-native-svg";

export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Svg
      accessibilityLabel="Sei abstract compass mark"
      width={size}
      height={size}
      viewBox="0 0 128 128"
    >
      <Rect width="128" height="128" rx="32" fill="#11151D" />
      <Path d="M30 35.5 65.5 21l-13 35.5L17 70.5 30 35.5Z" fill="#5B8CFF" />
      <Path
        d="m76 71.5 35.5-14.5L98.5 92.5 63 107l13-35.5Z"
        fill="#5B8CFF"
        opacity={0.72}
      />
      <Path d="m52.5 56.5 23.5 15L63 107l-10.5-50.5Z" fill="#9EB9FF" />
      <Circle cx="64" cy="64" r="8" fill="#F4F7FB" />
    </Svg>
  );
}
