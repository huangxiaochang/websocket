export function getType (val) {
	let typeStr = Object.prototype.toString.call(val);
	return typeStr.substring(8, typeStr.length - 1).toLowerCase();
}