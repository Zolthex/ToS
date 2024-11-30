export async function attributeRoll(attribute, actor, dice) {
    	let mod,
		flavor = "";
		flavor = actor.name + " würfelt";
		if (attribute) {
			console.log(actor.data);
		 	if (actor.data.data[attribute]?.value !== undefined) {
		 		mod = `+${actor.data.data[attribute].value}`;
		 		flavor = flavor + ` auf ${actor.data.data[attribute]?.name}`;
		 	}
		}
		const roll = new Roll(dice + mod);
		await roll.evaluate({ async: true });
		roll.toMessage({ flavor });
    return;
}