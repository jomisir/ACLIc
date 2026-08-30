// Inline, blocking script: reads localStorage before paint so there is no
// flash of the wrong theme. Kept tiny and dependency-free on purpose.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("aclic-theme");
    var theme = stored === "light" || stored === "dark" ? stored : null;
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
