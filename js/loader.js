// True if the website is hosted locally
let localHosting = window.location.pathname.startsWith("/spreddit/");

// Dynamic html
function appendHtml(html, parentElement, before) {
	const tempParent = document.createElement("div");
	tempParent.innerHTML = html;

	Array.from(tempParent.children).forEach(element => {
		if (before) {
			parentElement.prepend(element);
		} else {
			parentElement.append(element);
		}
	});
}

// Add base url
appendHtml( `<base href="${localHosting ? "/spreddit/" : "/"}">`, document.head);

function loadHtml(directory, parentElement, before) {
	return new Promise((resolve, reject) => {
		if (localHosting)
			directory = "/spreddit/" + directory;

		if (parentElement == null)
			return;

		fetch(directory)
			.then(data => data.text())
			.then((html) => appendHtml(html, parentElement, before))
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