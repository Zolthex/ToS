import {attributeRoll} from '../helpers/dice.js'

export default class toeloriaCharSheet extends ActorSheet {
	static get defaultOptions() {		
		return mergeObject(super.defaultOptions, {
			width: 847,
			height: 660,
			//scale: "vertical",
			//resizable: [false, vertical],
			//resizable: false,  // auskommentieren damit das Actorsheet wieder resized werden kann.
			template: "systems/toeloria/templates/sheets/CharSheet.hbs",
			classes: ["toeloria", "sheet", "CharSheet"],
			tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "stats" }],
		});
	}

	activateListeners(html) {
		super.activateListeners(html);
		if (this.isEditable) {
			html.find("[data-toe-roll], [data-toe-attribute]").on("click", this._rollAttributeCheck.bind(this));
			html.find("[data-toe-abroll], [data-toe-ability], [data-toe-abilattr]").on("click", this._rollAbilityCheck.bind(this));
			html.find("[data-toe-healroll]").on("click", this._rollHealCheck.bind(this));
			html.find("[data-toe-iniroll]").on("click", this._rollIniCheck.bind(this));
			html.find("[data-toe-dmgchange").on("click", this._setDagamge.bind(this));
			html.find("[data-toe-fabroll], [data-toe-fability], [data-toe-fabilattr], [data-toe-fvalue]").on("click", this._rollFeatCheck.bind(this));
			html.find(".rollable").on("click", this._onRoll.bind(this));
			html.find(".item-delete").on("click", (event) => this.onClickDeleteItem(event));
			html.find(".inline-edit").change(this._onSkillEdit.bind(this));
			html.find(".attr-edit").change(this._onAttrEdit.bind(this));
			html.find(".item-edit").click(this._onItemEdit.bind(this));
		}
	}

	async getData() {
		const character = this.actor;
		console.log("Test Character", character);
		console.log("Test This", this);
		// find all owners, which are the list of all potential masters
		const owners = Object.entries(character.data.permission)
			.filter(([_id, permission]) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
			.flatMap(([userID]) => game.users.get(userID) ?? []);

		// TEMPORARY solution for change in 0.8 where actor in super.getData() is an object instead of the data.
		// The correct solution is to subclass ActorSheetPF2e, but that is a more involved fix.
		const actorData = this.actor.toObject(false);
		const baseData = await super.getData();
		baseData.actor = actorData;
		baseData.data = actorData.data;
		const attributes = actorData.items.filter((s) => s.type === "Attributes")
		const skills = actorData.items.filter((s) => s.type === "Skills")
		const features = actorData.items.filter((s) => s.type === "Fertigkeiten")
		const itemsthings = actorData.items.filter((s) => s.type === "Items_2")
		const weapons = actorData.items.filter((s) => s.type === "Waffen")
		const guns = actorData.items.filter((s) => s.type === "Guns")
		const armors = actorData.items.filter((s) => s.type === "Armor")
		const companions = actorData.items.filter((s) => s.type === "Companions")
		const stacks = actorData.items.filter((s) => s.type === "Items")
		const stats = actorData.items.filter((s) => s.type === "Stats")
		
		console.log("armors: ", armors);
		let calculatedArmor = armors.reduce((previousValue, currentValue) => previousValue + currentValue.data.ArmorProtection.value, 0);
		this.armorMax(calculatedArmor);
		this.armortest();

		return {
			...baseData,
			owners,
			attributes,
			skills,
			features,
			itemsthings,
			weapons,
			guns,
			armors,
			companions,
			stacks,
			stats,
			calculatedArmor,
		};
	}

	armortest(){
		let actor = this.actor;
		console.log("Armor max.: ", actor.data.data.Armor.value);
	}

	armorMax(maxarmor){
		let actor = this.actor;
		console.log("Armor max.: ",maxarmor);
		return actor.update({'data.Armor.value': maxarmor});
	}
	
	async _onRoll(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		console.log("Testphase", dataset);
		let def = "";
		if (dataset.rollDef) {
			def = dataset.rollDef;
			console.log("Verteidigungsart: ", def);
		}
	
		// Handle rolls.
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) return item.roll(def);
			//} else if (dataset.rollType === "attribute") {
			//	return attributeRoll( dataset.attribute, this.actor );  
			// TempDamage
			}
		}
	}

	async _rollHealCheck(event) {
		event.preventDefault();
		const { toeHealroll } = event.currentTarget.dataset;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let actor = this.actor;
		let flavor = "";
		console.log(this.actor.data);

		const dmg = actor.data.data.Damage?.value ?? 0;
		const dmgreg = actor.data.data.HealBase?.value ?? 0;
		const place = actor.data.data.toeHealplace?.value ?? 0;
		const mana = actor.data.data.ChannelResources?.Mana ?? 0;
		const manareg = actor.data.data.ChannelResources?.ManaReg ?? 0;
		const manacom = actor.data.data.ChannelResources?.ManaCom ?? 0;
		
		const roll = new Roll(toeHealroll);
		//await roll.evaluate({ async: true });
		await roll.roll({ async: true });
		let calc_date = roll._total;

		let heal = Number(calc_date) + Number(dmgreg) + Number(place);
		let reg = Number(calc_date) + Number(manareg) + Number(place);
		let temp_heal = Number(dmg) - Number(heal);
		let temp_mana = Number(mana) + Number(reg);

		console.log("[...] = ", dmg, mana, calc_date, dmgreg, manareg, place);
		flavor = ` [Heilung] ${heal} [Regeneration] ${reg}`;

		roll.toMessage({ 
			speaker: speaker,
			rollMode: rollMode,
			flavor 
		});

		if (dmg <= heal)
		{
			if (temp_mana <= manacom) {
				return actor.update({'data.Damage.value': 0, 'data.ChannelResources.Mana': temp_mana});
			}
			else {
				return actor.update({'data.Damage.value': 0, 'data.ChannelResources.Mana': manacom});
			}
		}
		else {
			if (temp_mana <= manacom) {
				return actor.update({'data.Damage.value': temp_heal, 'data.ChannelResources.Mana': temp_mana});
			}
			else {
				return actor.update({'data.Damage.value': temp_heal, 'data.ChannelResources.Mana': manacom});
			}
		}
	}

	async _rollIniCheck(event) {
		event.preventDefault();
		const { toeIniroll } = event.currentTarget.dataset;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let actor = this.actor;
		let flavor = "";
		console.log(this.actor.data);

		const ini_bo = actor.data.data.Ini_Bonus?.value ?? 0;

		const roll = new Roll(toeIniroll);
		//await roll.evaluate({ async: true });
		await roll.roll({ async: true });
		let calc_date = roll._total;

		let ini_roll = Number(calc_date) + Number(ini_bo);

		//console.log("[...] = ", dmg, mana, calc_date, dmgreg, manareg, place);
		flavor = ` [Initiative] -> ${ini_roll}`;

		roll.toMessage({ 
			speaker: speaker,
			rollMode: rollMode,
			flavor 
		});
	}

	async _rollAttributeCheck(event) {
		event.preventDefault();
		const { toeRoll, toeAttribute } = event.currentTarget.dataset;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let mod,
			flavor = "";
		if (toeAttribute) {
			console.log(this.actor.data);
			if (this.actor.data.data[toeAttribute]?.value !== undefined) {
				mod = `+${this.actor.data.data[toeAttribute].value}`;
				flavor = flavor + ` [Attribut] ${this.actor.data.data[toeAttribute]?.name}`;
			}
		}
		const roll = new Roll(toeRoll + mod);
		await roll.evaluate({ async: true });
		roll.toMessage({ 
			speaker: speaker,
			rollMode: rollMode,
			flavor 
		});
	}

	async _rollAbilityCheck(event) {
		event.preventDefault();
		const { toeAbroll, toeAbility, toeAbilattr } = event.currentTarget.dataset;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let mod,
			mod_2,
			flavor = "";
		console.log("[Fertigkeit] = ", toeAbility);
		console.log("[Attribut] = ", toeAbilattr);
		if (toeAbility) {
			if (toeAbilattr) {
				console.log(this.actor.data);
				if (this.actor.data.data[toeAbility]?.value !== undefined) {
					mod = `+${this.actor.data.data[toeAbility].value}`;
					mod_2 = `+${this.actor.data.data[toeAbilattr].value}`;
					flavor = ` [Fertigkeit] ${this.actor.data.data[toeAbility]?.name}`;
					console.log("[Fertigkeit] = ", `${this.actor.data.data[toeAbility]?.name}`);
				}
			}
		}
		console.log("Mod 1 = ", mod);
		console.log("Mod 2 = ", mod_2);
		const roll = new Roll(toeAbroll + mod + mod_2);
		await roll.evaluate({ async: true });
		roll.toMessage({ 
			speaker: speaker,
			rollMode: rollMode,
			flavor 
		});
	}

	async _rollFeatCheck(event) {
		event.preventDefault();		
		const { toeFabroll, toeFability, toeFabilattr, toeFvalue  } = event.currentTarget.dataset;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let mod,
			mod_2,
			flavor = "";
		console.log("[Fertigkeit] = ", toeFability);
		console.log("[Attribut] = ", toeFabilattr);
		console.log("[Wert] = ", toeFvalue);
		if (toeFability) {
			if (toeFabilattr) {
				console.log(this.actor.data);
				if (toeFvalue !== undefined) {
					console.log("[Mod Calculation]");
					mod = `+` + toeFvalue;
					mod_2 = `+${this.actor.data.data[toeFabilattr].value}`;
					flavor = ` [Fertigkeit] ` + toeFability;
					console.log("[Fertigkeit] = ", toeFability);
				}
			}
		}
		console.log("Mod 1 = ", mod);
		console.log("Mod 2 = ", mod_2);
		const roll = new Roll(toeFabroll + mod + mod_2);
		await roll.evaluate({ async: true });
		roll.toMessage({ 
			speaker: speaker,
			rollMode: rollMode,
			flavor 
		});
	}

	async onClickDeleteItem(event) {
        const li = $(event.currentTarget).closest(".item");
        const itemId = li.attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);

		await item.delete();
    }

	async _onSkillEdit(event) {
		event.preventDefault();
		let element = event.currentTarget;
		//let itemId = element.closest(".item").dataset.itemId;
		//let item = this.actor.getOwnedItem(itemId);
		let field = element.dataset.field;

		if (field === "Created") {	
			let actor = this.actor;
			let val_created = true;
			let mana =  Number(this.actor.data.data.ChannelResources.ManaCom);
			return actor.update({'data.ChannelResources.Mana': mana, 'data.Created.value': val_created});
		}
		else {			
			console.log("Field: ", field);
			console.log("element.value: ", element.value);
			let itemId = element.closest(".item").dataset.itemId;
			let item = this.actor.getOwnedItem(itemId);
			return item.update({ [field]: element.value });
		}
	}

	async _setDagamge(event) {
		event.preventDefault();
		const { toeDmgchange  } = event.currentTarget.dataset;
		let element = event.currentTarget;
		let field = element.dataset.field;

		let actor = this.actor;
		let temp_dmg = actor.data.data[toeDmgchange].value;
		let true_dmg = actor.data.data.Damage?.value ?? 0;
		let damage = Number(temp_dmg) + Number(true_dmg);
		let zero = Number(0);

		console.log("Damage before: ", true_dmg);
		console.log("Field: ", field);
		console.log("element.value: ", element.value);
		console.log("Add Damage: ", damage);

		return actor.update({'data.Damage.value': damage, 'data.GetDamage.value': zero});
	}

	async _onAttrEdit(event) {
		event.preventDefault();		

		let element = event.currentTarget;
		let att = element.dataset.att;
		let field = element.dataset.field;
		let actor = this.actor;

		console.log("Übergabewert = ", { [field]: element.value }, ", Attr = ", att);
		console.log("element.value: ", element.value);
		
		switch (att) {
			case "Strength":
			/*
				* Ausdauer = Körperkraft + Reflexe&Sinne – 2
				* Gesundheit/Lebenspunkte = 20 + (3 x Körperkraft) + Verstand + Askese + Seelenkraft
				* Schadens-Modifikator = Körperkraft + 1
				* Todesschwellen-Wert = Körperkraft + 4
				* Anzahl Komarunden = Körperkraft + 2
				* Heilung = Körperkraft
				* Ausweichen: Reflexe&Sinne + (2 x Körperkraft) + Ausweichen + Geschicklichkeit - Malus - 6
				* Parade: Reflexe&Sinne + (2 x Körperkraft) + Paradewert + Waffenparade - Malus - 6
				* Resistieren: Körperkraft + Resistieren-Wert + Rüstungs-Wert - 3
			*/
				let val_01 = Number(element.value) + Number(this.actor.data.data.Perception.value) - Number(2);
				let val_02 = Number(20) + Number(element.value) + (Number(this.actor.data.data.Strength.value)*3) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.Soul.value);
				let val_03 = Number(element.value) + Number(1);
				let val_04 = Number(element.value) + Number(4);
				let val_05 = Number(element.value) + Number(2);
				let val_06 = Number(element.value);
				let val_07 = (Number(element.value)*2) + Number(this.actor.data.data.Perception.value) + Number(this.actor.data.data.Dodge.value) + Number(this.actor.data.data.Dexterity.value) - Number(this.actor.data.data.Penalty.value) - Number(6);
				let val_08 = (Number(element.value)*2) + Number(this.actor.data.data.Perception.value) + Number(this.actor.data.data.Parry.value) + Number(this.actor.data.data.Dexterity.value) - Number(this.actor.data.data.Penalty.value) - Number(6);
				let val_09 = Number(element.value) + Number(this.actor.data.data.Resist.value) + Number(this.actor.data.data.Armor.value) - Number(3);
				return actor.update({'data.Stamina.value': val_01, 'data.LP.value': val_02, 'data.Penalty.value': val_03, 'data.DeathThreshold.value': val_04, 'data.ComaRounds.value': val_05, 'data.HealBase.value': val_06, 'data.Dodge.value': val_07, 'data.Parry.value': val_08, 'data.Resist.value': val_09});
			case "Dexterity":
			/*
				* Ini-Bonus = Geschicklichkeit + (2x Reflexe&Sinne) - 4 
				* Initiative: Geschicklichkeit + Sinne + Reflexe - 4
				* Ausweichen: Reflexe&Sinne + (2 x Körperkraft) + Ausweichen + Geschicklichkeit - Malus - 6
			*/				
				let val_10 = Number(element.value) + (Number(this.actor.data.data.Perception.value)*2) - Number(4);
				let val_11 = Number(element.value) + Number(this.actor.data.data.Perception.value) - Number(4);
				let val_12 = Number(element.value) + Number(this.actor.data.data.Perception.value) + Number(this.actor.data.data.Dodge.value) + (Number(this.actor.data.data.Strength.value)*2) - Number(this.actor.data.data.Penalty.value) - Number(6);
				return actor.update({'data.Ini_Bonus.value': val_10, 'data.Initiative.value': val_11, 'data.Dodge.value': val_12});
			case "Perception":
			/*
				* Ini-Bonus = Geschicklichkeit + (2x Reflexe&Sinne) - 4 
				* Aktions-Runden = Reflexe&Sinne + Intuition - 4 
				* Ausdauer = Körperkraft + Reflexe&Sinne – 2
				* Initiative: Geschicklichkeit + Sinne + Reflexe - 4
				* Ausweichen: Reflexe&Sinne + (2 x Körperkraft) + Ausweichen + Geschicklichkeit - Malus - 6
				* Parade: Reflexe&Sinne + (2 x Körperkraft) + Paradewert + Waffenparade - Malus - 6
			*/				
				let val_13 = (Number(element.value)*2) + Number(this.actor.data.data.Dexterity.value) - Number(4);
				let val_14 = Number(element.value) + Number(this.actor.data.data.Intuition.value) - Number(4);
				let val_15 = Number(element.value) + Number(this.actor.data.data.Strength.value) - Number(2);
				let val_16 = Number(element.value) + Number(this.actor.data.data.Dexterity.value) - Number(4);
				let val_17 = Number(element.value) + Number(this.actor.data.data.Dexterity.value) + Number(this.actor.data.data.Dodge.value) + (Number(this.actor.data.data.Strength.value)*2) - Number(this.actor.data.data.Penalty.value) - Number(6);
				let val_18 = Number(element.value) + Number(this.actor.data.data.Dexterity.value) + (Number(this.actor.data.data.Strength.value)*2) + Number(this.actor.data.data.Dexterity.value) - Number(this.actor.data.data.Penalty.value) - Number(6);
				return actor.update({'data.Ini_Bonus.value': val_13, 'data.MainPower.value': val_14, 'data.Stamina.value': val_15, 'data.Initiative.value': val_16, 'data.Dodge.value': val_17, 'data.Parry.value': val_18});
			case "Mind":
			/*
				* Magie-Runden = Reflexe&Sinne + Intuition - 4
				* Gesundheit/Lebenspunkte = 20 + (3 x Körperkraft) + Verstand + Askese + Seelenkraft
				* Kosmische Kraft = ((Verstand + Askese + Seelenkraft) x5)
				* Kosmische Regeneration = ((@{Presence}+@{Charisma})/2)
			*/				
				let val_19 = Number(element.value) + Number(this.actor.data.data.Manipulation.value) + Number(this.actor.data.data.SenseOfDanger.value) - Number(6);
				let val_20 = Number(20) + Number(element.value) + (Number(this.actor.data.data.Strength.value)*3) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.Soul.value);
				let val_39 = ((Number(element.value) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.Soul.value)) * Number(5));
				//console.log("Rückgabewert = (", Number(element.value), " + ", Number(this.actor.data.data.Manipulation.value), " + ",Number(this.actor.data.data.SenseOfDanger.value), " = ", val_1, ")");
				return actor.update({'data.MagicPower.value': val_19, 'data.LP.value': val_20, 'data.ChannelResources.ManaCom' : val_39});
			case "Soul":
			/*
				* Segens-Runden = Seelenskraft + Diplomatie + Intuition - 6 
				* Gesundheit/Lebenspunkte = 20 + (3 x Körperkraft) + Verstand + Askese + Seelenkraft
			*/				
				let val_21 = Number(element.value) + Number(this.actor.data.data.Intuition.value) + Number(this.actor.data.data.Diplomacy.value) - Number(6);
				let val_22 = Number(20) + Number(element.value) + (Number(this.actor.data.data.Strength.value)*3) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.Mind.value);
				let val_40 = ((Number(element.value) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.Mind.value)) * Number(5));
				return actor.update({'data.FaithPower.value': val_21, 'data.LP.value': val_22, 'data.ChannelResources.ManaCom' : val_40});
			case "Spirit":
			/*
				* Askese-Runden = Askese + Charisma + Kosmos-Einklang- 6 
				* Gesundheit/Lebenspunkte = 20 + (3 x Körperkraft) + Verstand + Askese + Seelenkraft
				* Widerstehen = Askese + Willensstärke
			*/				
				let val_23 = Number(element.value) + Number(this.actor.data.data.Charisma.value) + Number(this.actor.data.data.CosmosConsistent.value) - Number(6);
				let val_24 = Number(20) + Number(element.value) + (Number(this.actor.data.data.Strength.value)*3) + Number(this.actor.data.data.Soul.value) + Number(this.actor.data.data.Mind.value);
				let val_25 = Number(element.value) + Number(this.actor.data.data.Willpower.value);
				let val_41 = ((Number(element.value) + Number(this.actor.data.data.Soul.value) + Number(this.actor.data.data.Mind.value)) * Number(5));
				return actor.update({'data.SpiritPower.value': val_23, 'data.LP.value': val_24, 'data.WillMainPower.value': val_25, 'data.ChannelResources.ManaCom' : val_41});
			case "Charisma":
			/*
				* Askese-Runden = Askese + Charisma + Kosmos-Einklang- 6 
			*/				
				let val_26 = Number(element.value) + Number(this.actor.data.data.Spirit.value) + Number(this.actor.data.data.CosmosConsistent.value) - Number(6);
				return actor.update({'data.SpiritPower.value': val_26});
			case "Manipulation":
			/*
				* Magie-Runden = Verstand + Manipulation + Gefahreninstikt - 6
			*/	
				let val_27 = Number(element.value) + Number(this.actor.data.data.Mind.value) + Number(this.actor.data.data.SenseOfDanger.value) - Number(6);
				return actor.update({'data.MagicPower.value': val_27});
			case "Diplomacy":
			/*
				* Segens-Runden = Seelenskraft + Diplomatie + Intuition - 6 
			*/				
				let val_28 = Number(element.value) + Number(this.actor.data.data.Intuition.value) + Number(this.actor.data.data.Soul.value) - Number(6);
				return actor.update({'data.FaithPower.value': val_28});
			case "Intuition":
			/*
				* Segens-Runden = Seelenskraft + Diplomatie + Intuition - 6 
				* Aktions-Runden = Reflexe&Sinne + Intuition - 4 
			*/
				let val_29 = Number(element.value) + Number(this.actor.data.data.Diplomacy.value) + Number(this.actor.data.data.Soul.value) - Number(6);
				let val_30 = Number(element.value) + Number(this.actor.data.data.Perception.value) - Number(4);
				let val_42 = Math.floor((Number(this.actor.data.data.CosmosConsistent.value) + Number(this.actor.data.data.SenseOfDanger.value) + Number(this.actor.data.data.Intuition.value)) /  Number(3));
				return actor.update({'data.FaithPower.value': val_29, 'data.MainPower.value': val_30, 'data.ChannelResources.ManaReg' : val_42});
			case "SenseOfDanger":
			/*
				* Magie-Runden = Verstand + Manipulation + Gefahreninstikt - 6
			*/				
				let val_31 = Number(element.value) + Number(this.actor.data.data.Manipulation.value) + Number(this.actor.data.data.Mind.value) - Number(6);
				let val_43 = Math.floor((Number(this.actor.data.data.CosmosConsistent.value) + Number(this.actor.data.data.SenseOfDanger.value) + Number(this.actor.data.data.Intuition.value)) /  Number(3));
				return actor.update({'data.MagicPower.value': val_31, 'data.ChannelResources.ManaReg' : val_43});
			case "CosmosConsistent":
			/*
				* Askese-Runden = Askese + Charisma + Kosmos-Einklang- 6 
			*/				
				let val_32 = Number(element.value) + Number(this.actor.data.data.Charisma.value) + Number(this.actor.data.data.Spirit.value) - Number(6);
				let val_44 = Math.floor((Number(this.actor.data.data.CosmosConsistent.value) + Number(this.actor.data.data.SenseOfDanger.value) + Number(this.actor.data.data.Intuition.value)) /  Number(3));
				return actor.update({'data.SpiritPower.value': val_32, 'data.ChannelResources.ManaReg' : val_44});
			case "Evade":
			/*
				* Ausweichen: Reflexe&Sinne + (2 x Körperkraft) + Ausweichen + Geschicklichkeit - Malus - 6
			*/		
				let val_33 = Number(element.value) + Number(this.actor.data.data.Perception.value) + (Number(this.actor.data.data.Strength.value)*2) + Number(this.actor.data.data.Dexterity.value) - Number(this.actor.data.data.Penalty.value) - Number(6);		
				return actor.update({'data.Dodge.value': val_33});
			case "Thwart":
			/*
				* Parade: Reflexe&Sinne + (2 x Körperkraft) + Paradewert + Waffenparade - Malus - 6
			*/		
				let val_34 = Number(element.value) + Number(this.actor.data.data.Perception.value) + (Number(this.actor.data.data.Strength.value)*2) + Number(this.actor.data.data.Dexterity.value) - Number(this.actor.data.data.Penalty.value) - Number(6);
				return actor.update({'data.Parry.value': val_34});
			case "Sustain":
			/*
				* Resistieren: Körperkraft + Resistieren-Wert + Rüstungs-Wert - 3
			*/				
				let val_35 = Number(element.value) + Number(this.actor.data.data.Strength.value) + Number(this.actor.data.data.Armor.value) - Number(3);
				return actor.update({'data.Resist.value': val_35});
			case "Melee":
					let val_36 = Number(element.value);
					return actor.update({'data.MeleeValue.value': val_36});
			case "RangedCombat":
					let val_37 = Number(element.value);
					return actor.update({'data.RangedCombatValue.value': val_37});
			case "EPcom":
					let val_38 = Math.floor((Number(element.value)/10)+1);
					return actor.update({'data.CharLevel.value': val_38});
			default:
				break;
		}
	}

	async _onItemEdit(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let itemId = element.closest(".item").dataset.itemId;
		let item = this.actor.getOwnedItem(itemId);
		
		item.sheet.render(true);
	}
}
