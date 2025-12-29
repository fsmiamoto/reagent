import { type FC } from "react";
import { Settings, Rows, Columns, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { useSettingsStore, ViewMode } from "../store/settingsStore";
import { cn } from "../lib/utils";

export const SettingsPopup: FC = () => {
  const { defaultViewMode, setDefaultViewMode } = useSettingsStore();

  const options: { value: ViewMode; label: string; icon: typeof Rows }[] = [
    { value: "unified", label: "Unified", icon: Rows },
    { value: "split", label: "Split", icon: Columns },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Default diff layout
          </p>
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setDefaultViewMode(value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                "hover:bg-muted transition-colors",
                defaultViewMode === value && "bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {defaultViewMode === value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
