import { App, Plugin, PluginSettingTab, Setting, MarkdownRenderer } from "obsidian";

import dirtreeist, { Options as DirtreeistOptions, symbolSets } from "@k4a_l/dirtreeist";

const escapeHtml = (str: string): string =>
	str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface DirtreeistSettings {
	treeType: Exclude<DirtreeistOptions["treeType"], undefined>;
	emptyBeforeUpperHierarche: Exclude<
		DirtreeistOptions["emptyBeforeUpperHierarche"],
		undefined
	>;
	spaceBeforeName: Exclude<DirtreeistOptions["spaceBeforeName"], undefined>;
	spaceSize: Exclude<DirtreeistOptions["spaceSize"], undefined>;
}

const DEFAULT_SETTINGS: DirtreeistSettings = {
	treeType: "normal",
	emptyBeforeUpperHierarche: false,
	spaceBeforeName: true,
	spaceSize: 2,
};

export default class Dirtreeist extends Plugin {
	settings: DirtreeistSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			"dirtree",
			async (source, el, ctx) => {
				const result = dirtreeist(source, this.settings);
				const pre = el.createEl("pre", { cls: "language-dirtree" });
				const code = pre.createEl("code", { cls: "language-dirtree is-loaded", attr: { "data-line": "0" } });

				const plain = result.reduce((prev, dirtree, index) => {
					return prev + (index !== 0 ? "\n\n" : "") + dirtree;
				});

				const { vertical, horizontal, crossing, end, space } = symbolSets[this.settings.treeType];

				const lines = plain.split("\n");
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const match = line.match(
						new RegExp(`^([${vertical}${space}]*[${end}${crossing}]*[${horizontal}]*)(.*)$`)
					);

					if (!match) {
						code.appendText(line);
					} else {
						const connector = match[1];
						const rest = match[2];

						const annoIdx = rest.indexOf(" \u2014 ");
						let name: string;
						let annotation: string;
						if (annoIdx !== -1) {
							name = rest.substring(0, annoIdx);
							annotation = rest.substring(annoIdx);
						} else {
							name = rest;
							annotation = "";
						}

						const trimmed = name.replace(/^\s+/, "");
						const isDir = trimmed.startsWith("/");

						if (connector) {
							code.createSpan({ cls: "dirtree-connector", text: connector });
						}

						if (name) {
							const nameSpan = code.createSpan({ cls: `dirtree-${isDir ? "dir" : "file"}` });
							await this.renderInlineMarkdown(name, nameSpan, ctx.sourcePath);
						}

						if (annotation) {
							const annotationSpan = code.createSpan({ cls: "dirtree-annotation" });
							await this.renderInlineMarkdown(annotation, annotationSpan, ctx.sourcePath);
						}
					}

					if (i < lines.length - 1) {
						code.appendText("\n");
					}
				}
			}
		);

		this.addSettingTab(new DirtreeistSettingTab(this.app, this));
	}

	async renderInlineMarkdown(markdown: string, el: HTMLElement, sourcePath: string) {
		const temp = createSpan();
		await MarkdownRenderer.renderMarkdown(markdown, temp, sourcePath, this);
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
			await this.loadData()
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

		const treeTypeOptions: Record<string, DirtreeistSettings["treeType"]> =
			{
				normal: "normal",
				bold: "bold",
				ascii: "ascii",
			};
		new Setting(containerEl).setName("Tree type").addDropdown((text) =>
			text
				.addOptions(treeTypeOptions)
				.setValue(this.plugin.settings.treeType)
				.onChange(async (value: DirtreeistSettings["treeType"]) => {
					this.plugin.settings.treeType = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName("Insert empty line before upper hierarche")
			.addToggle((text) =>
				text
					.setValue(this.plugin.settings.emptyBeforeUpperHierarche)
					.onChange(
						async (
							value: DirtreeistSettings["emptyBeforeUpperHierarche"]
						) => {
							this.plugin.settings.emptyBeforeUpperHierarche =
								value;
							await this.plugin.saveSettings();
						}
					)
			);

		new Setting(containerEl).setName("Insert space before Name").addToggle((text) =>
			text
				.setValue(this.plugin.settings.spaceBeforeName)
				.onChange(
					async (value: DirtreeistSettings["spaceBeforeName"]) => {
						this.plugin.settings.spaceBeforeName = value;
						await this.plugin.saveSettings();
					}
				)
		);

		new Setting(containerEl).setName("Space size").addDropdown((text) =>
			text
				.addOptions({ "1": "1", "2": "2", "3": "3", "4": "4" })
				.setValue(String(this.plugin.settings.spaceSize))
				.onChange(async (value: String) => {
					this.plugin.settings.spaceSize = Number(value);
					await this.plugin.saveSettings();
				})
		);
	}
}
