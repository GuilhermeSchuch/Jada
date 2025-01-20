// Hooks
import { useEffect } from "react";

// Root
import { createRoot } from "react-dom/client";

// Icons
import {
  GamepadIcon,
  InstallIcon,
  RefreshIcon,
  LaunchIcon
} from "../components/Icons";

const useUpdateButtonsOnResize = (className, breakpoint, dependency) => {
  useEffect(() => {
    const roots = new Map();

    const updateButtons = () => {
      const buttons = document.querySelectorAll(`.${className}`);
      buttons.forEach((button) => {
        const title = button.dataset.title;

        if (window.innerWidth <= breakpoint) {
          const icon = getButtonIcon(title);

          if (icon) {
            let root = roots.get(button);

            if (!root) {
              root = createRoot(button);
              roots.set(button, root);
            }

            root.render(icon);
          }
        } else {
          const root = roots.get(button);

          if (root) {
            root.unmount();
            roots.delete(button);
          }

          button.innerHTML = button.dataset.originalInnerHTML || button.innerHTML;
        }
      });
    };

    const buttons = document.querySelectorAll(`.${className}`);
    buttons.forEach((button) => {
      if (!button.dataset.originalInnerHTML) {
        button.dataset.originalInnerHTML = button.innerHTML;
        button.dataset.title = button.textContent.trim();
      }
    });

    window.addEventListener("resize", updateButtons);
    updateButtons();

    return () => {
      window.removeEventListener("resize", updateButtons);
      roots.forEach((root) => root.unmount());
      roots.clear();
    };
  }, [className, breakpoint, dependency]);
};


const getButtonIcon = (title) => {
  switch (title) {
    case "Choose game":
      return <GamepadIcon />;

    case "Install mods":
      return <InstallIcon />;

    case "Refresh mods":
      return <RefreshIcon />;

    case "Launch game":
      return <LaunchIcon />;

    default:
      return null;
  }
};

export default useUpdateButtonsOnResize;
