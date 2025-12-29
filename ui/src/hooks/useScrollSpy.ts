import { useEffect, useRef, useCallback } from "react";

interface UseScrollSpyProps {
  isLoading: boolean;
  files: { path: string }[] | undefined;
  setSelectedFile: (path: string) => void;
}

export function useScrollSpy({
  isLoading,
  files,
  setSelectedFile,
}: UseScrollSpyProps) {
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (isLoading || !files) return;

    const options = {
      root: null,
      rootMargin: "-20% 0px -80% 0px", // Trigger when file is near top
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const filePath = entry.target.getAttribute("data-file-path");
          if (filePath) {
            setSelectedFile(filePath);
          }
        }
      });
    }, options);

    Object.values(fileRefs.current).forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isLoading, files, setSelectedFile]);

  const handleFileSelect = useCallback(
    (filePath: string) => {
      setSelectedFile(filePath);
      isScrollingRef.current = true;

      const element = fileRefs.current[filePath];
      if (element) {
        // Use auto behavior for instant scrolling to avoid the "slow" feeling
        element.scrollIntoView({ behavior: "auto", block: "start" });
        // Reset scrolling flag quickly since we're not animating
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    },
    [setSelectedFile],
  );

  const setFileRef = useCallback(
    (filePath: string, element: HTMLDivElement | null) => {
      fileRefs.current[filePath] = element;
    },
    [],
  );

  return {
    handleFileSelect,
    setFileRef,
  };
}
