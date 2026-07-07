"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { JudgeSettings, ThemeName } from "@/components/types";

type SettingsDialogProps = {
  appSettings: {
    fontSize: number;
    liveAutocomplete: boolean;
    theme: ThemeName;
  };
  judgeSettings: JudgeSettings;
  onClose: () => void;
  onSave: (settings: JudgeSettings) => void;
  onSetFontSize: (size: number) => void;
  onSetLiveAutocomplete: (enabled: boolean) => void;
  onSetTheme: (theme: ThemeName) => void;
};

export function SettingsDialog({
  appSettings,
  judgeSettings,
  onClose,
  onSave,
  onSetFontSize,
  onSetLiveAutocomplete,
  onSetTheme
}: SettingsDialogProps) {
  const [draft, setDraft] = useState(judgeSettings);

  return (
    <div className="modalLayer" role="presentation" onMouseDown={onClose}>
      <div
        aria-modal="true"
        className="settingsModal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modalHeader">
          <strong>Settings</strong>
          <button className="iconButton small" type="button" title="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settingsBody">
          <section className="settingsGroup">
            <div className="segmented">
              <button
                className={appSettings.theme === "light" ? "active" : ""}
                type="button"
                onClick={() => onSetTheme("light")}
              >
                Light
              </button>
              <button
                className={appSettings.theme === "dark" ? "active" : ""}
                type="button"
                onClick={() => onSetTheme("dark")}
              >
                Dark
              </button>
            </div>

            <label className="checkRow">
              <input
                checked={appSettings.liveAutocomplete}
                type="checkbox"
                onChange={(event) => onSetLiveAutocomplete(event.target.checked)}
              />
              <span>Ace live autocomplete</span>
            </label>

            <label className="rangeRow">
              <span>Font {appSettings.fontSize}px</span>
              <input
                max={24}
                min={12}
                type="range"
                value={appSettings.fontSize}
                onChange={(event) =>
                  onSetFontSize(Number.parseInt(event.target.value, 10))
                }
              />
            </label>
          </section>

          <section className="settingsGroup">
            <label className="fieldRow">
              <span>Fields</span>
              <input
                value={draft.fields ?? ""}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, fields: event.target.value }))
                }
              />
            </label>

            <label className="checkRow">
              <input
                checked={!!draft.base64}
                type="checkbox"
                onChange={(event) =>
                  setDraft((value) => ({ ...value, base64: event.target.checked }))
                }
              />
              <span>Base64 request</span>
            </label>

            <label className="checkRow">
              <input
                checked={!!draft.wait}
                type="checkbox"
                onChange={(event) =>
                  setDraft((value) => ({ ...value, wait: event.target.checked }))
                }
              />
              <span>Wait response</span>
            </label>

            <div className="twoColumn">
              <label className="fieldRow">
                <span>Auth header</span>
                <input
                  value={draft.authnHeader ?? ""}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      authnHeader: event.target.value
                    }))
                  }
                />
              </label>
              <label className="fieldRow">
                <span>Auth token</span>
                <input
                  value={draft.authnToken ?? ""}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      authnToken: event.target.value
                    }))
                  }
                />
              </label>
            </div>
          </section>
        </div>

        <div className="modalFooter">
          <img alt="WfJ" src="/static/image/WfJlogo.png" />
          <button className="primaryButton" type="button" onClick={() => onSave(draft)}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
