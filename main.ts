import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

import dirtreeist, { Options as DirtreeistOptions } from "@k4a_l/dirtreeist";

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
			(source, el, ctx) => {
				const result = dirtreeist(source, this.settings);
				const div = el.createEl("div");

				div.innerText = result.reduce((prev, dirtree, index) => {
					return prev + (index !== 0 ? "\n\n" : "") + dirtree;
				});
			}
		);

		this.addSettingTab(new DirtreeistSettingTab(this.app, this));
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
		new Setting(containerEl).setName("treeType").addDropdown((text) =>
			text
				.addOptions(treeTypeOptions)
				.setValue(this.plugin.settings.treeType)
				.onChange(async (value: DirtreeistSettings["treeType"]) => {
					this.plugin.settings.treeType = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName("emptyBeforeUpperHierarche")
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

		new Setting(containerEl).setName("spaceBeforeName").addToggle((text) =>
			text
				.setValue(this.plugin.settings.spaceBeforeName)
				.onChange(
					async (value: DirtreeistSettings["spaceBeforeName"]) => {
						this.plugin.settings.spaceBeforeName = value;
						await this.plugin.saveSettings();
					}
				)
		);

		new Setting(containerEl).setName("spaceSize").addDropdown((text) =>
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
