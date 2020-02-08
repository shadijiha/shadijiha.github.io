/***
 *
 * Main file Shad HTML library
 */
/***
 * @function $(args)
 * @param {string} args : Expects an HTML element Type, ID or class. (Note: if you pass and ID, you need                           to put # before the ID. Example: "#myCanvas")
 * @returns {HTMLElement} : The requested HTML Element
 * @returns {null} : IF the HTML element doesn't exist
 */
function $(args) {
	return document.querySelector(args);
}

/***
 * @function getElement(args)
 * This function is the same as $(args).
 * @refer : Refer to $() documentation
 */
function getElement(args) {
	return $(args);
}

/***
 * @function createElement()
 * @param {string} type : Expects an HTML element type. Example, "div", "p", "input",...
 * @param {HTMLElement} parent optional: Where you want the new element to be created. DEFAULT: <body>
 * @returns {HTMLElement} : The created HTML element
 */
function createElement(type, parent) {
	const BODY = $("body");
	const ele = document.createElement(type);

	if (parent) {
		parent.appendChild(ele);
	} else {
		BODY.appendChild(ele);
	}

	return ele;
}

/***
 * @function deleteElement()
 * @param {HTMLElement} parent : The element you want to Delete
 * @returns {void}
 */
function deleteElement(element) {
	try {
		const PARENT = element.parentElement;
		PARENT.removeChild(element);
	} catch (e) {
		console.error(e.message);
	}
}
