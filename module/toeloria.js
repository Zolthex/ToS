import toeloriaItemSheet from "./sheets/toeloriaItemSheet.js";
import toeloriaCharSheet from "./sheets/toeloriaCharSheet.js";
import toeloriaItem from "./documents/item.js";

Hooks.once("init", async function () {
	console.log("toeloria | Initialising Tales of Eloria System");

	CONFIG.Item.documentClass = toeloriaItem;

	CONFIG.Combat.initiative.formular = "1d6 + @Ini_Bonus";
	//Combat.prototype._getInitiativeFormular = _getInitiativeFormular;

	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("toeloria", toeloriaItemSheet, { makeDefault: true });

	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("toeloria", toeloriaCharSheet, { makeDefault: true });

	await preloadHandlebarsTemplates();
});

async function preloadHandlebarsTemplates() {
	const templatesPath = [
		"systems/toeloria/templates/sheets/character/actor-notes.html",
		"systems/toeloria/templates/sheets/character/actor-attributes.html",
		"systems/toeloria/templates/sheets/character/actor-features.html",
		"systems/toeloria/templates/sheets/character/actor-inventory.html",
		"systems/toeloria/templates/sheets/character/actor-spellbook.html",
		"systems/toeloria/templates/sheets/character/actor-companions.html",
		"systems/toeloria/templates/sheets/character/actor-weapon.html",
		"systems/toeloria/templates/sheets/character/actor-stats.html",
		"systems/toeloria/templates/sheets/CharSheet.hbs",
	];
	return loadTemplates(templatesPath);
}
