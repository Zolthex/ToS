export default class toeloriaItem extends Item {
	prepareData() {
		super.prepareData();
	}

	getRollData() {
		// If present, return the actor's roll data.
		if (!this.actor) return null;
		const rollData = this.actor.getRollData();
		rollData.item = foundry.utils.deepClone(this.data.data);

		return rollData;
	}

	// getFormula() {
	// 	const item = this.data;
	// 	if (this.type = "Skills") {
	// 		const anwendungsstufe = item.SkillUsage?.value;
	// 		let formula = `1d12 + ${anwendungsstufe}`;
	// 		return formula;
	// 	}
	// 	return null;
	// }

	defenseCalculation(calc, armor) {
		let actor = this.actor;
		let temp = actor.data.data.TempDamage.value;
		//let armor = actor.data.data.Armor.value;
		let pastdamage = actor.data.data.Damage.value;
		let angr = actor.data.data.AngRoll.value
		//let hp = actor.data.data.LP.value;
		console.log("Defense");
		
		if (calc < angr) {
			if (temp > 0) {
				let damage = Number(temp) - Number(armor);
				console.log("Temp > 0");
				if (damage > 0){				
					console.log("Schadensoutput: ", damage);
					let truedamage = Number(pastdamage) + Number(damage);
					return actor.update({'data.TempDamage.value': 0, 'data.Damage.value': truedamage, 'data.AngRoll.value': 0});
				}
				return actor.update({'data.TempDamage.value': 0, 'data.AngRoll.value': 0});
			}
		}
		else {
			return actor.update({'data.TempDamage.value': 0, 'data.AngRoll.value': 0});
		}
		console.log("Defense Ende");
	}

	fightCalculation(calc, dmg) {
		let myTarget = Array.from(game.user.targets)[0];
		let actid = myTarget.data.actorId;
		console.log("Target: ", myTarget);

		let actor = game.actors.get(actid); //get target as actor
		let targ = actor.data.data.LP.value;
		console.log("Target: ", actor);
		console.log("Target HP: ", targ);

		let loseHP = Number(targ) - Number(dmg);
		console.log("HP fallen von: ", targ, " auf ", loseHP);

		let hit = actor.data.data.TempDamage.value + dmg;
		let angroll = Number(calc);

		//let def = Number(actor.data.data.Armor.value) + Number(actor.data.data.attributes.prof);
		//let r = new Roll("1d12 + @defense", {defense: def}); r.evaluate();
		return actor.update({'data.TempDamage.value': hit, 'data.AngRoll.value': angroll});
	}

	async roll(dataset) {
		const item = this.data;
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		let label = `[${item.type}] ${item.name}`;

		let content = item.data.description ?? "";

		let actor = this.actor;

		console.log("Label: ", item.type);

		if (!item.data.formula) {
			console.log("Step 1");
			ChatMessage.create({
				speaker: speaker,
				rollMode: rollMode,
				flavor: label,
				content,
			});
		}
		else {			
			const rollData = this.getRollData();
			const roll = new Roll(rollData.item.formula, rollData)  //Muss angeglichen werden
			await roll.roll({async: true});

			let calc_date = roll._total;
			console.log("Temp DMG: ", calc_date);

			if (item.type === "Waffen" || item.type === "Guns") {
				console.log("Waffe");
				const dmg = item.data.WeaponDamage?.value ?? 0;
				const typ = item.data.Typus?.value ?? 0;
				const ench = item.data.EnchantValue?.value ?? 0;
				const cat = item.data.Category.value;
				const catval = item.data.CategoryValue?.value ?? 0;
				const fightbonus = actor.data.data.Melee.value;
				
				let weapenbonus = actor.data.data[item.data.TypeName.value].value;

				let bonus = Number(ench) + Number(fightbonus) + Number(weapenbonus);
				let compl = Number(dmg) + Number(bonus);
				let calc = 0;

				if (cat === "Trefferbonus") {
					calc = Number(calc_date) + Number(catval); // Für verbesserte Trefferchance
				}
				else {
					calc = Number(calc_date);					
				}

				label = `Angriff an mit ` + item.name + `(+${ench}) [${typ}] <br>Schaden: ${compl} (${dmg} + ${bonus}) / Treffenwert: ${calc} (${calc_date} + ${catval})`;
				console.log("Waffen-Label: ", label);
				
				//await this.fightCalculation(calc, compl);
				console.log("Waffen-Schaden: ", compl, " Treffenwert: ", calc);
			}
			else if (item.type === "Armor") {
				console.log("Rüstung");
				const def = actor.data.data.Armor?.value ?? 0;				
				const typ = item.data.Type?.value ?? 0;
				const ench = item.data.EnchantValue?.value ?? 0;
				const cat = item.data.Category.value;
				const catval = item.data.CategoryValue?.value ?? 0;
				const res = actor.data.data.Resist?.value ?? 0;         // Ausweichen muss noch hinzugefügt werden
				const dod = actor.data.data.Dodge?.value ?? 0;
				const par = actor.data.data.Parry?.value ?? 0;				

				let calc = 0;
				
				if (cat === "Verteidigungsbonus") {
					if (dataset == "Abwehr") {
						calc = Number(calc_date) + Number(catval) + Number(par); // Für verbesserte Trefferchance
					}
					else {
						calc = Number(calc_date) + Number(dod); // Für verbesserte Trefferchance
					}
				}
				else {
					if (dataset == "Abwehr") {
						calc = Number(calc_date) + Number(par);
					}
					else {
						calc = Number(calc_date) + Number(dod);
					}
				}

				let cat_par = 0;
				if (dataset == "Abwehr") {
					cat_par = Number(catval) + Number(par);
				}
				else {
					cat_par = Number(dod);
				}
				
				let compl = Number(ench) + Number(def) + Number(res);
				let enc_res = Number(ench) + Number(res);
				
				if (dataset == "Abwehr") {
					if (item.name === "Schild") {
						label = `Verteidigt sich mit ` + item.name + `(+${ench}) [${typ}] <br>Schutz: ${compl} (${def} + ${enc_res}) / Abwehrwert: ${calc} (${calc_date} + ${cat_par})`;
					}
					else {
						label = `Schützt sich nur durch Rüstung: (+${ench}) [${typ}] <br>Schutz: ${compl} (${def} + ${enc_res}) / Abwehrwert: ${calc} (${calc_date} + ${cat_par})`;
					}
				}
				else {
					label = `Versucht auszuweichen. Ausweichwert: ${calc} (${calc_date} + ${cat_par})`;
				}
				//label = `Verteidigt sich mit ` + item.name + `(+${ench}) [${typ}] <br>Schutz: ${compl} (${def} + ${enc_res}) / Abwehrwert: ${calc} (${calc_date} + ${cat_par})`;
				console.log("Rüstungs-Label: ", label);
				//await this.defenseCalculation(calc, compl);
			}
			else {
				console.log("Gabe");
				label = this.enhanceRollFlavor(roll, label, item);
				console.log("Label: ", label);
			}

			roll.toMessage({
				speaker: speaker,
				rollMode: rollMode,
				flavor: label,
			});
			//console.log("Temp DMG 2: ", actor.data.data.TempDamage.value);
			return roll;
		}
	}

	//enhanceRollFlavor(roll, label, item) {
	//	if (this.type === "Skills") {
	//		const anwendungsstufe = item.data.SkillUsage?.value ?? 0;
	//		const SkillDifficult = (8 - anwendungsstufe);
	//		if ( roll.total > SkillDifficult ) {
	//			return label + ` Erfolg (diff: ${SkillDifficult})`
	//		} else {
	//			return label + ` Misserfolg (diff: ${SkillDifficult})`
	//		}
	//	}
		//if (this.type === "Attrs") {
		//	const anwendungsstufe = item.data.SkillUsage?.value ?? 0;
		//	const SkillDifficult = (8 - anwendungsstufe);
		//	if ( roll.total > SkillDifficult ) {
		//		return label + ` Erfolg (diff: ${SkillDifficult})`
		//	} else {
		//		return label + ` Misserfolg (diff: ${SkillDifficult})`
		//	}
		//}
	//}

   
	async myManaBurn(actor, burn) {	
		console.log("burn = ", burn);
		let mana = Number(burn);
		return actor.update({'data.ChannelResources.Mana': mana});
	}

	enhanceRollFlavor(roll, label, item) {
        if (this.type === "Skills") {
            const anwendungsstufe = item.data.SkillUsage?.value ?? 0;
            const skillrang = item.data.SkillValue?.value ?? 0;
            const difficult = item.data.SkillDifficult?.value ?? 0;
			const typus = item.data.SkillTypus?.value ?? 0;
			const actor = item.document.actor.data;
			const actorsheet = this.actor;
			
			console.log("Typus = ", typus);

            let kanalisierung = 0;
            if ( typus === "Magie" ) {
                kanalisierung = actor.data.Channeling?.Magie ?? 0;
				console.log("Kanalisierung (Magie) = ", kanalisierung);
            }
            else if ( typus === "Segen" ) {
                kanalisierung = actor.data.Channeling?.Faith ?? 0;
				console.log("Kanalisierung (Glaube) = ", kanalisierung);
            }
            else if ( typus === "Askese" ) {
                kanalisierung = actor.data.Channeling?.Spirit ?? 0;
				console.log("Kanalisierung (Askese) = ", kanalisierung);
            }
			console.log(" ");
			console.log("Difficult = ", difficult);
			console.log("Anwendungsstufe = ", anwendungsstufe);
			console.log("Kanalisierung = ", kanalisierung);
			console.log("Skillrang = ", skillrang);            
			let skilldiff = (Number(difficult) + Number(anwendungsstufe) - Number(kanalisierung) - Number(skillrang));
			console.log(" ");
			console.log("Skill-Difficult (math) = ",skilldiff);
			if ( skilldiff > 12 ) { skilldiff = Number(12);}
			console.log("Skill-Difficult (ready) = ",skilldiff);

            if ( roll.total >= skilldiff ) {
                const manaressourcen = actor.data.ChannelResources?.Mana ?? 0;				
				if ( anwendungsstufe > manaressourcen ) {
					let manaburn = 0;
					console.log("manaburn = ", manaburn);
					this.myManaBurn(actor, manaburn);
					actorsheet.sheet.render(true);
					this.myManaBurn(actor, manaburn);
					return label + ` Misserfolg weil zu wenig Mana (diff: ${skilldiff})`
				}
				else {
					let manaburn = Number(manaressourcen) - Number(anwendungsstufe);
					console.log("manaburn = ", manaburn);
					this.myManaBurn(actor, manaburn);
					actorsheet.sheet.render(true);
					this.myManaBurn(actor, manaburn);
					return label + ` Erfolg (diff: ${skilldiff})`
				}
                // Valueänderung von actor.data.ChannelResources.Mana um die größe von anwendungsstufe.
                // Wenn actor.data.ChannelResources.Mana > anwendungsstufe, dann keinen Wurf ausführen sondern:
                // Warnung das nicht genug Kosmische Kraft dazu vorhanden ist.
                
            } else {
                const manaressourcen = actor.data.ChannelResources?.Mana ?? 0;
                // Valueänderung von actor.data.ChannelResources.Mana um die größe von anwendungsstufe.
                // ?? actor.data.ChannelResources.Mana = actor.data.ChannelResources.Mana - anwendungsstufe ??
                // Wenn actor.data.ChannelResources.Mana > anwendungsstufe, dann keinen Wurf ausführen sondern:
                // Warnung das nicht genug Kosmische Kraft dazu vorhanden ist.
				
				if ( anwendungsstufe > manaressourcen ) {
					let manaburn = 0;
					console.log("manaburn = ", manaburn);
					this.myManaBurn(actor, manaburn);
					actorsheet.sheet.render(true);
					this.myManaBurn(actor, manaburn);
					return label + ` Misserfolg und zu wenig Mana (diff: ${skilldiff})`
				}
				else {
					let manaburn = Number(manaressourcen) - Number(anwendungsstufe);
					console.log("manaburn = ", manaburn);
					this.myManaBurn(actor, manaburn);
					actorsheet.sheet.render(true);
					this.myManaBurn(actor, manaburn);
					return label + ` Misserfolg (diff: ${skilldiff})`
				}
            }
        }
    }
}
