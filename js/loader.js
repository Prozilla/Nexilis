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

				// Add all elements from HTML file to parentElement
				for (let i = 0; i < tempParent.children.length; i++) {
					if (before) {
						parentElement.prepend(tempParent.children[i]);
					} else {
						parentElement.append(tempParent.children[i]);
					}
				}
			})
			.then(resolve("SUCCESS"));
	});
}

function getCurrentDirectory() {
	const path = window.location.pathname.replace(/\//g, " ").trim().split(" ")

	if (localHosting)
		path.shift();

	console.log(path, path.length);

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