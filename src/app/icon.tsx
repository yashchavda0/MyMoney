import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated app icon: a purple rounded tile with a white ₹.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6366f1",
          color: "#ffffff",
          fontSize: 340,
          fontWeight: 700,
          borderRadius: 96,
        }}
      >
        ₹
      </div>
    ),
    size,
  );
}
