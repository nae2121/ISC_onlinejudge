import { Minus, Plus } from "lucide-react";

type HeaderProps = {
  collapsed: boolean;
  label: string;
  onToggle: () => void;
};

export function PanelHeader({ collapsed, label, onToggle }: HeaderProps) {
  return (
    <div className="panelHeader">
      {!collapsed && <strong>{label}</strong>}
      <button
        className="iconButton small"
        type="button"
        title={collapsed ? "Expand" : "Collapse"}
        onClick={onToggle}
      >
        {collapsed ? <Plus size={15} /> : <Minus size={15} />}
      </button>
    </div>
  );
}

export function SectionHeader({ collapsed, label, onToggle }: HeaderProps) {
  return (
    <div className="sectionHeader">
      <strong>{label}</strong>
      <button
        className="iconButton small"
        type="button"
        title={collapsed ? "Expand" : "Collapse"}
        onClick={onToggle}
      >
        {collapsed ? <Plus size={15} /> : <Minus size={15} />}
      </button>
    </div>
  );
}
