import {
	type Options as DirtreeistOptions,
	defaultOptions,
	type Line,
	layout,
	memoAlignValues,
	parse,
	treeTypeValues,
} from "@k4a_l/dirtreeist";
import {
	type App,
	MarkdownRenderer,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

type DirtreeistSettings = Required<DirtreeistOptions>;

const DEFAULT_SETTINGS: DirtreeistSettings = {
	...defaultOptions,
	delimiter: "--",
	noteIndentSize: 4,
};

export default class Dirtreeist extends Plugin {
	settings!: DirtreeistSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			"dirtree",
			async (source, el, ctx) => {
				const pre = el.createEl("pre", { cls: "language-dirtree" });
				const code = pre.createEl("code", {
					cls: "language-dirtree is-loaded",
					attr: { "data-line": "0" },
				});

				const settings: DirtreeistSettings = {
					...this.settings,
				};
				const lines = parse(source, settings)
					.map((dirTree) => layout(dirTree, settings))
					.reduce<(Line | null)[]>((prev, treeLines, index) => {
						if (index !== 0) prev.push(null);
						return prev.concat(treeLines);
					}, []);

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];

					if (line !== null) {
						await this.renderLine(line, code, ctx.sourcePath);
					}

					if (i < lines.length - 1) {
						code.appendText("\n");
					}
				}
			},
		);

		this.addSettingTab(new DirtreeistSettingTab(this.app, this));
	}

	/**
	 * Renders one laid-out line. Whitespace fields are already aligned by
	 * layout(), so they are emitted verbatim and only the text fields go
	 * through the Markdown renderer.
	 */
	async renderLine(line: Line, code: HTMLElement, sourcePath: string) {
		if (line.branch) {
			code.createSpan({ cls: "dirtree-connector", text: line.branch });
		}

		if (line.type === "empty") {
			return;
		}

		if (line.type === "note") {
			code.appendText(line.gap + line.indent);
			const memoSpan = code.createSpan({
				cls: `dirtree-memo dirtree-memo-depth-${line.depth}`,
			});
			if (line.bullet) {
				memoSpan.createSpan({
					cls: "dirtree-memo-bullet",
					text: line.bullet,
				});
			}
			await this.renderInlineMarkdown(line.text, memoSpan, sourcePath);
			return;
		}

		// A trailing slash marks a directory, matching how names are authored.
		const isDir = line.name.replace(/^\s+/, "").startsWith("/");
		const nameSpan = code.createSpan({
			cls: `dirtree-${isDir ? "dir" : "file"}`,
		});
		await this.renderInlineMarkdown(line.name, nameSpan, sourcePath);

		if (line.gap) {
			code.appendText(line.gap);
		}

		if (line.memo) {
			const memoSpan = code.createSpan({ cls: "dirtree-memo" });
			await this.renderInlineMarkdown(line.memo, memoSpan, sourcePath);
		}
	}

	async renderInlineMarkdown(
		markdown: string,
		el: HTMLElement,
		sourcePath: string,
	) {
		// Leading whitespace would make Markdown treat the text as an indented
		// code block, so render it as plain text and keep only the rest as Markdown.
		const [, indent, rest] = markdown.match(/^(\s*)([\s\S]*)$/) as [
			string,
			string,
			string,
		];
		if (indent) {
			el.appendText(indent);
		}
		if (!rest) {
			return;
		}

		const temp = createSpan();
		await MarkdownRenderer.renderMarkdown(rest, temp, sourcePath, this);
		const p = temp.querySelector("p");
		if (p) {
			el.append(...Array.from(p.childNodes));
		} else {
			el.append(...Array.from(temp.childNodes));
		}
		temp.remove();
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class DirtreeistSettingTab extends PluginSettingTab {
	plugin: Dirtreeist;

	constructor(app: App, plugin: Dirtreeist) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.createArraySetting(
			containerEl,
			{ id: "treeType", displayName: "Tree type" },
			treeTypeValues,
			(v) => (this.plugin.settings.treeType = v),
		);

		this.createBooleanSetting(containerEl, {
			id: "cjkFont",
			displayName: "CJK font",
		});

		this.createBooleanSetting(containerEl, {
			id: "keepMarkdown",
			displayName: "Keep markdown",
		});

		new Setting(containerEl).setName("Space").setHeading();

		this.createBooleanSetting(containerEl, {
			id: "emptyBeforeUpperHierarchy",
			displayName: "Insert empty line before upper hierarchy",
		});

		this.createBooleanSetting(containerEl, {
			id: "spaceBeforeName",
			displayName: "Insert space before Name",
		});

		new Setting(containerEl).setName("Space size").addDropdown((text) =>
			text
				.addOptions({ "1": "1", "2": "2", "3": "3", "4": "4" })
				.setValue(String(this.plugin.settings.spaceSize))
				.onChange(async (value: string) => {
					this.plugin.settings.spaceSize = Number(value);
					await this.plugin.saveSettings();
				}),
		);

		new Setting(containerEl).setName("Memo / Note").setHeading();

		this.createArraySetting(
			containerEl,
			{ id: "memoAlign", displayName: "Memo align" },
			memoAlignValues,
			(v) => (this.plugin.settings.memoAlign = v),
		);

		new Setting(containerEl)
			.setName("Memo max column")
			.setDesc("0 means no limit")
			.addSlider((text) =>
				text
					.setValue(this.plugin.settings.memoMaxColumn || 0)
					.setDynamicTooltip()
					.setLimits(-1, 500, 1)
					.onChange(async (value: number) => {
						this.plugin.settings.memoMaxColumn =
							value <= 0 ? 0 : value;
						await this.plugin.saveSettings();
					}),
			);

		this.createBooleanSetting(containerEl, {
			id: "noteAlignToMemo",
			displayName: "Note align to memo",
		});
	}

	private createBooleanSetting = <
		T extends keyof PickByType<DirtreeistSettings, boolean>,
	>(
		containerEl: HTMLElement,
		config: { id: T; displayName: string },
	) => {
		new Setting(containerEl).setName(config.displayName).addToggle((text) =>
			text
				.setValue(this.plugin.settings[config.id])
				.onChange(async (value: DirtreeistSettings[T]) => {
					this.plugin.settings[config.id] = value;
					await this.plugin.saveSettings();
				}),
		);
	};

	private createArraySetting = <T>(
		containerEl: HTMLElement,
		config: { id: keyof DirtreeistSettings; displayName: string },
		arr: readonly T[],
		setter: (v: T) => void,
	) => {
		new Setting(containerEl)
			.setName(config.displayName)
			.addDropdown((text) => {
				arr.forEach((value) => {
					text.addOption(String(value), String(value));
				});
				return text
					.setValue(String(this.plugin.settings[config.id]))
					.onChange(async (value) => {
						const v = arr.find((v) => String(v) === value);
						if (v) {
							setter(v);
							await this.plugin.saveSettings();
						}
					});
			});
	};
}

type PickByType<T, ValueType> = {
	[K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};
