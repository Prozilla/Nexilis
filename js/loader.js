const head = document.querySelector("head");
const div = document.createElement("div");

// True if the website is hosted locally
let localHosting = false;

if (window.location.pathname.startsWith("/spreddit/"))
{
	localHosting = true;

	// Add base url
	div.innerHTML = "<base href=\"/spreddit/\">";
	head.appendChild(div.firstChild);
}

const headUrl = localHosting ? "/spreddit/head.html" : "/head.html";

// Insert header
fetch(headUrl)
	.then(data => data.text())
	.then(html => head.innerHTML += html);

const headerUrl = window.location.pathname.startsWith("/spreddit/") ? "/spreddit/header.html" : "/header.html";

fetch(headerUrl)
	.then(data => data.text())
	.then(function(html) {
		div.innerHTML = html;
		for (let i = 0; i < div.children.length; i++)
			document.body.prepend(div.children[div.children.length - 1 - i]);
	});

if (getCurrentDirectory()[0] == "search") {
	const sources = [
		`${localHosting ? "/spreddit/" : ""}js/search.js`,
		`${localHosting ? "/spreddit/" : ""}js/index.js`,
	];

	for (let i = 0; i < sources.length; i++) {
		const script = document.createElement("script");
		script.src = sources[i];
		document.head.appendChild(script);
	}
}

function getCurrentDirectory() {
	return (localHosting ? window.location.pathname.substring(9) : window.location.pathname).replace(/\//g, " ").trim().split("/");
}