export default class toeloriaItemSheet extends ItemSheet {
	get template() {
		return `systems/toeloria/templates/sheets/${this.item.data.type}-sheet.html`;
	}

	async getData() {
		const itm = this.item;
		// find all owners, which are the list of all potential masters
		const owners = Object.entries(itm.data.permission)
			.filter(([_id, permission]) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
			.flatMap(([userID]) => game.users.get(userID) ?? []);

		// TEMPORARY solution for change in 0.8 where item in super.getData() is an object instead of the data.
		// The correct solution is to subclass itemSheetPF2e, but that is a more involved fix.
		const itemData = this.item.toObject(false);
		const baseData = await super.getData();
		baseData.item = itemData;
		baseData.data = itemData.data;

		return {
			...baseData,
		};
	}	
}
