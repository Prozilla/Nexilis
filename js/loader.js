// True if the website is hosted locally
let localHosting = window.location.pathname.startsWith("/spreddit/");

// Add base url
const baseElement = document.createElement("div");
baseElement.innerHTML = `<base href="${localHosting ? "/spreddit/" : "/"}">`;
document.head.appendChild(baseElement.firstChild);

// Dynamic html
function loadHtml(directory, parentElement, before) {
	return new Promise((resolve, reject) => {
		if (localHosting)
			directory = "/spreddit/" + directory;

		if (parentElement == null)
			return;

		fetch(directory)
			.then(data => data.text())
			.then((html) => {
				const tempParent = document.createElement("div");
				tempParent.innerHTML = html;

				// Add all elements from HTML file to parentElement (does not include comments)
				Array.from(tempParent.children).forEach(element => {
					if (before) {
						parentElement.prepend(element);
					} else {
						parentElement.append(element);
					}
				});
			})
			.then(resolve("SUCCESS"));
	});
}

function getCurrentDirectory() {
	let path = window.location.pathname.replace(/\//g, " ").trim();

	if (path.length == 0)
		return [];

	path = path.split(" ");

	if (localHosting)
		path.shift();

	return path;
}

// Load files
loadHtml("head.html", document.head, false);

// Load scripts
function loadJs(directory, isModule, parentElement) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = directory;

		if (isModule)
			script.type = "module";

		parentElement.appendChild(script);

		script.addEventListener("load", () => {
			resolve("SUCCESS");
		});
	});
}

loadJs("js/index.js", false, document.head);

if (getCurrentDirectory()[0] == "search") {
	loadJs("js/search.js", false, document.head);
}