import { useEffect } from "react";
import { useThemeStore } from "./store/themeStore";
import { Dashboard } from "./components/Dashboard";
import { ReviewView } from "./components/ReviewView";

/**
 * Parse the current URL path to determine which view to render
 */
function useRoute(): { view: "dashboard" | "review"; sessionId?: string } {
  const path = window.location.pathname;

  // Match /review/:sessionId
  const reviewMatch = path.match(/^\/review\/(.+)$/);
  if (reviewMatch) {
    return { view: "review", sessionId: reviewMatch[1] };
  }

  // Default to dashboard
  return { view: "dashboard" };
}

function App() {
  const { theme } = useThemeStore();
  const route = useRoute();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Route to appropriate view
  if (route.view === "review" && route.sessionId) {
    return <ReviewView sessionId={route.sessionId} />;
  }

  return <Dashboard />;
}

export default App;
