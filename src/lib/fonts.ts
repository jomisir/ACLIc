import {
  Newsreader,
  Archivo,
  Noto_Serif_Ethiopic,
  Noto_Sans_Ethiopic,
} from "next/font/google";

// Latin display/body stack — covers English and Afaan Oromo (Qubee, Latin script).
export const displayLatin = Newsreader({
  subsets: ["latin"],
  variable: "--font-display-latin",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const bodyLatin = Archivo({
  subsets: ["latin"],
  variable: "--font-body-latin",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Ethiopic stack — Amharic only. Never render Amharic text with the Latin stack.
export const displayEthiopic = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-display-ethiopic",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const bodyEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-body-ethiopic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const fontVariables = [
  displayLatin.variable,
  bodyLatin.variable,
  displayEthiopic.variable,
  bodyEthiopic.variable,
].join(" ");
